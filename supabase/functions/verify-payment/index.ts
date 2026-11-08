// Confirms a subscription payment and turns access on.
//
// Called in two ways:
//   1. By the website when MyFatoorah sends the member back:  POST { paymentId: "0707…" }
//   2. By MyFatoorah's webhook (optional, set this function's URL in the MyFatoorah portal):
//      POST { Event: {...}, Data: { Invoice: { Id }, Transaction: { PaymentId } } }
//
// Nothing in the request is trusted. The function always asks MyFatoorah (GetPaymentStatus) whether
// the invoice is paid, checks it belongs to a payment we created and that the full price was paid,
// and only then extends the member's subscription. Calling it twice for one payment is harmless.
//
// Secrets: MYFATOORAH_API_KEY (required), MYFATOORAH_BASE_URL, ALLOWED_ORIGINS — see create-payment.
// Response: { status: "paid", ends_at } | { status: "pending" } | { status: "failed" } | { error }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const BASE = (Deno.env.get("MYFATOORAH_BASE_URL") || "https://apitest.myfatoorah.com").replace(/\/+$/, "");
const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map((s) => s.trim()).filter(Boolean);
const RATE = { windowMs: 60_000, max: 20 }; // per IP, per function instance
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, myfatoorah-signature",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}
const reply = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });

const id = (v: unknown) => (typeof v === "string" || typeof v === "number") && /^[0-9A-Za-z-]{1,64}$/.test(String(v)) ? String(v) : "";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = cors(origin);
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: "Use POST." }, 405, headers);
  // Browsers send an Origin; MyFatoorah's webhook doesn't.
  if (ALLOWED.length && origin && !ALLOWED.includes(origin)) return reply({ error: "This site is not allowed." }, 403, headers);

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (limited(ip)) return reply({ error: "Too many requests. Please wait a minute and try again." }, 429, headers);

  const key = Deno.env.get("MYFATOORAH_API_KEY");
  if (!key) return reply({ error: "Online payment is not set up yet." }, 503, headers);

  let body: Record<string, any>;
  try { body = await req.json(); } catch { return reply({ error: "Send a JSON body." }, 400, headers); }
  const fromSite = id(body.paymentId);
  const lookup = fromSite ? { Key: fromSite, KeyType: "PaymentId" }
    : id(body?.Data?.Transaction?.PaymentId) ? { Key: id(body.Data.Transaction.PaymentId), KeyType: "PaymentId" }
    : id(body?.Data?.Invoice?.Id) ? { Key: id(body.Data.Invoice.Id), KeyType: "InvoiceId" }
    : null;
  if (!lookup) return reply({ error: "No payment to check." }, 400, headers);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  let d: Record<string, any>;
  try {
    const res = await fetch(`${BASE}/v2/GetPaymentStatus`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(lookup),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.IsSuccess || !data?.Data) {
      console.error("MyFatoorah GetPaymentStatus failed", res.status, JSON.stringify(data).slice(0, 800));
      return reply({ error: "We couldn't find that payment." }, 404, headers);
    }
    d = data.Data;
  } catch (err) {
    console.error("Verify payment failed", err);
    return reply({ error: "We couldn't reach the payment service. Please refresh the page to try again." }, 502, headers);
  } finally {
    clearTimeout(timer);
  }

  const ref = String(d.CustomerReference || "");
  if (!UUID.test(ref)) return reply({ error: "This payment isn't from this website." }, 404, headers);

  const tx: Record<string, any>[] = Array.isArray(d.InvoiceTransactions) ? d.InvoiceTransactions : [];
  const okTx = tx.find((t) => /^(succss|success)$/i.test(String(t.TransactionStatus)));
  if (String(d.InvoiceStatus).toLowerCase() === "paid") {
    const { data: endsAt, error } = await admin.rpc("activate_payment", {
      p_payment: ref,
      p_invoice: String(d.InvoiceId),
      p_payment_id: String(okTx?.PaymentId || (lookup.KeyType === "PaymentId" ? lookup.Key : "")),
      p_paid: Number(d.InvoiceValue),
    });
    if (error) {
      console.error("Activation refused", ref, error.message);
      return reply({ error: "This payment couldn't be applied. Please contact the gym." }, 409, headers);
    }
    return reply({ status: "paid", ends_at: endsAt }, 200, headers);
  }

  if (String(d.InvoiceStatus).toLowerCase() === "canceled" || (tx.length && tx.every((t) => /failed|canceled/i.test(String(t.TransactionStatus))))) {
    await admin.from("payments").update({ status: "failed" }).eq("id", ref).eq("status", "pending");
    return reply({ status: "failed" }, 200, headers);
  }
  return reply({ status: "pending" }, 200, headers);
});
