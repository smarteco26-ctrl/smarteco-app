// supabase/functions/kobara-webhook/index.ts
//
// Reçoit les événements Kobara (payment.succeeded, etc.), vérifie la
// signature HMAC-SHA256, puis génère le voucher via l'API UniFi.
// Traitement idempotent : un même paiement ne génère jamais deux vouchers.
//
// Variables d'environnement requises :
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   KOBARA_WEBHOOK_SECRET   (secret propre à cet endpoint, distinct de la clé API)
//   UNIFI_BASE_URL, UNIFI_API_KEY, UNIFI_SITE_ID

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();
  const signatureHeader = req.headers.get("Kobara-Signature") || "";
  const headerEnvironment = req.headers.get("Kobara-Environment");

  const match = signatureHeader.match(/^t=(\d+),v1=([a-f0-9]{64})$/);
  if (!match) return new Response("Invalid signature format", { status: 400 });

  const [, timestamp, signature] = match;
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (age > 300) return new Response("Expired webhook", { status: 400 });

  const expected = await hmacSha256Hex(Deno.env.get("KOBARA_WEBHOOK_SECRET")!, `${timestamp}.${rawBody}`);
  if (!timingSafeEqual(expected, signature)) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(rawBody);
  if (event.environment !== headerEnvironment || event.data?.environment !== headerEnvironment) {
    return new Response("Environment mismatch", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (event.event_type === "payment.succeeded") {
    const kobaraPaymentId = event.data.id;

    let { data: paiement } = await supabase
      .from("kobara_payments")
      .select("*")
      .eq("kobara_payment_id", kobaraPaymentId)
      .maybeSingle();

    if (!paiement && event.data?.metadata?.client_ref) {
      const fallback = await supabase
        .from("kobara_payments")
        .select("*")
        .eq("client_ref", event.data.metadata.client_ref)
        .maybeSingle();
      paiement = fallback.data;
      if (paiement) {
        await supabase.from("kobara_payments").update({ kobara_payment_id: kobaraPaymentId }).eq("id", paiement.id);
      }
    }

    if (!paiement) {
      console.error("Paiement Kobara inconnu:", kobaraPaymentId);
      return new Response("ok", { status: 200 }); // on répond 200 quand même (pas la faute de Kobara)
    }

    // Idempotence : déjà traité ?
    if (paiement.statut === "valide") {
      return new Response("ok", { status: 200 });
    }

    const { data: plan } = await supabase.from("plans").select("*").eq("id", paiement.plan_id).maybeSingle();
    const minutes = calculerMinutes(plan?.unite, paiement.quantite);
    const voucherCode = await creerVoucherUniFi(minutes, `Kobara — ${paiement.prenom} ${paiement.nom}`);

    const { data: client } = await supabase
      .from("clients")
      .upsert({ prenom: paiement.prenom, nom: paiement.nom, telephone: paiement.telephone }, { onConflict: "telephone" })
      .select()
      .single();

    const { data: voucher } = await supabase
      .from("vouchers")
      .insert({
        code: voucherCode,
        client_id: client?.id,
        plan_id: paiement.plan_id,
        quantite: paiement.quantite,
        minutes_totales: minutes,
        montant_htg: paiement.montant_htg,
        source: "kobara",
      })
      .select()
      .single();

    await supabase.from("kobara_payments").update({ statut: "valide", voucher_id: voucher?.id }).eq("id", paiement.id);

    await supabase.from("notifications").insert({
      telephone: paiement.telephone,
      titre: "Paiement Kobara confirmé ✅",
      corps: `Votre forfait est actif. Code voucher : ${voucherCode}.`,
      categorie: "info",
    });
  }

  if (event.event_type === "payment.failed") {
    await supabase.from("kobara_payments").update({ statut: "echoue" }).eq("kobara_payment_id", event.data.id);
  }

  return new Response("ok", { status: 200 });
});

function calculerMinutes(unite: string | undefined, quantite: number) {
  switch (unite) {
    case "heure": return quantite * 60;
    case "jour": return quantite * 1440;
    case "semaine": return quantite * 1440 * 7;
    case "mois": return 1440 * 30;
    default: return 60;
  }
}

async function creerVoucherUniFi(minutes: number, note: string) {
  try {
    const res = await fetch(
      `${Deno.env.get("UNIFI_BASE_URL")}/sites/${Deno.env.get("UNIFI_SITE_ID")}/hotspot/vouchers`,
      {
        method: "POST",
        headers: {
          "X-API-KEY": Deno.env.get("UNIFI_API_KEY")!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: note, count: 1, timeLimitMinutes: minutes, authorizedGuestLimit: 1 }),
      },
    );
    const data = await res.json();
    return data?.data?.[0]?.code ?? data?.code ?? "ERREUR_VOUCHER";
  } catch {
    return "ERREUR_VOUCHER";
  }
}

async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}
