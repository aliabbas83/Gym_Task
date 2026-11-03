// "Write with AI": short gym texts written by an LLM through OpenRouter.
// The OpenRouter key lives only in this function's secrets — the browser never sees it.
//
// Secrets (Supabase dashboard → Edge Functions → Secrets):
//   OPENROUTER_API_KEY  required
//   OPENROUTER_MODEL    optional, OpenRouter model id (default below)
//   ALLOWED_ORIGINS     optional, comma-separated site origins allowed to call this (e.g. https://gym.example.com)
//
// Request:  POST { task: "caption", muscle?: string, draft?: string }
// Response: { text: string }  or  { error: string }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = Deno.env.get("OPENROUTER_MODEL") || "anthropic/claude-haiku-5.5";
const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map((s) => s.trim()).filter(Boolean);

const MAX_DRAFT = 300;
const MAX_CAPTION = 140;
const RATE = { windowMs: 60_000, max: 8 }; // per IP, per function instance

const TASKS: Record<string, { system: string; user: (i: Input) => string; maxChars: number }> = {
  caption: {
    system:
      "You write captions for workout photos shared on a bodybuilding gym's community gallery. " +
      "Write ONE caption in English: upbeat, specific to the training, friendly, at most 120 characters, " +
      "at most one emoji, no hashtags, no quotation marks, nothing offensive or medical. " +
      "If the user gives a draft, keep its meaning and facts (numbers, names, lifts) and just make it read better. " +
      "Reply with the caption text only.",
    user: (i) =>
      i.draft
        ? `Improve this caption${i.muscle ? ` for a ${i.muscle} workout` : ""}: ${i.draft}`
        : `Write a caption for a photo of a ${i.muscle || "full-body"} workout at the gym.`,
    maxChars: MAX_CAPTION,
  },
};

type Input = { task: string; muscle: string; draft: string };

const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE.windowMs);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > RATE.max;
}

function cors(origin: string | null) {
  const allow = !ALLOWED.length ? "*" : origin && ALLOWED.includes(origin) ? origin : ALLOWED[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function reply(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
}

const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, max) : "";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = cors(origin);
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: "Use POST." }, 405, headers);
  if (ALLOWED.length && (!origin || !ALLOWED.includes(origin))) return reply({ error: "This site is not allowed to use Write with AI." }, 403, headers);

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (limited(ip)) return reply({ error: "Too many requests — please wait a minute and try again." }, 429, headers);

  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) return reply({ error: "Write with AI is not set up yet (missing OPENROUTER_API_KEY)." }, 503, headers);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply({ error: "Send a JSON body." }, 400, headers); }
  const input: Input = { task: clean(body.task, 20), muscle: clean(body.muscle, 40), draft: clean(body.draft, MAX_DRAFT) };
  const task = TASKS[input.task];
  if (!task) return reply({ error: `Unknown task. Supported: ${Object.keys(TASKS).join(", ")}.` }, 400, headers);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "X-Title": "IronHouse Gym",
        ...(origin ? { "HTTP-Referer": origin } : {}),
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 120,
        temperature: 0.8,
        messages: [
          { role: "system", content: task.system },
          { role: "user", content: task.user(input) },
        ],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("OpenRouter error", res.status, JSON.stringify(data).slice(0, 500));
      const msg = res.status === 401 ? "The OpenRouter key is invalid." :
        res.status === 402 ? "The OpenRouter account is out of credits." :
        res.status === 429 ? "The AI service is busy — please try again shortly." : "The AI service could not answer right now.";
      return reply({ error: msg }, 502, headers);
    }
    let text = String(data?.choices?.[0]?.message?.content ?? "").trim().replace(/^["'“”]+|["'“”]+$/g, "");
    if (!text) return reply({ error: "The AI returned an empty answer — please try again." }, 502, headers);
    if (text.length > task.maxChars) text = text.slice(0, task.maxChars - 1).replace(/\s+\S*$/, "") + "…";
    return reply({ text }, 200, headers);
  } catch (err) {
    console.error("Write with AI failed", err);
    const aborted = err instanceof DOMException && err.name === "AbortError";
    return reply({ error: aborted ? "The AI took too long — please try again." : "Something went wrong — please try again." }, 502, headers);
  } finally {
    clearTimeout(timer);
  }
});
