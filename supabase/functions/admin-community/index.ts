// supabase/functions/admin-community/index.ts
//
// GET  : liste tous les posts/réponses de la Communauté
// POST : { token, action: 'supprimer' | 'repondre', postId, texte? }

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
    const { data, error } = await supabase.from("communaute_posts").select("*").order("created_at", { ascending: false });
    if (error) return jsonResponse({ erreur: "lecture impossible" }, 500);
    return jsonResponse({ posts: data });
  }

  const { token, action, postId, texte } = await req.json();
  const { data: session } = await supabase.from("admin_sessions").select("admin_id, admins(nom, prenom)").eq("token", token).maybeSingle();
  if (!session) return jsonResponse({ erreur: "non autorisé" }, 401);
  const admin = session.admins as unknown as { nom: string; prenom: string };

  if (action === "supprimer") {
    // Supprime le post et ses réponses (cascade déjà défini sur parent_id)
    await supabase.from("communaute_posts").delete().eq("id", postId);
    return jsonResponse({ ok: true });
  }

  if (action === "repondre") {
    if (!texte) return jsonResponse({ erreur: "texte requis" }, 400);
    await supabase.from("communaute_posts").insert({
      parent_id: postId,
      telephone: null,
      prenom: `Équipe SMART.ECO (${admin.prenom})`,
      texte,
      est_ia: false,
    });
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ erreur: "action inconnue" }, 400);
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
