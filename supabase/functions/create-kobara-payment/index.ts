// supabase/functions/create-kobara-payment/index.ts
//
// Crée un paiement Kobara (checkout hébergé) pour le forfait choisi, et
// enregistre une ligne "en_attente" que le webhook kobara-webhook viendra
// confirmer une fois le paiement réellement effectué.
//
// Variables d'environnement requises :
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   KOBARA_SECRET_KEY   (clé secrète Kobara, kbr_sk_live_...)
//   APP_URL              (ex: https://smarteco26-ctrl.github.io/smarteco-app)

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
    const { telephone, prenom, nom, planId, quantite } = await req.json();
    if (!telephone || !prenom || !nom || !planId) {
      return jsonResponse({ erreur: "champs manquants" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: plan } = await supabase.from("plans").select("*").eq("id", planId).maybeSingle();
    if (!plan) return jsonResponse({ erreur: "forfait inconnu" }, 400);

    const q = Number(quantite) || 1;
    const montant = plan.unite === "mois" ? plan.prix_unitaire : plan.prix_unitaire * q;

    const appUrl = Deno.env.get("APP_URL") ?? "https://smarteco26-ctrl.github.io/smarteco-app";
    const clientRef = crypto.randomUUID();

    // On enregistre la commande AVANT d'appeler Kobara : on connaît déjà clientRef,
    // ce qui permet de construire success_url sans dépendre de la réponse de l'API.
    await supabase.from("kobara_payments").insert({
      client_ref: clientRef,
      telephone,
      prenom,
      nom,
      plan_id: planId,
      quantite: q,
      montant_htg: montant,
      statut: "en_attente",
    });

    const res = await fetch("https://api.kobara.app/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("KOBARA_SECRET_KEY")}`,
        "Content-Type": "application/json",
        "Idempotency-Key": clientRef,
      },
      body: JSON.stringify({
        amount: montant,
        currency: "HTG",
        provider: "kobara",
        description: `SMART.ECO — ${plan.label}${plan.unite !== "mois" ? " x" + q : ""}`,
        customer: { name: `${prenom} ${nom}`, phone: telephone },
        success_url: `${appUrl}/paiement_kobara_retour_smart.eco/code.html?ref=${clientRef}&statut=succes`,
        cancel_url: `${appUrl}/paiement_kobara_retour_smart.eco/code.html?ref=${clientRef}&statut=annule`,
        metadata: { client_ref: clientRef, telephone, planId, quantite: q },
      }),
    });

    const data = await res.json();
    if (!res.ok || !data?.data?.checkout_url) {
      console.error("Erreur Kobara:", data);
      await supabase.from("kobara_payments").update({ statut: "echoue" }).eq("client_ref", clientRef);
      return jsonResponse({ erreur: "création du paiement impossible" }, 502);
    }

    await supabase.from("kobara_payments").update({ kobara_payment_id: data.data.id }).eq("client_ref", clientRef);

    return jsonResponse({
      ok: true,
      checkoutUrl: data.data.checkout_url,
      clientRef,
    });
  } catch (e) {
    console.error(e);
    return jsonResponse({ erreur: "erreur serveur" }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
