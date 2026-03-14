import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
}

export function useChat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId] = useState(() => crypto.randomUUID());

  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      if (!user) return null;

      // Check daily uploads for photo uploads only
      const { data: profile } = await supabase
        .from("profiles")
        .select("daily_uploads_remaining")
        .eq("user_id", user.id)
        .single();

      if (!profile || profile.daily_uploads_remaining <= 0) {
        toast({
          title: "Daily Upload Limit Reached",
          description: "Use credits to upgrade your daily photo uploads",
          variant: "destructive",
        });
        return null;
      }

      const ext = file.name.split(".").pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("chat-uploads").upload(path, file);
      if (error) {
        toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
        return null;
      }

      // Decrement daily uploads (only for photo uploads)
      await supabase
        .from("profiles")
        .update({ daily_uploads_remaining: (profile.daily_uploads_remaining ?? 1) - 1 })
        .eq("user_id", user.id);
      queryClient.invalidateQueries({ queryKey: ["profile"] });

      const { data: urlData } = supabase.storage.from("chat-uploads").getPublicUrl(path);
      return urlData.publicUrl;
    },
    [user, queryClient]
  );

  const sendMessage = useCallback(
    async (input: string, examMode = false, imageUrl?: string) => {
      if (!user || (!input.trim() && !imageUrl)) return;

      // Questions are unlimited — no daily limit check for text-only messages

      const userMsg: ChatMessage = { role: "user", content: input, imageUrl };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      // Save user message
      await supabase.from("chat_messages").insert({
        user_id: user.id,
        conversation_id: conversationId,
        role: "user",
        content: imageUrl ? `[Image: ${imageUrl}]\n${input}` : input,
      });

      let assistantSoFar = "";
      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      try {
        const allMessages = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.imageUrl ? `[Image: ${m.imageUrl}]\n${m.content}` : m.content,
        }));

        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ messages: allMessages, examMode }),
          }
        );

        if (resp.status === 429) {
          toast({ title: "Rate Limited", description: "Too many requests. Please wait a moment.", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        if (resp.status === 402) {
          toast({ title: "Credits Required", description: "Please add funds to continue using AI.", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        if (!resp.ok || !resp.body) throw new Error("Failed to start stream");

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let streamDone = false;

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") { streamDone = true; break; }

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) upsertAssistant(content);
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        // Save assistant message
        if (assistantSoFar) {
          await supabase.from("chat_messages").insert({
            user_id: user.id,
            conversation_id: conversationId,
            role: "assistant",
            content: assistantSoFar,
          });
        }
      } catch (e) {
        console.error("Chat error:", e);
        toast({ title: "Error", description: "Failed to get AI response", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    },
    [user, messages, conversationId, queryClient]
  );

  const clearChat = () => setMessages([]);

  return { messages, isLoading, sendMessage, clearChat, uploadImage };
}
