import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  QuizConfig,
  EducationLevel,
  Difficulty,
  Stream,
  educationLevels,
  schoolClasses,
  higherSecondaryClasses,
  collegeYears,
  streams,
  btechBranches,
  difficultyLevels,
  getSubjects,
} from "@/lib/quizData";
import { GraduationCap, BookOpen, Building2, ArrowLeft, Clock, HelpCircle, Zap, Flame, Target } from "lucide-react";

interface QuizSetupProps {
  onStart: (config: QuizConfig) => void;
  codingMode?: boolean;
  onCodingStart?: (config: QuizConfig, language: "c" | "python") => void;
}

const levelIcons: Record<EducationLevel, typeof GraduationCap> = {
  school: BookOpen,
  higher_secondary: GraduationCap,
  college: Building2,
};

const difficultyIcons: Record<Difficulty, typeof Zap> = {
  easy: Zap,
  medium: Flame,
  hard: Target,
};

const difficultyColors: Record<Difficulty, string> = {
  easy: "bg-green-500/10 text-green-500 border-green-500/30",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  hard: "bg-red-500/10 text-red-500 border-red-500/30",
};

export default function QuizSetup({ onStart, codingMode, onCodingStart }: QuizSetupProps) {
  const [step, setStep] = useState(codingMode ? 1 : 0);
  const [educationLevel, setEducationLevel] = useState<EducationLevel | null>(codingMode ? "college" : null);
  const [classOrYear, setClassOrYear] = useState<string | null>(null);
  const [stream, setStream] = useState<Stream | null>(null);
  const [branch, setBranch] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [codingLanguage, setCodingLanguage] = useState<"c" | "python" | null>(null);

  const goBack = () => {
    if (step === 0 || (codingMode && step === 1)) return;
    if (step === 1) { setClassOrYear(null); }
    else if (step === 2) { setStream(null); setBranch(null); }
    else if (step === 3) { setSubject(null); }
    else if (step === 4) { setDifficulty(null); }
    else if (step === 5) { setCodingLanguage(null); }
    setStep(step - 1);
  };

  const handleLevelSelect = (level: EducationLevel) => {
    setEducationLevel(level);
    setClassOrYear(null);
    setStream(null);
    setBranch(null);
    setSubject(null);
    setDifficulty(null);
    setStep(1);
  };

  const handleClassSelect = (cls: string) => {
    setClassOrYear(cls);
    // School doesn't need stream/branch; higher_secondary needs stream; college needs branch
    if (educationLevel === "school") setStep(3); // skip to subject
    else setStep(2); // stream or branch
  };

  const handleStreamOrBranch = (value: string) => {
    if (educationLevel === "higher_secondary") {
      setStream(value as Stream);
    } else {
      setBranch(value);
    }
    setStep(3);
  };

  const handleSubject = (sub: string) => {
    setSubject(sub);
    setStep(4);
  };

  const handleDifficulty = (diff: Difficulty) => {
    setDifficulty(diff);
    const config: QuizConfig = {
      educationLevel: educationLevel!,
      classOrYear: classOrYear!,
      stream: stream || undefined,
      branch: branch || undefined,
      subject: subject!,
      difficulty: diff,
    };
    if (codingMode) {
      setStep(5); // language selection step
    } else {
      onStart(config);
    }
  };

  const handleLanguageSelect = (lang: "c" | "python") => {
    setCodingLanguage(lang);
    const config: QuizConfig = {
      educationLevel: educationLevel!,
      classOrYear: classOrYear!,
      branch: branch || undefined,
      subject: subject!,
      difficulty: difficulty!,
    };
    onCodingStart?.(config, lang);
  };

  const subjects = getSubjects({ educationLevel: educationLevel || undefined, classOrYear: classOrYear || undefined, stream: stream || undefined, branch: branch || undefined });

  return (
    <div className="flex flex-col items-center justify-center p-4 md:p-8 min-h-full">
      <div className="w-full max-w-2xl space-y-6">
        {step > 0 && (
          <Button variant="ghost" size="sm" onClick={goBack} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        )}

        {/* Step 0: Education Level */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">Start a Quiz</h1>
              <p className="text-muted-foreground">Choose your education level</p>
            </div>
            <div className="grid gap-4">
              {educationLevels.map((level) => {
                const Icon = levelIcons[level.value];
                return (
                  <Card
                    key={level.value}
                    className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                    onClick={() => handleLevelSelect(level.value)}
                  >
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{level.label}</p>
                        <p className="text-sm text-muted-foreground">{level.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 1: Class / Year */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold">
                {educationLevel === "college" ? "Select Year" : "Select Class"}
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(educationLevel === "school"
                ? schoolClasses
                : educationLevel === "higher_secondary"
                ? higherSecondaryClasses
                : collegeYears
              ).map((item) => (
                <Card
                  key={item.value}
                  className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                  onClick={() => handleClassSelect(item.value)}
                >
                  <CardContent className="flex items-center justify-center p-4">
                    <span className="font-medium">{item.label}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Stream / Branch */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold">
                {educationLevel === "higher_secondary" ? "Choose Stream" : "Choose Branch"}
              </h2>
            </div>
            <div className="grid gap-3">
              {(educationLevel === "higher_secondary" ? streams : btechBranches).map((item) => (
                <Card
                  key={item.value}
                  className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                  onClick={() => handleStreamOrBranch(item.value)}
                >
                  <CardContent className="flex items-center justify-center p-4">
                    <span className="font-medium">{item.label}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Subject */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold">Pick a Subject</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {subjects.map((sub) => (
                <Card
                  key={sub}
                  className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                  onClick={() => handleSubject(sub)}
                >
                  <CardContent className="flex items-center justify-center p-4 text-center">
                    <span className="font-medium text-sm">{sub}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Difficulty */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold">Select Difficulty</h2>
            </div>
            <div className="grid gap-4">
              {difficultyLevels.map((diff) => {
                const Icon = difficultyIcons[diff.value];
                return (
                  <Card
                    key={diff.value}
                    className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                    onClick={() => handleDifficulty(diff.value)}
                  >
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${difficultyColors[diff.value]}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{diff.label}</p>
                        <p className="text-sm text-muted-foreground">{diff.description}</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground space-y-1">
                        <div className="flex items-center gap-1 justify-end">
                          <HelpCircle className="h-3 w-3" />
                          <span>{diff.questions} Qs</span>
                        </div>
                        <div className="flex items-center gap-1 justify-end">
                          <Clock className="h-3 w-3" />
                          <span>{diff.time} min</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 5: Language selection (coding mode only) */}
        {step === 5 && codingMode && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold">Choose Language</h2>
            </div>
            <div className="grid gap-4">
              <Card
                className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                onClick={() => handleLanguageSelect("c")}
              >
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-mono font-bold text-primary">
                    C
                  </div>
                  <div>
                    <p className="font-semibold">C Programming</p>
                    <p className="text-sm text-muted-foreground">scanf/printf based I/O</p>
                  </div>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                onClick={() => handleLanguageSelect("python")}
              >
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-mono font-bold text-primary">
                    Py
                  </div>
                  <div>
                    <p className="font-semibold">Python</p>
                    <p className="text-sm text-muted-foreground">input()/print() based I/O</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
