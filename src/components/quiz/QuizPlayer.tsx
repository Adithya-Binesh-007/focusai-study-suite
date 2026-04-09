import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle2, XCircle, ArrowRight, RotateCcw, Trophy, Loader2 } from "lucide-react";
import { QuizConfig, difficultyLevels, getDifficultyContext } from "@/lib/quizData";
import { supabase } from "@/integrations/supabase/client";

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizPlayerProps {
  config: QuizConfig;
  onExit: () => void;
}

type Phase = "loading" | "playing" | "review";

export default function QuizPlayer({ config, onExit }: QuizPlayerProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const diffConfig = difficultyLevels.find((d) => d.value === config.difficulty)!;

  // Generate quiz questions
  useEffect(() => {
    let cancelled = false;

    const generate = async () => {
      setPhase("loading");
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke("quiz-generate", {
          body: config,
        });

        if (cancelled) return;
        if (fnError) throw fnError;
        if (!data?.questions?.length) throw new Error("No questions returned");

        setQuestions(data.questions);
        setAnswers(new Array(data.questions.length).fill(null));
        setTimeLeft(diffConfig.time * 60);
        setPhase("playing");
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to generate quiz");
      }
    };

    generate();
    return () => { cancelled = true; };
  }, [config]);

  // Timer
  useEffect(() => {
    if (phase !== "playing" || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          setPhase("review");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, timeLeft]);

  const handleSelect = (idx: number) => {
    if (selected !== null) return; // already answered
    setSelected(idx);
    const updated = [...answers];
    updated[current] = idx;
    setAnswers(updated);

    // Auto-advance after a short delay to show feedback
    setTimeout(() => {
      if (current < questions.length - 1) {
        setCurrent((c) => c + 1);
        setSelected(null);
      } else {
        setPhase("review");
      }
    }, 1200);
  };

  const goNext = () => {
    if (current < questions.length - 1) {
      setCurrent(current + 1);
      setSelected(null);
    } else {
      setPhase("review");
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const score = answers.reduce<number>((acc, ans, i) => (ans === questions[i]?.correctIndex ? acc + 1 : acc), 0);
  const percentage = questions.length ? Math.round((score / questions.length) * 100) : 0;

  // Loading
  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-full gap-4 p-8">
        {error ? (
          <>
            <XCircle className="h-12 w-12 text-destructive" />
            <p className="text-destructive text-center">{error}</p>
            <Button onClick={onExit}>Go Back</Button>
          </>
        ) : (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Generating your quiz…</p>
            <p className="text-xs text-muted-foreground">
              {config.subject} • {diffConfig.label} • {diffConfig.questions} questions
            </p>
          </>
        )}
      </div>
    );
  }

  // Review / Results
  if (phase === "review") {
    return (
      <div className="flex flex-col items-center p-4 md:p-8 min-h-full overflow-y-auto">
        <div className="w-full max-w-2xl space-y-6">
          <Card className="border-primary/30">
            <CardContent className="flex flex-col items-center gap-4 p-8">
              <Trophy className="h-16 w-16 text-primary" />
              <h2 className="text-2xl font-bold">Quiz Complete!</h2>
              <div className="text-4xl font-bold text-primary">{percentage}%</div>
              <p className="text-muted-foreground">
                {score} / {questions.length} correct
              </p>
              <Badge variant={percentage >= 70 ? "default" : percentage >= 40 ? "secondary" : "destructive"}>
                {percentage >= 70 ? "Excellent!" : percentage >= 40 ? "Good effort" : "Keep practicing"}
              </Badge>
              <div className="flex gap-3 mt-4">
                <Button variant="outline" onClick={onExit} className="gap-1">
                  <RotateCcw className="h-4 w-4" /> New Quiz
                </Button>
              </div>
            </CardContent>
          </Card>

          <h3 className="text-lg font-semibold">Review Answers</h3>
          {questions.map((q, i) => {
            const userAnswer = answers[i];
            const isCorrect = userAnswer === q.correctIndex;
            return (
              <Card key={i} className={`border ${isCorrect ? "border-green-500/30" : "border-red-500/30"}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    {isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                    )}
                    <p className="font-medium text-sm">Q{i + 1}. {q.question}</p>
                  </div>
                  <div className="grid gap-2 pl-7">
                    {q.options.map((opt, oi) => (
                      <div
                        key={oi}
                        className={`rounded-lg border px-3 py-2 text-sm ${
                          oi === q.correctIndex
                            ? "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400"
                            : oi === userAnswer && oi !== q.correctIndex
                            ? "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400"
                            : "border-border"
                        }`}
                      >
                        {String.fromCharCode(65 + oi)}) {opt}
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <p className="text-xs text-muted-foreground pl-7">
                      <span className="font-medium">Explanation:</span> {q.explanation}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Playing
  const q = questions[current];

  return (
    <div className="flex flex-col p-4 md:p-8 min-h-full">
      <div className="w-full max-w-2xl mx-auto space-y-6 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Question {current + 1} / {questions.length}
          </div>
          <Badge variant="outline" className="gap-1 text-sm">
            <Clock className="h-3 w-3" />
            {formatTime(timeLeft)}
          </Badge>
        </div>
        <Progress value={((current + 1) / questions.length) * 100} className="h-2" />

        {/* Question */}
        <Card>
          <CardContent className="p-6">
            <p className="font-semibold text-base leading-relaxed">{q.question}</p>
          </CardContent>
        </Card>

        {/* Options */}
        <div className="grid gap-3">
          {q.options.map((opt, oi) => {
            const isSelected = selected === oi;
            const isCorrect = selected !== null && oi === q.correctIndex;
            const isWrong = isSelected && oi !== q.correctIndex;

            return (
              <Card
                key={oi}
                className={`cursor-pointer transition-all ${
                  selected === null ? "hover:border-primary hover:shadow-md" : ""
                } ${isCorrect ? "border-green-500 bg-green-500/10" : ""} ${isWrong ? "border-red-500 bg-red-500/10" : ""} ${
                  isSelected && isCorrect ? "border-green-500 bg-green-500/10" : ""
                }`}
                onClick={() => handleSelect(oi)}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium">
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <span className="text-sm">{opt}</span>
                  {isCorrect && <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto" />}
                  {isWrong && <XCircle className="h-5 w-5 text-red-500 ml-auto" />}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Explanation after answer */}
        {selected !== null && q.explanation && (
          <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Explanation: </span>
            {q.explanation}
          </div>
        )}

        {/* Next button */}
        {selected !== null && (
          <Button onClick={goNext} className="w-full gap-2">
            {current < questions.length - 1 ? (
              <>Next <ArrowRight className="h-4 w-4" /></>
            ) : (
              <>View Results <Trophy className="h-4 w-4" /></>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
