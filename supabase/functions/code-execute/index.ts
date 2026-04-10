import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PISTON_API = "https://emkc.org/api/v2/piston/execute";

const languageMap: Record<string, { language: string; version: string }> = {
  c: { language: "c", version: "10.2.0" },
  python: { language: "python", version: "3.10.0" },
};

interface TestCase {
  input: string;
  expectedOutput: string;
}

async function runCode(language: string, code: string, input: string): Promise<{ stdout: string; stderr: string }> {
  const langConfig = languageMap[language];
  if (!langConfig) throw new Error(`Unsupported language: ${language}`);

  const response = await fetch(PISTON_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: langConfig.language,
      version: langConfig.version,
      files: [{ name: language === "c" ? "main.c" : "main.py", content: code }],
      stdin: input,
      run_timeout: 10000, // 10 seconds max
      compile_timeout: 10000,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Piston error:", response.status, text);
    throw new Error("Code execution service unavailable");
  }

  const result = await response.json();

  if (result.compile && result.compile.code !== 0) {
    return { stdout: "", stderr: result.compile.stderr || result.compile.output || "Compilation error" };
  }

  return {
    stdout: (result.run?.stdout || "").trim(),
    stderr: (result.run?.stderr || "").trim(),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { language, code, testCases } = await req.json() as {
      language: string;
      code: string;
      testCases: TestCase[];
    };

    if (!language || !code || !testCases?.length) {
      return new Response(JSON.stringify({ error: "Missing language, code, or testCases" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const tc of testCases) {
      try {
        const { stdout, stderr } = await runCode(language, code, tc.input);

        if (stderr) {
          results.push({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: stderr,
            passed: false,
            error: true,
          });
        } else {
          const passed = stdout.trim() === tc.expectedOutput.trim();
          results.push({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: stdout,
            passed,
            error: false,
          });
        }
      } catch (e) {
        results.push({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: e instanceof Error ? e.message : "Execution error",
          passed: false,
          error: true,
        });
      }
    }

    const allPassed = results.every((r) => r.passed);

    return new Response(JSON.stringify({ results, allPassed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("code-execute error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
