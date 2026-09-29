// supabase/functions/admin-plans/index.ts
//
// GET  : liste les forfaits (public, pas besoin de token — sert aussi à l'app client si besoin)
// POST : { token, planId, prix_unitaire } — met à jour le prix d'un forfait (admin uniquement)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (req.method === "GET") {
    const { data, error } = await supabase.from("plans").select("*").order("prix_unitaire", { ascending: true });
    if (error) return jsonResponse({ erreur: "lecture impossible" }, 500);
    return jsonResponse({ plans: data });
  }

  const { token, planId, prix_unitaire } = await req.json();
  const { data: session } = await supabase.from("admin_sessions").select("admin_id").eq("token", token).maybeSingle();
  if (!session) return jsonResponse({ erreur: "non autorisé" }, 401);

  if (!planId || prix_unitaire == null || Number(prix_unitaire) <= 0) {
    return jsonResponse({ erreur: "prix invalide" }, 400);
  }

  const { error } = await supabase.from("plans").update({ prix_unitaire: Number(prix_unitaire) }).eq("id", planId);
  if (error) return jsonResponse({ erreur: "écriture impossible" }, 500);

  return jsonResponse({ ok: true });
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
