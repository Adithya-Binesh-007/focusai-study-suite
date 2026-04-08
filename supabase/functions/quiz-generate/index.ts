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
  if (difficulty === "medium") return "series/internal exam level questions with moderate complexity";
  return "university exam level with application-based and analytical questions";
};

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

    const prompt = `Generate exactly ${numQuestions} multiple-choice quiz questions for:

Level: ${levelLabel}
Subject: ${subject}
Difficulty: ${difficulty} — ${context}

IMPORTANT RULES:
- Questions must be appropriate for the exact class/year and subject specified
- Each question must have exactly 4 options (A, B, C, D)
- Include a mix of topics from the subject syllabus for this specific level
- For school: follow CBSE/ICSE/State board patterns
- For class 11-12: follow board exam patterns for the specified stream
- For B.Tech: follow university exam patterns for the specified branch and year
- Provide a brief explanation for each correct answer

Respond ONLY with valid JSON in this exact format, no other text:
{
  "questions": [
    {
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert quiz generator for Indian education system (CBSE, ICSE, State boards, and universities). Generate accurate, syllabus-appropriate questions. Always respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "Failed to generate quiz" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = rawContent;
    const codeBlockMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) jsonStr = codeBlockMatch[1];

    const parsed = JSON.parse(jsonStr.trim());

    return new Response(JSON.stringify(parsed), {
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
