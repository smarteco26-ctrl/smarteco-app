// supabase/functions/admin-clients/index.ts
//
// GET : liste les clients avec leur dernier voucher. Nécessite un token admin valide.

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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  const { data: session } = await supabase.from("admin_sessions").select("admin_id").eq("token", token).maybeSingle();
  if (!session) return jsonResponse({ erreur: "non autorisé" }, 401);

  const { data: clients, error } = await supabase
    .from("clients")
    .select("*, vouchers(code, plan_id, quantite, minutes_totales, montant_htg, source, created_at)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return jsonResponse({ erreur: "lecture impossible" }, 500);
  return jsonResponse({ clients });
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
