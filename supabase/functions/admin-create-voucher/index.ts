// supabase/functions/admin-create-voucher/index.ts
//
// Permet à un admin de créer directement un voucher pour un client qui paie
// en espèces sur place. Le client pourra ensuite le lier à son compte dans
// l'app via "J'ai un code voucher" (fonction check-voucher).
//
// Variables d'environnement requises :
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   UNIFI_BASE_URL, UNIFI_API_KEY, UNIFI_SITE_ID

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
    const { token, prenom, nom, telephone, planId, quantite, montantRecu } = await req.json();

    if (!prenom || !nom || !telephone || !planId) {
      return jsonResponse({ erreur: "champs manquants" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: session } = await supabase.from("admin_sessions").select("admin_id, admins(nom, prenom)").eq("token", token).maybeSingle();
    if (!session) return jsonResponse({ erreur: "non autorisé" }, 401);
    const admin = session.admins as unknown as { nom: string; prenom: string };

    const { data: plan } = await supabase.from("plans").select("*").eq("id", planId).maybeSingle();
    if (!plan) return jsonResponse({ erreur: "forfait inconnu" }, 400);

    const q = Number(quantite) || 1;
    const minutes = calculerMinutes(plan.unite, q);
    const montant = montantRecu != null ? Number(montantRecu) : (plan.unite === "mois" ? plan.prix_unitaire : plan.prix_unitaire * q);

    const voucherCode = await creerVoucherUniFi(minutes, `Cash — ${prenom} ${nom} — par ${admin.prenom} ${admin.nom}`);

    const { data: client } = await supabase
      .from("clients")
      .upsert({ prenom, nom, telephone }, { onConflict: "telephone" })
      .select()
      .single();

    const { data: voucher } = await supabase
      .from("vouchers")
      .insert({
        code: voucherCode,
        client_id: client?.id,
        plan_id: planId,
        quantite: q,
        minutes_totales: minutes,
        montant_htg: montant,
        source: "cash_admin",
      })
      .select()
      .single();

    await supabase.from("notifications").insert({
      telephone,
      titre: "Voucher créé ✅",
      corps: `Un voucher a été créé pour vous par l'équipe SMART.ECO. Code : ${voucherCode}.`,
      categorie: "info",
    });

    return jsonResponse({ ok: true, voucherCode, voucherId: voucher?.id });
  } catch (e) {
    console.error(e);
    return jsonResponse({ erreur: "erreur serveur" }, 500);
  }
});

function calculerMinutes(unite: string, quantite: number) {
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

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
