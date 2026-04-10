import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Clock, CheckCircle2, XCircle, ArrowRight, ArrowLeft, RotateCcw,
  Trophy, Loader2, Play, Code2, Lightbulb, Eye, EyeOff
} from "lucide-react";
import { QuizConfig } from "@/lib/quizData";
import { supabase } from "@/integrations/supabase/client";

interface TestCase {
  input: string;
  expectedOutput: string;
}

interface CodingProblem {
  title: string;
  description: string;
  testCases: TestCase[];
  sampleSolution: string;
  hint: string;
}

interface TestResult {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  error: boolean;
}

interface CodingQuizPlayerProps {
  config: QuizConfig;
  language: "c" | "python";
  onExit: () => void;
}

type Phase = "loading" | "playing" | "review";

const defaultCode: Record<string, string> = {
  c: `#include <stdio.h>

int main() {
    // Write your code here
    
    return 0;
}`,
  python: `# Write your code here
`,
};

export default function CodingQuizPlayer({ config, language, onExit }: CodingQuizPlayerProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [current, setCurrent] = useState(0);
  const [codes, setCodes] = useState<string[]>([]);
  const [results, setResults] = useState<(TestResult[] | null)[]>([]);
  const [solvedStatus, setSolvedStatus] = useState<boolean[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  // Generate coding problems
  useEffect(() => {
    let cancelled = false;
    const generate = async () => {
      setPhase("loading");
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("quiz-generate-coding", {
          body: { ...config, language },
        });
        if (cancelled) return;
        if (fnError) throw fnError;
        if (!data?.problems?.length) throw new Error("No problems returned");

        setProblems(data.problems);
        setCodes(data.problems.map(() => defaultCode[language]));
        setResults(new Array(data.problems.length).fill(null));
        setSolvedStatus(new Array(data.problems.length).fill(false));
        setTimeLeft((data.time || 20) * 60);
        setPhase("playing");
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to generate problems");
      }
    };
    generate();
    return () => { cancelled = true; };
  }, [config, language]);

  // Timer
  useEffect(() => {
    if (phase !== "playing" || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timer); setPhase("review"); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, timeLeft]);

  const handleCodeChange = (value: string) => {
    const updated = [...codes];
    updated[current] = value;
    setCodes(updated);
  };

  const handleRun = async () => {
    setRunning(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("code-execute", {
        body: {
          language,
          code: codes[current],
          testCases: problems[current].testCases,
        },
      });
      if (fnError) throw fnError;

      const updatedResults = [...results];
      updatedResults[current] = data.results;
      setResults(updatedResults);

      if (data.allPassed) {
        const updatedSolved = [...solvedStatus];
        updatedSolved[current] = true;
        setSolvedStatus(updatedSolved);
      }
    } catch (e: any) {
      console.error("Run error:", e);
    } finally {
      setRunning(false);
    }
  };

  const goTo = (idx: number) => {
    setCurrent(idx);
    setShowHint(false);
    setShowSolution(false);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const totalSolved = solvedStatus.filter(Boolean).length;

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
            <p className="text-muted-foreground">Generating coding problems…</p>
            <p className="text-xs text-muted-foreground">
              {config.subject} • {language.toUpperCase()} • {config.difficulty}
            </p>
          </>
        )}
      </div>
    );
  }

  if (phase === "review") {
    const percentage = problems.length ? Math.round((totalSolved / problems.length) * 100) : 0;
    return (
      <div className="flex flex-col items-center p-4 md:p-8 min-h-full overflow-y-auto">
        <div className="w-full max-w-3xl space-y-6">
          <Card className="border-primary/30">
            <CardContent className="flex flex-col items-center gap-4 p-8">
              <Trophy className="h-16 w-16 text-primary" />
              <h2 className="text-2xl font-bold">Coding Quiz Complete!</h2>
              <div className="text-4xl font-bold text-primary">{percentage}%</div>
              <p className="text-muted-foreground">
                {totalSolved} / {problems.length} problems solved
              </p>
              <Badge variant={percentage >= 70 ? "default" : percentage >= 40 ? "secondary" : "destructive"}>
                {percentage >= 70 ? "Excellent!" : percentage >= 40 ? "Good effort" : "Keep practicing"}
              </Badge>
              <Button variant="outline" onClick={onExit} className="gap-1 mt-4">
                <RotateCcw className="h-4 w-4" /> New Quiz
              </Button>
            </CardContent>
          </Card>

          <h3 className="text-lg font-semibold">Solutions</h3>
          {problems.map((p, i) => (
            <Card key={i} className={`border ${solvedStatus[i] ? "border-green-500/30" : "border-red-500/30"}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  {solvedStatus[i] ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <p className="font-semibold text-sm">Q{i + 1}. {p.title}</p>
                </div>
                <div className="bg-muted rounded-lg p-3 overflow-x-auto">
                  <pre className="text-xs font-mono whitespace-pre-wrap">{p.sampleSolution}</pre>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const problem = problems[current];
  const currentResults = results[current];

  return (
    <div className="flex flex-col p-4 md:p-6 min-h-full gap-4">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Code2 className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">
            Problem {current + 1} / {problems.length}
          </span>
          <Badge variant="outline" className="text-xs">
            {language.toUpperCase()}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs">
            Solved: {totalSolved}/{problems.length}
          </Badge>
          <Badge variant="outline" className="gap-1 text-sm">
            <Clock className="h-3 w-3" />
            {formatTime(timeLeft)}
          </Badge>
        </div>
      </div>

      {/* Problem navigation */}
      <div className="flex gap-2 flex-wrap">
        {problems.map((_, i) => (
          <Button
            key={i}
            size="sm"
            variant={i === current ? "default" : solvedStatus[i] ? "secondary" : "outline"}
            className={`h-8 w-8 p-0 text-xs ${solvedStatus[i] && i !== current ? "border-green-500/50 text-green-600" : ""}`}
            onClick={() => goTo(i)}
          >
            {i + 1}
          </Button>
        ))}
      </div>

      <Progress value={((totalSolved) / problems.length) * 100} className="h-2" />

      <div className="grid lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Left: Problem statement */}
        <div className="space-y-3 overflow-y-auto">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{problem.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm whitespace-pre-wrap leading-relaxed">
              {problem.description}
            </CardContent>
          </Card>

          {/* Sample test case display */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Sample Test Case</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Input:</p>
                <pre className="text-xs bg-muted rounded p-2 font-mono">{problem.testCases[0]?.input}</pre>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Expected Output:</p>
                <pre className="text-xs bg-muted rounded p-2 font-mono">{problem.testCases[0]?.expectedOutput}</pre>
              </div>
            </CardContent>
          </Card>

          {/* Hint */}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setShowHint(!showHint)}>
              <Lightbulb className="h-3 w-3" />
              {showHint ? "Hide Hint" : "Show Hint"}
            </Button>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setShowSolution(!showSolution)}>
              {showSolution ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {showSolution ? "Hide Solution" : "Show Solution"}
            </Button>
          </div>

          {showHint && (
            <div className="rounded-lg border bg-yellow-500/10 border-yellow-500/30 p-3 text-sm">
              💡 {problem.hint}
            </div>
          )}

          {showSolution && (
            <div className="rounded-lg border bg-muted p-3 overflow-x-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap">{problem.sampleSolution}</pre>
            </div>
          )}
        </div>

        {/* Right: Code editor + results */}
        <div className="flex flex-col gap-3 min-h-0">
          <Textarea
            value={codes[current]}
            onChange={(e) => handleCodeChange(e.target.value)}
            className="flex-1 font-mono text-sm min-h-[200px] resize-none"
            placeholder={`Write your ${language.toUpperCase()} code here...`}
            spellCheck={false}
          />

          <Button onClick={handleRun} disabled={running} className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? "Running…" : "Run & Test"}
          </Button>

          {/* Test results */}
          {currentResults && (
            <div className="space-y-2 overflow-y-auto">
              {currentResults.map((r, i) => (
                <Card key={i} className={`border ${r.passed ? "border-green-500/30" : "border-red-500/30"}`}>
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      {r.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-xs font-medium">Test Case {i + 1}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Input</p>
                        <pre className="bg-muted rounded p-1 font-mono">{r.input || "(none)"}</pre>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Expected</p>
                        <pre className="bg-muted rounded p-1 font-mono">{r.expectedOutput}</pre>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Your Output</p>
                        <pre className={`rounded p-1 font-mono ${r.error ? "bg-red-500/10" : "bg-muted"}`}>
                          {r.actualOutput || "(none)"}
                        </pre>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {currentResults.every((r) => r.passed) && (
                <div className="text-center text-sm text-green-500 font-medium py-2">
                  ✅ All test cases passed!
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" size="sm" onClick={() => goTo(Math.max(0, current - 1))} disabled={current === 0}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        {current < problems.length - 1 ? (
          <Button size="sm" onClick={() => goTo(current + 1)}>
            Next <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button size="sm" onClick={() => setPhase("review")} className="gap-1">
            Finish <Trophy className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
