// supabase/functions/admin-login/index.ts
//
// Authentifie un administrateur par nom + prénom + code. Le code n'est jamais
// comparé en clair : on hash la tentative et on compare au hash stocké.
//
// Variables d'environnement requises :
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { nom, prenom, code } = await req.json();
    if (!nom || !prenom || !code) {
      return jsonResponse({ ok: false }, 400);
    }

    const codeHash = await sha256(code);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: admin } = await supabase
      .from("admins")
      .select("id, nom, prenom")
      .ilike("nom", nom.trim())
      .ilike("prenom", prenom.trim())
      .eq("code_hash", codeHash)
      .maybeSingle();

    if (!admin) {
      return jsonResponse({ ok: false });
    }

    // Jeton de session simple (suffisant pour un outil interne à 2 personnes).
    const token = await sha256(`${admin.id}-${Date.now()}-${crypto.randomUUID()}`);

    await supabase.from("admin_sessions").insert({
      admin_id: admin.id,
      token,
    });

    return jsonResponse({ ok: true, token, admin: { nom: admin.nom, prenom: admin.prenom } });
  } catch (e) {
    console.error(e);
    return jsonResponse({ ok: false }, 500);
  }
});

async function sha256(text: string) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
