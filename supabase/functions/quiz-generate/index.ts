import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const difficultyMap: Record<string, { questions: number }> = {
  easy: { questions: 10 },
  medium: { questions: 25 },
  hard: { questions: 40 },
};

const programmingSubjects = new Set([
  "Computer Science (Python)",
  "Computer Science (C++)",
  "Programming in C",
  "Python Programming",
]);

const competitiveScienceSubjects = new Set(["Physics", "Chemistry", "Mathematics", "Biology"]);

const getDifficultyContext = (
  educationLevel: string,
  difficulty: string,
  classOrYear: string,
  subject: string,
  stream?: string,
  scienceTrack?: string,
) => {
  if (programmingSubjects.has(subject) && ["higher_secondary", "college"].includes(educationLevel)) {
    if (difficulty === "easy") return "basic programming questions covering syntax, core concepts, and simple program logic";
    if (difficulty === "medium") return "intermediate programming questions with tracing, functions, debugging, and moderate applications";
    return educationLevel === "higher_secondary"
      ? "hard programming questions with application-level logic, debugging, output prediction, and exam-style problem solving"
      : "university exam level tough programming questions with application-level logic, debugging, output prediction, and program analysis";
  }

  if (educationLevel === "school") {
    const cls = parseInt(classOrYear || "1");
    if (difficulty === "easy") return "simple class test with basic recall questions";
    if (difficulty === "medium") return "mid-term exam (40-60 marks) with application-based questions";
    if (cls === 10) return "board exam level with analytical and higher-order thinking questions";
    return "difficult level with analytical and higher-order thinking questions";
  }
  if (educationLevel === "higher_secondary") {
    // Science with explicit goal track
    if (stream === "science" && scienceTrack && competitiveScienceSubjects.has(subject)) {
      if (scienceTrack === "medical") {
        if (difficulty === "easy") return "simple class test with basic NCERT recall and conceptual questions";
        if (difficulty === "medium") return "Class 11/12 board exam pattern questions following NCERT syllabus";
        return "NEET-UG (undergraduate) level questions strictly aligned with NEET-UG pattern: conceptual, application-based, and numerical problems in Physics, Chemistry, and Biology. Do NOT include postgraduate (NEET-PG) content.";
      }
      // engineering
      if (difficulty === "easy") return "Class 11/12 board exam pattern questions following NCERT syllabus";
      if (difficulty === "medium") return "JEE Mains and Kerala KEAM level questions: objective, application-based problems strictly aligned with JEE Mains and KEAM patterns";
      return "JEE Advanced level tough questions: multi-concept, analytical, and application-heavy problems strictly aligned with JEE Advanced pattern (the second-stage exam after qualifying JEE Mains)";
    }

    const cls = parseInt(classOrYear || "11");
    if (difficulty === "easy") return "simple class test with basic conceptual questions";
    if (difficulty === "medium") return "mid-term/series exam (40-60 marks) with moderate difficulty";
    if (cls === 11) return "model exam and entrance exam level questions for competitive preparation";
    return "board exam level questions including previous year board exam patterns";
  }
  if (difficulty === "easy") return "easy fundamental questions testing basic understanding";
  if (difficulty === "medium") return "series/internal exam level questions with moderate complexity, refer to KTU/university patterns";
  return "university exam level with tough application-based and analytical questions, refer to KTU/university exam patterns";
};

const getSubjectSpecificGuidance = (
  educationLevel: string,
  classOrYear: string,
  stream: string | undefined,
  subject: string,
  difficulty: string,
) => {
  if (educationLevel === "higher_secondary" && subject === "Computer Science (Python)") {
    return "Follow CBSE Class 11/12 Computer Science with Python syllabus. Cover syntax, data types, operators, control flow, functions, strings, lists, files, tracing, and simple problem solving.";
  }

  if (educationLevel === "higher_secondary" && subject === "Computer Science (C++)") {
    return "Follow Kerala state higher secondary computer science patterns using C++. Cover syntax, loops, functions, arrays, strings, classes, tracing, and debugging.";
  }

  if (educationLevel === "college" && subject === "Programming in C") {
    return "Follow first-year engineering C programming patterns with concepts, tracing, arrays, pointers, functions, structures, and application-style MCQs.";
  }

  if (educationLevel === "college" && subject === "Python Programming") {
    return "Follow first-year engineering Python patterns with concepts, tracing, functions, strings, lists, dictionaries, files, and application-style MCQs.";
  }

  if (educationLevel === "college" && subject === "Engineering Graphics") {
    return "Focus on first-year engineering graphics basics such as scales, projections, orthographic views, isometric views, conic sections, and dimensioning.";
  }

  if (educationLevel === "college" && subject === "Basics of Electrical & Electronics Engineering") {
    return "Focus on introductory electrical and electronics topics such as circuit laws, AC/DC basics, machines, semiconductors, diodes, transistors, and simple applications.";
  }

  if (
    educationLevel === "higher_secondary" &&
    stream === "science" &&
    difficulty === "hard" &&
    competitiveScienceSubjects.has(subject)
  ) {
    return classOrYear === "11"
      ? "Blend school syllabus with JEE/NEET-style conceptual, numerical, and application-oriented questions where relevant."
      : "Blend board-style patterns with JEE/NEET-style conceptual, numerical, and application-oriented questions where relevant.";
  }

  if (programmingSubjects.has(subject)) {
    return "Prefer code-reading, output prediction, debugging, and concept/application MCQs instead of code submission tasks.";
  }

  return "";
};

async function generateBatch(
  apiKey: string,
  levelLabel: string,
  subject: string,
  difficulty: string,
  context: string,
  numQuestions: number,
  educationLevel: string,
  subjectGuidance: string,
): Promise<any[]> {
  const prompt = `Generate exactly ${numQuestions} multiple-choice quiz questions for:

Level: ${levelLabel}
Subject: ${subject}
Difficulty: ${difficulty} — ${context}
Guidance: ${subjectGuidance || "Use the official syllabus and standard exam patterns for this level."}

IMPORTANT RULES:
- Questions must be appropriate for the exact class/year and subject specified
- Each question must have exactly 4 options
- Include a mix of topics from the subject syllabus for this specific level
- For school: follow CBSE/ICSE/State board patterns
- For class 11-12: follow board exam patterns for the specified stream
- For B.Tech: follow KTU/university exam patterns, refer to standard textbooks and previous year papers
- For programming-related subjects, use MCQs based on concepts, tracing, debugging, syntax, and short logic snippets
- If formulas are needed, use valid KaTeX-compatible LaTeX only with $...$ for inline math and $$...$$ for block math
- Avoid malformed LaTeX, unsupported macros, and broken markdown structure
- Provide a brief explanation for each correct answer`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: "You are an expert quiz generator for Indian education system (CBSE, ICSE, State boards, KTU, and universities). Generate accurate, syllabus-appropriate questions.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 16000,
      tools: [
        {
          type: "function",
          function: {
            name: "submit_quiz",
            description: "Submit generated quiz questions",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      options: {
                        type: "array",
                        items: { type: "string" },
                        minItems: 4,
                        maxItems: 4,
                      },
                      correctIndex: { type: "integer", minimum: 0, maximum: 3 },
                      explanation: { type: "string" },
                    },
                    required: ["question", "options", "correctIndex", "explanation"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "submit_quiz" } },
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    console.error("AI error:", response.status, t);
    if (response.status === 429) {
      throw new Error("Rate limited — please try again in a moment");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted — please add funds");
    }
    throw new Error("Failed to generate quiz questions");
  }

  const aiData = await response.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    throw new Error("No structured response from AI");
  }

  const parsed = JSON.parse(toolCall.function.arguments);
  return parsed.questions || [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
          const { educationLevel, classOrYear, stream, branch, subject, difficulty } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const numQuestions = difficultyMap[difficulty]?.questions || 10;
    const context = getDifficultyContext(educationLevel, difficulty, classOrYear, subject, stream);
    const subjectGuidance = getSubjectSpecificGuidance(educationLevel, classOrYear, stream, subject, difficulty);

    let levelLabel = "";
    if (educationLevel === "school") levelLabel = `Class ${classOrYear}`;
    else if (educationLevel === "higher_secondary") levelLabel = `Class ${classOrYear} (${stream} stream)`;
    else levelLabel = `B.Tech ${branch?.toUpperCase() || ""} Year ${classOrYear}`;

    // For large question counts, split into batches to avoid truncation
    let allQuestions: any[] = [];

    if (numQuestions <= 15) {
      allQuestions = await generateBatch(LOVABLE_API_KEY, levelLabel, subject, difficulty, context, numQuestions, educationLevel, subjectGuidance);
    } else {
      // Split into batches of ~12-13 questions
      const batchSize = Math.ceil(numQuestions / Math.ceil(numQuestions / 13));
      const batches = Math.ceil(numQuestions / batchSize);

      for (let i = 0; i < batches; i++) {
        const remaining = numQuestions - allQuestions.length;
        const count = Math.min(batchSize, remaining);
        const batchQuestions = await generateBatch(LOVABLE_API_KEY, levelLabel, subject, difficulty, context, count, educationLevel, subjectGuidance);
        allQuestions.push(...batchQuestions);
        if (allQuestions.length >= numQuestions) break;
      }

      allQuestions = allQuestions.slice(0, numQuestions);
    }

    if (!allQuestions.length) throw new Error("No questions generated");

    return new Response(JSON.stringify({ questions: allQuestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("quiz-generate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
