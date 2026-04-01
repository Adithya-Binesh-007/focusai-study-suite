import { useState, useRef, useEffect } from "react";
import { useChat } from "@/hooks/useChat";
import { useProfile } from "@/hooks/useProfile";
import { useTaskProgress } from "@/hooks/useTaskProgress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Send,
  Download,
  Brain,
  GraduationCap,
  Loader2,
  ImagePlus,
  MessageSquarePlus,
  MessagesSquare,
  ChevronsLeft,
  ChevronsRight,
  Minimize2,
  Maximize2,
  FileText,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import Tesseract from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";
import jsPDF from "jspdf";

const formatConversationTime = (value: string) => {
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date)
    : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
};

export default function Assistant() {
  const {
    messages,
    conversations,
    activeConversationId,
    isLoading,
    isInitializing,
    sendMessage,
    clearChat,
    selectConversation,
    uploadImage,
  } = useChat();
  const { profile } = useProfile();
  const { incrementProgress } = useTaskProgress();
  const [input, setInput] = useState("");
  const [examMode, setExamMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ file: File; preview: string; type: "image" | "pdf" } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [examModeTracked, setExamModeTracked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatMinimized, setChatMinimized] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    requestAnimationFrame(() => {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    });
  }, [messages, activeConversationId]);

  useEffect(() => {
    if (examMode && !examModeTracked) {
      incrementProgress("exam_mode_use");
      setExamModeTracked(true);
    }
  }, [examMode, examModeTracked, incrementProgress]);

  const handleSend = async () => {
    if ((!input.trim() && !pendingFile) || isLoading || isInitializing) return;

    const currentInput = input;
    const currentFile = pendingFile;
    
    // Clear input immediately (like ChatGPT)
    setInput("");
    setPendingFile(null);

    let imageUrl: string | undefined;
    let ocrText = "";

    if (currentFile) {
      setIsUploading(true);
      const url = await uploadImage(currentFile.file);
      setIsUploading(false);
      if (!url) return;
      imageUrl = url;

      if (currentFile.type === "image") {
        try {
          const result = await Tesseract.recognize(currentFile.file, "eng");
          ocrText = result.data.text;
        } catch (error) {
          console.error("OCR error:", error);
        }
      } else if (currentFile.type === "pdf") {
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
          const arrayBuffer = await currentFile.file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
          let pdfText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(" ");
            pdfText += pageText + "\n";
          }
          ocrText = pdfText;
        } catch (error) {
          console.error("PDF extraction error:", error);
        }
      }

      incrementProgress("photo_upload");
    }

    const messageContent = ocrText
      ? `${currentInput}\n\n[Extracted Text from Document]\n${ocrText}`
      : currentInput;
    await sendMessage(messageContent, examMode, imageUrl);
    incrementProgress("ai_questions");
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) return;

    const preview = URL.createObjectURL(file);
    setPendingFile({ file, preview, type: isImage ? "image" : "pdf" });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleNewConversation = () => {
    clearChat();
    incrementProgress("new_conversation");
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognitionApi = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionApi) return;

    const recognition = new SpeechRecognitionApi();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((previous) => `${previous} ${transcript}`.trim());
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  };

  const downloadPDF = (content: string) => {
    const doc = new jsPDF();
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(content, 180);
    doc.text(lines, 15, 20);
    doc.save("focusai-notes.pdf");
    incrementProgress("pdf_download");
  };

  if (chatMinimized) {
    return (
      <div className="flex h-full items-end justify-end p-6">
        <Button
          onClick={() => setChatMinimized(false)}
          className="gradient-primary rounded-full shadow-lg"
          size="lg"
        >
          <Maximize2 className="mr-2 h-4 w-4" />
          Open Chat
        </Button>
      </div>
    );
  }

  return (
    <div
      className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[18rem_minmax(0,1fr)]"
      style={!sidebarOpen ? { gridTemplateColumns: "1fr" } : {}}
    >
      {/* Sidebar */}
      <aside className={`min-h-0 border-r border-border bg-card/40 md:flex md:flex-col ${sidebarOpen ? "" : "hidden"}`}>
        <div className="border-b border-border p-4">
          <Button variant="outline" className="w-full justify-start" onClick={handleNewConversation}>
            <MessageSquarePlus className="h-4 w-4" />
            New chat
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {conversations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Start a chat and your conversation history will appear here.
              </div>
            ) : (
              conversations.map((conversation) => {
                const isActive = conversation.id === activeConversationId;
                return (
                  <button
                    key={conversation.id}
                    onClick={() => selectConversation(conversation.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                      isActive
                        ? "border-primary/30 bg-accent text-accent-foreground"
                        : "border-transparent hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-1 text-sm font-medium">{conversation.title}</p>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatConversationTime(conversation.updatedAt)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{conversation.preview}</p>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 border-b border-border p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
                <Brain className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-semibold">AI Study Assistant</h1>
                <p className="text-xs text-muted-foreground">
                  {profile?.daily_uploads_remaining ?? 0} photo uploads remaining • Unlimited questions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <Button variant="outline" size="sm" className="md:hidden" onClick={handleNewConversation}>
                <MessageSquarePlus className="h-4 w-4" />
                New
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="hidden md:flex"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              >
                {sidebarOpen ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setChatMinimized(true)}
                title="Minimize chat"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <span className="hidden text-sm text-muted-foreground sm:inline">Exam Mode</span>
                <Switch checked={examMode} onCheckedChange={setExamMode} />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile conversation chips */}
        <div className="shrink-0 border-b border-border p-2 md:hidden">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {conversations.length === 0 ? (
              <div className="flex min-h-14 items-center rounded-xl border border-dashed border-border px-3 text-xs text-muted-foreground">
                No saved chats yet
              </div>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => selectConversation(conversation.id)}
                  className={`min-w-56 rounded-xl border px-3 py-2 text-left ${
                    conversation.id === activeConversationId
                      ? "border-primary/30 bg-accent text-accent-foreground"
                      : "border-border bg-card"
                  }`}
                >
                  <p className="line-clamp-1 text-sm font-medium">{conversation.title}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{conversation.preview}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Messages */}
        <div ref={messagesContainerRef} className="min-h-0 flex-1 overflow-y-auto p-4">
          {isInitializing ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading your conversation…
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary">
                <MessagesSquare className="h-8 w-8 text-primary-foreground" />
              </div>
              <h2 className="mb-2 text-xl font-semibold">How can I help you study?</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                {examMode
                  ? "Exam Mode is ON — I'll focus on quick revision, formulas, and practice questions."
                  : "Ask me anything! I can generate notes, explain concepts, solve problems, and more. Upload photos or PDFs of your notes too!"}
              </p>
              <div className="mt-6 flex max-w-lg flex-wrap justify-center gap-2">
                {["Explain quantum physics", "Generate study notes for biology", "Create practice questions for math"].map((question) => (
                  <button
                    key={question}
                    onClick={() => setInput(question)}
                    className="rounded-full border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id ?? `${message.role}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        message.role === "user" ? "gradient-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      {message.imageUrl && (
                        <img src={message.imageUrl} alt="Uploaded study material" className="mb-2 max-h-60 max-w-full rounded-lg" />
                      )}
                      {message.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {message.content}
                          </ReactMarkdown>
                          <div className="mt-2 flex justify-end">
                            <Button variant="ghost" size="sm" className="text-xs" onClick={() => downloadPDF(message.content)}>
                              <Download className="mr-1 h-3 w-3" /> PDF
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm">{message.content}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-muted px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pending file preview */}
        {pendingFile && (
          <div className="shrink-0 px-4 pb-2">
            <div className="relative inline-block">
              {pendingFile.type === "image" ? (
                <img src={pendingFile.preview} alt="Selected upload preview" className="h-20 rounded-lg border border-border" />
              ) : (
                <div className="flex h-20 items-center gap-2 rounded-lg border border-border bg-muted px-4">
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="max-w-[120px]">
                    <p className="truncate text-xs font-medium">{pendingFile.file.name}</p>
                    <p className="text-[10px] text-muted-foreground">PDF Document</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => setPendingFile(null)}
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="shrink-0 border-t border-border p-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0"
              title="Upload photo or PDF"
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Button
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
              onClick={toggleRecording}
              className="shrink-0"
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={examMode ? "Ask for revision notes, formulas, or practice questions..." : "Ask anything about your studies..."}
              className="min-h-[44px] max-h-32 resize-none"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={(!input.trim() && !pendingFile) || isLoading || isUploading || isInitializing}
              className="gradient-primary shrink-0"
              size="icon"
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
