// supabase/functions/admin-dashboard/index.ts
//
// GET : revenus et compteurs (jour / 7 jours / 30 jours), tous canaux confondus
// (manuel + cash admin + Kobara), à partir de la table vouchers (source de vérité
// des ventes réellement confirmées).

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

  const { data: vouchers, error } = await supabase
    .from("vouchers")
    .select("montant_htg, source, created_at")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) return jsonResponse({ erreur: "lecture impossible" }, 500);

  const maintenant = Date.now();
  const jour = 24 * 60 * 60 * 1000;

  function total(periodeMs: number) {
    return vouchers
      .filter((v) => maintenant - new Date(v.created_at).getTime() <= periodeMs)
      .reduce((s, v) => s + Number(v.montant_htg || 0), 0);
  }
  function compte(periodeMs: number) {
    return vouchers.filter((v) => maintenant - new Date(v.created_at).getTime() <= periodeMs).length;
  }

  const parSource: Record<string, number> = {};
  for (const v of vouchers) {
    if (maintenant - new Date(v.created_at).getTime() <= 30 * jour) {
      parSource[v.source] = (parSource[v.source] || 0) + Number(v.montant_htg || 0);
    }
  }

  return jsonResponse({
    revenus: {
      jour: total(jour),
      semaine: total(7 * jour),
      mois: total(30 * jour),
    },
    vouchers: {
      jour: compte(jour),
      semaine: compte(7 * jour),
      mois: compte(30 * jour),
    },
    parSource,
  });
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
