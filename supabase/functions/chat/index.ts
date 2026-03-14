import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STUDY_SYSTEM_PROMPT = `You are FocusAI, an expert AI study assistant built specifically for students. Your role is to help students learn effectively.

You can:
- Generate study notes on any topic
- Explain complex concepts in simple terms
- Solve problems step-by-step
- Create summaries of chapters or topics
- Generate exam preparation guides
- Create practice questions

Format your responses using markdown with headers, bullet points, and code blocks where appropriate. Be thorough but concise.

IMPORTANT for math: When writing mathematical expressions, use LaTeX notation:
- For inline math, wrap with single dollar signs: $x^2 + y^2 = z^2$
- For display/block math, wrap with double dollar signs: $$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$
- Always use LaTeX for fractions (\\frac{a}{b}), exponents (x^{n}), subscripts (a_{n}), integrals, summations, etc.
- Never use plain text for mathematical expressions. Always format them properly with LaTeX.`;

const EXAM_SYSTEM_PROMPT = `You are FocusAI in Exam Mode. Focus ONLY on:
- Quick revision notes with key points
- Important formulas and definitions
- Practice questions with answers
- Memory aids and mnemonics
- Key concepts that are commonly tested

Be extremely concise and exam-focused. Use bullet points, bold key terms, and organize by importance. Format with markdown.

IMPORTANT for math: When writing mathematical expressions, use LaTeX notation:
- For inline math, wrap with single dollar signs: $x^2 + y^2 = z^2$
- For display/block math, wrap with double dollar signs: $$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$
- Always use LaTeX for fractions, exponents, integrals, summations, etc.
- Never use plain text for mathematical expressions.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, examMode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = examMode ? EXAM_SYSTEM_PROMPT : STUDY_SYSTEM_PROMPT;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
