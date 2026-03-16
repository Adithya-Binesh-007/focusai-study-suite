import { useState, useRef, useEffect } from "react";
import { useChat, ChatMessage } from "@/hooks/useChat";
import { useProfile } from "@/hooks/useProfile";
import { useTaskProgress } from "@/hooks/useTaskProgress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Send, Trash2, Download, Brain, GraduationCap, Loader2, ImagePlus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import jsPDF from "jspdf";

export default function Assistant() {
  const { messages, isLoading, sendMessage, clearChat, uploadImage } = useChat();
  const { profile } = useProfile();
  const { incrementProgress } = useTaskProgress();
  const [input, setInput] = useState("");
  const [examMode, setExamMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ file: File; preview: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [examModeTracked, setExamModeTracked] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Track exam mode usage
  useEffect(() => {
    if (examMode && !examModeTracked) {
      incrementProgress("exam_mode_use");
      setExamModeTracked(true);
    }
  }, [examMode, examModeTracked, incrementProgress]);

  const handleSend = async () => {
    if ((!input.trim() && !pendingImage) || isLoading) return;

    let imageUrl: string | undefined;
    if (pendingImage) {
      setIsUploading(true);
      const url = await uploadImage(pendingImage.file);
      setIsUploading(false);
      if (!url) return;
      imageUrl = url;
      setPendingImage(null);
      // Track photo upload
      incrementProgress("photo_upload");
    }

    sendMessage(input, examMode, imageUrl);
    setInput("");

    // Track AI question asked
    incrementProgress("ai_questions");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const preview = URL.createObjectURL(file);
    setPendingImage({ file, preview });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClearChat = () => {
    clearChat();
    // Track new conversation
    incrementProgress("new_conversation");
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev + " " + transcript);
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
    // Track PDF download
    incrementProgress("pdf_download");
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Brain className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold">AI Study Assistant</h1>
            <p className="text-xs text-muted-foreground">
              {profile?.daily_uploads_remaining ?? 0} photo uploads remaining • Unlimited questions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Exam Mode</span>
            <Switch checked={examMode} onCheckedChange={setExamMode} />
          </div>
          <Button variant="ghost" size="icon" onClick={handleClearChat}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4">
              <Brain className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">How can I help you study?</h2>
            <p className="text-muted-foreground text-sm max-w-md">
              {examMode
                ? "Exam Mode is ON — I'll focus on quick revision, formulas, and practice questions."
                : "Ask me anything! I can generate notes, explain concepts, solve problems, and more. Upload photos of your notes too!"}
            </p>
            <div className="flex flex-wrap gap-2 mt-6 max-w-lg justify-center">
              {["Explain quantum physics", "Generate study notes for biology", "Create practice questions for math"].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-sm px-3 py-1.5 rounded-full border border-border hover:bg-accent transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "gradient-primary text-primary-foreground"
                  : "bg-muted"
              }`}>
                {msg.imageUrl && (
                  <img src={msg.imageUrl} alt="Uploaded" className="max-w-full max-h-60 rounded-lg mb-2" />
                )}
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {msg.content}
                    </ReactMarkdown>
                    <div className="mt-2 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => downloadPDF(msg.content)}
                      >
                        <Download className="h-3 w-3 mr-1" /> PDF
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Pending image preview */}
      {pendingImage && (
        <div className="px-4 pb-2">
          <div className="relative inline-block">
            <img src={pendingImage.preview} alt="Preview" className="h-20 rounded-lg border border-border" />
            <button
              onClick={() => setPendingImage(null)}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex items-end gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0"
            title="Upload photo"
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
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={examMode ? "Ask for revision notes, formulas, or practice questions..." : "Ask anything about your studies..."}
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={(!input.trim() && !pendingImage) || isLoading || isUploading}
            className="gradient-primary shrink-0"
            size="icon"
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
