// supabase/functions/check-voucher/index.ts
//
// Utilisé quand un client a déjà reçu un code voucher en main propre
// (paiement cash à l'équipe). Vérifie le code auprès de l'API UniFi,
// puis lie ce voucher au client (créé si besoin) dans notre base.
//
// Variables d'environnement requises :
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   UNIFI_BASE_URL
//   UNIFI_API_KEY
//   UNIFI_SITE_ID

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
    const { code, prenom, nom, telephone } = await req.json();

    if (!code || !prenom || !nom || !telephone) {
      return jsonResponse({ statut: "refuse" }, 400);
    }

    const codeNormalise = String(code).toUpperCase().trim();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Le code est-il déjà lié à un AUTRE client chez nous ?
    const { data: dejaLie } = await supabase
      .from("vouchers")
      .select("id, client_id, clients(telephone)")
      .eq("code", codeNormalise)
      .maybeSingle();

    if (dejaLie && dejaLie.clients && dejaLie.clients.telephone !== telephone) {
      return jsonResponse({ statut: "refuse" });
    }

    // 2. Vérifier le voucher auprès d'UniFi
    const infosUnifi = await verifierVoucherUniFi(codeNormalise);
    if (!infosUnifi || infosUnifi.statut !== "valide") {
      return jsonResponse({ statut: "refuse" });
    }

    // 3. Créer/retrouver le client et lier le voucher (si pas déjà fait)
    const { data: client } = await supabase
      .from("clients")
      .upsert({ prenom, nom, telephone }, { onConflict: "telephone" })
      .select()
      .single();

    if (!dejaLie) {
      await supabase.from("vouchers").insert({
        code: codeNormalise,
        client_id: client?.id,
        plan_id: null,
        quantite: 1,
        minutes_totales: infosUnifi.minutesTotales,
        montant_htg: 0, // vendu manuellement en cash, hors app
        source: "manuel",
      });

      await supabase.from("notifications").insert({
        telephone,
        titre: "Voucher activé ✅",
        corps: `Votre code ${codeNormalise} est maintenant lié à votre compte.`,
        categorie: "info",
      });
    }

    return jsonResponse({
      statut: "valide",
      client: { prenom, nom },
      forfait: {
        minutesRestantes: infosUnifi.minutesRestantes,
        minutesTotales: infosUnifi.minutesTotales,
      },
    });
  } catch (e) {
    console.error(e);
    return jsonResponse({ statut: "refuse" }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function verifierVoucherUniFi(code: string) {
  const res = await fetch(
    `${Deno.env.get("UNIFI_BASE_URL")}/sites/${Deno.env.get("UNIFI_SITE_ID")}/hotspot/vouchers?filter=code.eq('${code}')`,
    { headers: { "X-API-KEY": Deno.env.get("UNIFI_API_KEY")! } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  const voucher = data?.data?.[0];
  if (!voucher) return null;

  // Adapter ces champs selon le format exact renvoyé par votre contrôleur UniFi.
  const utilise = voucher.used === true || voucher.status === "USED_EXPIRED";
  const expire = voucher.status === "EXPIRED";
  if (utilise || expire) return { statut: "invalide" };

  return {
    statut: "valide",
    minutesTotales: voucher.timeLimitMinutes ?? 0,
    minutesRestantes: voucher.timeLimitMinutes ?? 0,
  };
}
