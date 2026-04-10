import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const difficultyConfig: Record<string, { questions: number; time: number }> = {
  easy: { questions: 3, time: 20 },
  medium: { questions: 5, time: 40 },
  hard: { questions: 7, time: 60 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { branch, classOrYear, subject, difficulty, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const config = difficultyConfig[difficulty] || difficultyConfig.easy;
    const langLabel = language === "c" ? "C programming" : "Python programming";
    const levelLabel = `B.Tech ${branch?.toUpperCase() || ""} Year ${classOrYear}`;

    const diffContext = difficulty === "easy"
      ? "simple lab-level programs testing fundamentals"
      : difficulty === "medium"
      ? "series/internal exam level coding questions, moderate complexity"
      : "university exam level application-based coding problems, refer to KTU patterns";

    const prompt = `Generate exactly ${config.questions} coding problems for:

Level: ${levelLabel}
Subject: ${subject}
Language: ${langLabel}
Difficulty: ${difficulty} — ${diffContext}

IMPORTANT RULES:
- Each problem must be solvable in ${langLabel}
- Each problem must have exactly 2-3 test cases with input and expected output
- Test cases must use stdin for input and stdout for output
- Problems should be appropriate for the subject and year
- Include a clear problem statement, input/output format description
- For C: use standard I/O (scanf/printf)
- For Python: use input()/print()
- Reference KTU/university exam coding question patterns
- Provide a sample solution for verification`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are an expert coding problem generator for Indian engineering education (KTU, university exams). Generate clear, well-structured coding problems with precise test cases.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 16000,
        tools: [
          {
            type: "function",
            function: {
              name: "submit_coding_problems",
              description: "Submit generated coding problems",
              parameters: {
                type: "object",
                properties: {
                  problems: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Short title of the problem" },
                        description: { type: "string", description: "Full problem statement with input/output format" },
                        testCases: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              input: { type: "string", description: "Stdin input for this test case" },
                              expectedOutput: { type: "string", description: "Expected stdout output" },
                            },
                            required: ["input", "expectedOutput"],
                            additionalProperties: false,
                          },
                          minItems: 2,
                          maxItems: 3,
                        },
                        sampleSolution: { type: "string", description: "Reference solution code" },
                        hint: { type: "string", description: "A brief hint for the student" },
                      },
                      required: ["title", "description", "testCases", "sampleSolution", "hint"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["problems"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_coding_problems" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      if (response.status === 429) throw new Error("Rate limited — please try again in a moment");
      if (response.status === 402) throw new Error("AI credits exhausted — please add funds");
      throw new Error("Failed to generate coding problems");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("No structured response from AI");

    const parsed = JSON.parse(toolCall.function.arguments);
    if (!parsed.problems?.length) throw new Error("No problems generated");

    return new Response(JSON.stringify({ problems: parsed.problems, time: config.time }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("quiz-generate-coding error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
