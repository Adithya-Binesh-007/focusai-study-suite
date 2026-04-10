import { useState } from "react";
import { QuizConfig } from "@/lib/quizData";
import QuizSetup from "@/components/quiz/QuizSetup";
import QuizPlayer from "@/components/quiz/QuizPlayer";
import CodingQuizPlayer from "@/components/quiz/CodingQuizPlayer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Code2, FileQuestion } from "lucide-react";

type QuizMode = "select" | "mcq" | "coding-setup" | "coding";

export default function Quiz() {
  const [mode, setMode] = useState<QuizMode>("select");
  const [config, setConfig] = useState<QuizConfig | null>(null);
  const [codingLanguage, setCodingLanguage] = useState<"c" | "python">("c");

  const handleMcqStart = (cfg: QuizConfig) => {
    setConfig(cfg);
    setMode("mcq");
  };

  const handleCodingSetupDone = (cfg: QuizConfig, lang: "c" | "python") => {
    setConfig(cfg);
    setCodingLanguage(lang);
    setMode("coding");
  };

  const reset = () => {
    setMode("select");
    setConfig(null);
  };

  if (mode === "mcq" && config) {
    return <QuizPlayer config={config} onExit={reset} />;
  }

  if (mode === "coding" && config) {
    return <CodingQuizPlayer config={config} language={codingLanguage} onExit={reset} />;
  }

  if (mode === "coding-setup") {
    return <QuizSetup onStart={handleMcqStart} codingMode onCodingStart={handleCodingSetupDone} />;
  }

  // Mode selection
  return (
    <div className="flex flex-col items-center justify-center p-4 md:p-8 min-h-full">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Quiz Mode</h1>
          <p className="text-muted-foreground">Choose your quiz type</p>
        </div>
        <div className="grid gap-4">
          <Card
            className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
            onClick={() => setMode("mcq")}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <FileQuestion className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">MCQ Quiz</p>
                <p className="text-sm text-muted-foreground">
                  Multiple choice questions — all levels supported
                </p>
              </div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
            onClick={() => setMode("coding-setup")}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Code2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Coding Quiz</p>
                <p className="text-sm text-muted-foreground">
                  Write & run code against test cases — B.Tech level (C / Python)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
