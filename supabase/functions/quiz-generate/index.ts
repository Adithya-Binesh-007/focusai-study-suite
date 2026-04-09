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

const getDifficultyContext = (educationLevel: string, difficulty: string) => {
  if (educationLevel === "school") {
    if (difficulty === "easy") return "simple class test with basic recall questions";
    if (difficulty === "medium") return "mid-term exam (40-60 marks) with application-based questions";
    return "annual/board exam level with analytical and higher-order thinking questions";
  }
  if (educationLevel === "higher_secondary") {
    if (difficulty === "easy") return "simple class test with basic conceptual questions";
    if (difficulty === "medium") return "mid-term/series exam (40-60 marks) with moderate difficulty";
    return "board exam level questions including previous year board exam patterns";
  }
  if (difficulty === "easy") return "easy fundamental questions testing basic understanding";
  if (difficulty === "medium") return "series/internal exam level questions with moderate complexity, refer to KTU/university patterns";
  return "university exam level with application-based and analytical questions, refer to KTU/university exam patterns";
};

async function generateBatch(
  apiKey: string,
  levelLabel: string,
  subject: string,
  difficulty: string,
  context: string,
  numQuestions: number,
  educationLevel: string
): Promise<any[]> {
  const prompt = `Generate exactly ${numQuestions} multiple-choice quiz questions for:

Level: ${levelLabel}
Subject: ${subject}
Difficulty: ${difficulty} — ${context}

IMPORTANT RULES:
- Questions must be appropriate for the exact class/year and subject specified
- Each question must have exactly 4 options
- Include a mix of topics from the subject syllabus for this specific level
- For school: follow CBSE/ICSE/State board patterns
- For class 11-12: follow board exam patterns for the specified stream
- For B.Tech: follow KTU/university exam patterns, refer to standard textbooks and previous year papers
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
    const context = getDifficultyContext(educationLevel, difficulty);

    let levelLabel = "";
    if (educationLevel === "school") levelLabel = `Class ${classOrYear}`;
    else if (educationLevel === "higher_secondary") levelLabel = `Class ${classOrYear} (${stream} stream)`;
    else levelLabel = `B.Tech ${branch?.toUpperCase() || ""} Year ${classOrYear}`;

    // For large question counts, split into batches to avoid truncation
    let allQuestions: any[] = [];

    if (numQuestions <= 15) {
      allQuestions = await generateBatch(LOVABLE_API_KEY, levelLabel, subject, difficulty, context, numQuestions, educationLevel);
    } else {
      // Split into batches of ~12-13 questions
      const batchSize = Math.ceil(numQuestions / Math.ceil(numQuestions / 13));
      const batches = Math.ceil(numQuestions / batchSize);

      for (let i = 0; i < batches; i++) {
        const remaining = numQuestions - allQuestions.length;
        const count = Math.min(batchSize, remaining);
        const batchQuestions = await generateBatch(LOVABLE_API_KEY, levelLabel, subject, difficulty, context, count, educationLevel);
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
