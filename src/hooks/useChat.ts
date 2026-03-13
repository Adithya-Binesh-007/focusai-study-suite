import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

export function useChat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId] = useState(() => crypto.randomUUID());

  const sendMessage = useCallback(
    async (input: string, examMode = false) => {
      if (!user || !input.trim()) return;

      // Check daily uploads
      const { data: profile } = await supabase
        .from("profiles")
        .select("daily_uploads_remaining")
        .eq("user_id", user.id)
        .single();

      if (!profile || profile.daily_uploads_remaining <= 0) {
        toast({
          title: "Daily Limit Reached",
          description: "Use credits to upgrade your daily AI uploads",
          variant: "destructive",
        });
        return;
      }

      const userMsg: ChatMessage = { role: "user", content: input };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      // Save user message
      await supabase.from("chat_messages").insert({
        user_id: user.id,
        conversation_id: conversationId,
        role: "user",
        content: input,
      });

      // Decrement daily uploads
      await supabase
        .from("profiles")
        .update({ daily_uploads_remaining: (profile.daily_uploads_remaining ?? 1) - 1 })
        .eq("user_id", user.id);
      queryClient.invalidateQueries({ queryKey: ["profile"] });

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
          content: m.content,
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

  return { messages, isLoading, sendMessage, clearChat };
}
