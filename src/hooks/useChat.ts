import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import {
  buildModelMessageContent,
  encodeStoredMessage,
  getAttachmentLabel,
  parseStoredMessage,
  type AttachmentType,
} from "@/lib/chatAttachments";

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  attachmentType?: AttachmentType;
  contextText?: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  messageCount: number;
}

type ChatMessageRow = Tables<"chat_messages">;

const trimText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
};

const buildConversationSummaries = (
  rows: Pick<ChatMessageRow, "conversation_id" | "role" | "content" | "created_at">[],
) => {
  const summaries = new Map<string, ConversationSummary>();

  rows.forEach((row) => {
    const parsed = parseStoredMessage(row.content);
    const text = parsed.content || (parsed.imageUrl ? getAttachmentLabel(parsed.attachmentType) : "Empty message");

    if (!summaries.has(row.conversation_id)) {
      summaries.set(row.conversation_id, {
        id: row.conversation_id,
        title: row.role === "user" ? trimText(text, 36) : "New conversation",
        preview: trimText(text, 72),
        updatedAt: row.created_at,
        messageCount: 1,
      });
      return;
    }

    const existing = summaries.get(row.conversation_id)!;
    existing.messageCount += 1;
    if (row.role === "user") {
      existing.title = trimText(text, 36);
    }
  });

  return Array.from(summaries.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
};

export function useChat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const activeIdRef = useRef<string | null>(null);

  // Keep ref in sync
  useEffect(() => {
    activeIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const loadConversation = useCallback(
    async (conversationId: string) => {
      if (!user) return;
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", user.id)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        toast({ title: "Error", description: "Failed to load conversation", variant: "destructive" });
        return;
      }

      setMessages(
        (data ?? []).map((message) => {
          const parsed = parseStoredMessage(message.content);
          return {
            id: message.id,
            role: message.role as "user" | "assistant",
            content: parsed.content,
            imageUrl: parsed.imageUrl,
            attachmentType: parsed.attachmentType,
            contextText: parsed.contextText,
          };
        }),
      );
    },
    [user],
  );

  const fetchConversations = useCallback(
    async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("chat_messages")
        .select("conversation_id, role, content, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        toast({ title: "Error", description: "Failed to load conversations", variant: "destructive" });
        return [];
      }

      const result = buildConversationSummaries(data ?? []);
      setConversations(result);
      return result;
    },
    [user],
  );

  // Initialize on user change
  useEffect(() => {
    if (!user) {
      setMessages([]);
      setConversations([]);
      setActiveConversationId(null);
      setIsInitializing(false);
      return;
    }

    let cancelled = false;

    const initialize = async () => {
      setIsInitializing(true);
      const convos = await fetchConversations();
      if (cancelled) return;

      if (convos.length > 0) {
        const latestId = convos[0].id;
        setActiveConversationId(latestId);
        await loadConversation(latestId);
      } else {
        setActiveConversationId(crypto.randomUUID());
        setMessages([]);
      }

      if (!cancelled) setIsInitializing(false);
    };

    initialize();
    return () => { cancelled = true; };
  }, [user, fetchConversations, loadConversation]);

  const selectConversation = useCallback(
    async (conversationId: string) => {
      if (conversationId === activeIdRef.current) return;
      setActiveConversationId(conversationId);
      setMessages([]);
      await loadConversation(conversationId);
    },
    [loadConversation],
  );

  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      if (!user) return null;

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

      await supabase
        .from("profiles")
        .update({ daily_uploads_remaining: (profile.daily_uploads_remaining ?? 1) - 1 })
        .eq("user_id", user.id);
      queryClient.invalidateQueries({ queryKey: ["profile"] });

      const { data: urlData } = supabase.storage.from("chat-uploads").getPublicUrl(path);
      return urlData.publicUrl;
    },
    [user, queryClient],
  );

  const sendMessage = useCallback(
    async (
      input: string,
      examMode = false,
      attachment?: { url: string; type: AttachmentType; extractedText?: string },
    ) => {
      const trimmedInput = input.trim();
      if (!user || (!trimmedInput && !attachment) || !activeIdRef.current) return;

      const conversationId = activeIdRef.current;
      const userMessage: ChatMessage = {
        role: "user",
        content: trimmedInput || getAttachmentLabel(attachment?.type),
        imageUrl: attachment?.url,
        attachmentType: attachment?.type,
        contextText: attachment?.extractedText?.trim() || undefined,
      };

      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setIsLoading(true);

      await supabase.from("chat_messages").insert({
        user_id: user.id,
        conversation_id: conversationId,
        role: "user",
        content: encodeStoredMessage({
          content: userMessage.content,
          attachmentUrl: attachment?.url,
          attachmentType: attachment?.type,
          contextText: attachment?.extractedText,
        }),
      });

      await fetchConversations();

      let assistantSoFar = "";
      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((currentMessages) => {
          const lastMessage = currentMessages[currentMessages.length - 1];
          if (lastMessage?.role === "assistant") {
            return currentMessages.map((message, index) =>
              index === currentMessages.length - 1 ? { ...message, content: assistantSoFar } : message,
            );
          }
          return [...currentMessages, { role: "assistant", content: assistantSoFar }];
        });
      };

      try {
        const allMessages = nextMessages.map((message) => ({
          role: message.role,
          content: buildModelMessageContent(message),
        }));

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: allMessages, examMode }),
        });

        if (response.status === 429) {
          toast({ title: "Rate Limited", description: "Too many requests. Please wait a moment.", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        if (response.status === 402) {
          toast({ title: "Credits Required", description: "Please add funds to continue using AI.", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        if (!response.ok || !response.body) throw new Error("Failed to start stream");

        const reader = response.body.getReader();
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
              textBuffer = `${line}\n${textBuffer}`;
              break;
            }
          }
        }

        if (assistantSoFar) {
          await supabase.from("chat_messages").insert({
            user_id: user.id,
            conversation_id: conversationId,
            role: "assistant",
            content: assistantSoFar,
          });
        }

        await fetchConversations();
      } catch (error) {
        console.error("Chat error:", error);
        toast({ title: "Error", description: "Failed to get AI response", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    },
    [user, messages, fetchConversations],
  );

  const clearChat = useCallback(() => {
    const newId = crypto.randomUUID();
    setActiveConversationId(newId);
    activeIdRef.current = newId;
    setMessages([]);
  }, []);

  return {
    messages,
    conversations,
    activeConversationId,
    isLoading,
    isInitializing,
    sendMessage,
    clearChat,
    selectConversation,
    uploadImage,
  };
}
