// Starts a subscription payment: creates a MyFatoorah invoice for the chosen plan and returns
// the hosted payment page URL. The member must be logged in. The price always comes from the
// plans table, never from the browser.
//
// Secrets (Supabase dashboard → Edge Functions → Secrets):
//   MYFATOORAH_API_KEY   required, your MyFatoorah API token
//   MYFATOORAH_BASE_URL  optional, default https://apitest.myfatoorah.com (test). Live Kuwait: https://api.myfatoorah.com
//   SITE_URL             required unless the site is called from an https origin, e.g. https://ironhouse.example.com
//                        (MyFatoorah sends the member back here; localhost is not accepted)
//   ALLOWED_ORIGINS      optional, comma-separated site origins allowed to call this
//
// Request:  POST { plan: "monthly" }  with the member's session token (supabase.functions.invoke sends it)
// Response: { url: string }  or  { error: string }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const BASE = (Deno.env.get("MYFATOORAH_BASE_URL") || "https://apitest.myfatoorah.com").replace(/\/+$/, "");
const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map((s) => s.trim()).filter(Boolean);
const RATE = { windowMs: 60_000, max: 5 }; // per member, per function instance

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const hits = new Map<string, number[]>();
function limited(id: string) {
  const now = Date.now();
  const recent = (hits.get(id) || []).filter((t) => now - t < RATE.windowMs);
  recent.push(now);
  hits.set(id, recent);
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
const reply = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });

// Where MyFatoorah sends the member back to. It adds ?paymentId=… to these URLs.
function returnUrls(origin: string | null) {
  const site = Deno.env.get("SITE_URL") || (origin && origin.startsWith("https://") ? origin : "");
  if (!site) return null;
  const make = (result: string) => {
    const u = new URL(site);
    u.searchParams.set("payment", result);
    u.hash = "";
    return u.toString();
  };
  return { ok: make("done"), error: make("failed") };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = cors(origin);
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: "Use POST." }, 405, headers);
  if (ALLOWED.length && (!origin || !ALLOWED.includes(origin))) return reply({ error: "This site is not allowed to take payments." }, 403, headers);

  const key = Deno.env.get("MYFATOORAH_API_KEY");
  if (!key) return reply({ error: "Online payment is not set up yet. Please try again later." }, 503, headers);
  const urls = returnUrls(origin);
  if (!urls) return reply({ error: "Online payment is not set up yet (the site address is missing)." }, 503, headers);

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: auth } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  const user = auth?.user;
  if (!user) return reply({ error: "Please log in first, then choose your plan." }, 401, headers);
  if (limited(user.id)) return reply({ error: "Too many attempts. Please wait a minute and try again." }, 429, headers);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply({ error: "Send a JSON body." }, 400, headers); }
  const planId = typeof body.plan === "string" ? body.plan.slice(0, 40) : "";
  const { data: plan } = await admin.from("plans").select("*").eq("id", planId).eq("active", true).maybeSingle();
  if (!plan) return reply({ error: "That plan isn't available. Please refresh the page and try again." }, 400, headers);

  const { data: payment, error: insertErr } = await admin.from("payments")
    .insert({ user_id: user.id, plan_id: plan.id, months: plan.months, amount_kwd: plan.price_kwd })
    .select("id").single();
  if (insertErr || !payment) {
    console.error("Could not save payment", insertErr);
    return reply({ error: "Something went wrong. Please try again." }, 500, headers);
  }

  const name = (user.email || "").split("@")[0].replace(/[^A-Za-z ]+/g, " ").trim().slice(0, 40) || "Gym Member";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(`${BASE}/v2/SendPayment`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        CustomerName: name,
        NotificationOption: "LNK",
        InvoiceValue: Number(plan.price_kwd),
        DisplayCurrencyIso: "KWD",
        CustomerEmail: user.email || undefined,
        CallBackUrl: urls.ok,
        ErrorUrl: urls.error,
        Language: "EN",
        CustomerReference: payment.id,
        UserDefinedField: user.id,
      }),
    });
    const data = await res.json().catch(() => ({}));
    const invoiceId = data?.Data?.InvoiceId, url = data?.Data?.InvoiceURL;
    if (!res.ok || !data?.IsSuccess || !invoiceId || !url) {
      console.error("MyFatoorah SendPayment failed", res.status, JSON.stringify(data).slice(0, 800));
      await admin.from("payments").update({ status: "failed" }).eq("id", payment.id);
      const msg = res.status === 401 ? "Online payment is not set up correctly (the payment key was rejected)." :
        "The payment page couldn't be opened. Please try again.";
      return reply({ error: msg }, 502, headers);
    }
    await admin.from("payments").update({ invoice_id: String(invoiceId) }).eq("id", payment.id);
    return reply({ url }, 200, headers);
  } catch (err) {
    console.error("Create payment failed", err);
    await admin.from("payments").update({ status: "failed" }).eq("id", payment.id);
    const aborted = err instanceof DOMException && err.name === "AbortError";
    return reply({ error: aborted ? "The payment service took too long. Please try again." : "Something went wrong. Please try again." }, 502, headers);
  } finally {
    clearTimeout(timer);
  }
});
