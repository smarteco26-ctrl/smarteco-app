// supabase/functions/check-kobara-payment/index.ts
//
// GET ?id=<kobara_payment_id> — utilisé par la page de retour pour savoir
// si le webhook a déjà confirmé le paiement et généré le voucher.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const ref = url.searchParams.get("ref");
  if (!ref) return jsonResponse({ erreur: "ref manquant" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: paiement } = await supabase
    .from("kobara_payments")
    .select("statut, voucher_id, vouchers(code)")
    .eq("client_ref", ref)
    .maybeSingle();

  if (!paiement) return jsonResponse({ statut: "inconnu" });

  return jsonResponse({
    statut: paiement.statut,
    voucherCode: (paiement as unknown as { vouchers?: { code?: string } }).vouchers?.code ?? null,
  });
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
