import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  QuizConfig,
  EducationLevel,
  Difficulty,
  Stream,
  ScienceTrack,
  educationLevels,
  schoolClasses,
  higherSecondaryClasses,
  collegeYears,
  streams,
  scienceTracks,
  btechBranches,
  difficultyLevels,
  getDifficultyPresentation,
  getSubjects,
} from "@/lib/quizData";
import { GraduationCap, BookOpen, Building2, ArrowLeft, Clock, HelpCircle, Zap, Flame, Target, Stethoscope, Cog } from "lucide-react";

interface QuizSetupProps {
  onStart: (config: QuizConfig) => void;
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

export default function QuizSetup({ onStart }: QuizSetupProps) {
  const [step, setStep] = useState(0);
  const [educationLevel, setEducationLevel] = useState<EducationLevel | null>(null);
  const [classOrYear, setClassOrYear] = useState<string | null>(null);
  const [stream, setStream] = useState<Stream | null>(null);
  const [scienceTrack, setScienceTrack] = useState<ScienceTrack | null>(null);
  const [branch, setBranch] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);

  // Steps: 0 level, 1 class/year, 2 stream/branch, 25 science track, 3 subject, 4 difficulty
  const goBack = () => {
    if (step === 0) return;
    if (step === 1) { setClassOrYear(null); setStep(0); return; }
    if (step === 2) { setStream(null); setBranch(null); setStep(1); return; }
    if (step === 25) { setScienceTrack(null); setStep(2); return; }
    if (step === 3) {
      setSubject(null);
      if (educationLevel === "higher_secondary" && stream === "science") setStep(25);
      else if (educationLevel === "school") setStep(1);
      else setStep(2);
      return;
    }
    if (step === 4) { setDifficulty(null); setStep(3); return; }
  };

  const handleLevelSelect = (level: EducationLevel) => {
    setEducationLevel(level);
    setClassOrYear(null);
    setStream(null);
    setScienceTrack(null);
    setBranch(null);
    setSubject(null);
    setDifficulty(null);
    setStep(1);
  };

  const handleClassSelect = (cls: string) => {
    setClassOrYear(cls);
    if (educationLevel === "school") setStep(3);
    else setStep(2);
  };

  const handleStreamOrBranch = (value: string) => {
    if (educationLevel === "higher_secondary") {
      const s = value as Stream;
      setStream(s);
      if (s === "science") {
        setStep(25);
        return;
      }
    } else {
      setBranch(value);
    }
    setStep(3);
  };

  const handleScienceTrack = (track: ScienceTrack) => {
    setScienceTrack(track);
    setSubject(null);
    setStep(3);
  };

  const handleSubject = (sub: string) => {
    setSubject(sub);
    setStep(4);
  };

  const handleDifficulty = (diff: Difficulty) => {
    setDifficulty(diff);
    onStart({
      educationLevel: educationLevel!,
      classOrYear: classOrYear!,
      stream: stream || undefined,
      scienceTrack: scienceTrack || undefined,
      branch: branch || undefined,
      subject: subject!,
      difficulty: diff,
    });
  };

  const subjects = getSubjects({
    educationLevel: educationLevel || undefined,
    classOrYear: classOrYear || undefined,
    stream: stream || undefined,
    scienceTrack: scienceTrack || undefined,
    branch: branch || undefined,
  });
  const showCompetitivePrepHint =
    educationLevel === "higher_secondary" &&
    stream === "science" &&
    !!scienceTrack &&
    ["Physics", "Chemistry", "Mathematics", "Biology"].includes(subject || "");

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

        {/* Step 25: Science Track (Medical vs Engineering) */}
        {step === 25 && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold">Choose Your Goal</h2>
              <p className="text-sm text-muted-foreground">
                Pick the track you're preparing for — subjects and difficulty levels are tailored accordingly.
              </p>
            </div>
            <div className="grid gap-4">
              {scienceTracks.map((track) => {
                const Icon = track.value === "medical" ? Stethoscope : Cog;
                return (
                  <Card
                    key={track.value}
                    className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                    onClick={() => handleScienceTrack(track.value)}
                  >
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{track.label}</p>
                        <p className="text-sm text-muted-foreground">{track.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
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
              {showCompetitivePrepHint && (
                <p className="text-sm text-muted-foreground">
                  {scienceTrack === "medical"
                    ? "Levels are tuned for NEET-UG preparation (Physics, Chemistry, Biology)."
                    : "Levels are tuned for JEE Mains, KEAM, and JEE Advanced preparation."}
                </p>
              )}
            </div>
            <div className="grid gap-4">
              {difficultyLevels.map((diff) => {
                const Icon = difficultyIcons[diff.value];
                const difficultyMeta = getDifficultyPresentation(
                  {
                    educationLevel: educationLevel || undefined,
                    classOrYear: classOrYear || undefined,
                    stream: stream || undefined,
                    branch: branch || undefined,
                    subject: subject || undefined,
                  },
                  diff.value,
                );
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
                        <p className="font-semibold">{difficultyMeta.label}</p>
                        <p className="text-sm text-muted-foreground">{difficultyMeta.description}</p>
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
      </div>
    </div>
  );
}
