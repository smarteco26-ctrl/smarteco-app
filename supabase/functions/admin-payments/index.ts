// supabase/functions/admin-payments/index.ts
//
// GET  : liste les preuves de paiement (par défaut : en_attente + refusées récentes)
// POST : { action: 'valider' | 'refuser', proofId, token } — décision manuelle de l'admin,
//        qui peut aussi annuler une décision déjà prise par SmartIA.
//
// Toute requête doit inclure un token de session admin valide (voir admin-login).
//
// Variables d'environnement requises :
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   UNIFI_BASE_URL, UNIFI_API_KEY, UNIFI_SITE_ID (pour générer un voucher en cas de validation manuelle)

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

  const url = new URL(req.url);
  const token = req.method === "GET" ? url.searchParams.get("token") : (await req.clone().json().catch(() => ({})))?.token;

  const admin = await verifierSession(supabase, token);
  if (!admin) return jsonResponse({ erreur: "non autorisé" }, 401);

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("payment_proofs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return jsonResponse({ erreur: "lecture impossible" }, 500);
    return jsonResponse({ paiements: data });
  }

  // POST : décision manuelle
  const { action, proofId } = await req.json();
  const { data: proof } = await supabase.from("payment_proofs").select("*").eq("id", proofId).maybeSingle();
  if (!proof) return jsonResponse({ erreur: "introuvable" }, 404);

  if (action === "refuser") {
    await supabase.from("payment_proofs").update({ statut: "refuse", motif_refus: `refus manuel par ${admin.prenom} ${admin.nom}` }).eq("id", proofId);
    return jsonResponse({ ok: true });
  }

  if (action === "valider") {
    // Si déjà validée avec un voucher, ne rien recréer.
    if (proof.statut === "valide" && proof.voucher_id) {
      return jsonResponse({ ok: true, deja_valide: true });
    }

    const { data: plan } = await supabase.from("plans").select("*").eq("id", proof.plan_id).maybeSingle();
    const minutes = calculerMinutes(plan?.unite, proof.quantite || 1);
    const voucherCode = await creerVoucherUniFi(minutes, `Validation manuelle ${admin.prenom} ${admin.nom}`);

    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("telephone", proof.client_telephone)
      .maybeSingle();

    const { data: voucher } = await supabase
      .from("vouchers")
      .insert({
        code: voucherCode,
        client_id: client?.id,
        plan_id: proof.plan_id,
        quantite: proof.quantite,
        minutes_totales: minutes,
        montant_htg: proof.montant_attendu,
        source: "manuel",
      })
      .select()
      .single();

    await supabase.from("payment_proofs").update({
      statut: "valide",
      voucher_id: voucher?.id,
      motif_refus: `validation manuelle par ${admin.prenom} ${admin.nom}`,
    }).eq("id", proofId);

    await supabase.from("notifications").insert({
      telephone: proof.client_telephone,
      titre: "Forfait activé ✅",
      corps: `Votre paiement a été vérifié par notre équipe. Code voucher : ${voucherCode}.`,
      categorie: "info",
    });

    return jsonResponse({ ok: true, voucherCode });
  }

  return jsonResponse({ erreur: "action inconnue" }, 400);
});

async function verifierSession(supabase: ReturnType<typeof createClient>, token: string | null | undefined) {
  if (!token) return null;
  const { data } = await supabase
    .from("admin_sessions")
    .select("admin_id, admins(nom, prenom)")
    .eq("token", token)
    .maybeSingle();
  return data?.admins ? { ...data.admins } : null;
}

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

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
