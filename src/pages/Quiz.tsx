import { useState } from "react";
import { QuizConfig } from "@/lib/quizData";
import QuizSetup from "@/components/quiz/QuizSetup";
import QuizPlayer from "@/components/quiz/QuizPlayer";

export default function Quiz() {
  const [config, setConfig] = useState<QuizConfig | null>(null);

  if (config) {
    return <QuizPlayer config={config} onExit={() => setConfig(null)} />;
  }

  return <QuizSetup onStart={setConfig} />;
}
