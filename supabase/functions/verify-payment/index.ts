// supabase/functions/verify-payment/index.ts
//
// Reçoit une preuve de paiement manuel (MonCash/Natcash), la fait vérifier
// par SmartIA (Groq, vision), applique les règles anti-fraude, puis génère
// le voucher via l'API UniFi si tout est valide.
//
// Variables d'environnement requises (à définir dans Supabase → Project Settings → Edge Functions) :
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (clé service_role, PAS la clé publique)
//   GROQ_API_KEY
//   UNIFI_BASE_URL              (ex: https://<votre-console>/proxy/network/integration/v1)
//   UNIFI_API_KEY
//   UNIFI_SITE_ID

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FENETRE_VALIDITE_MINUTES = 5; // jamais exposé au client
const TOLERANCE_MONTANT_HTG = 1;    // tolérance d'arrondi

const NUMEROS_RECEPTION = {
  moncash: "47971485",
  natcash: "33940805",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const {
      prenom,
      nom,
      telephone,
      planId,
      quantite = 1,
      numeroExpediteur,
      methode, // 'moncash' | 'natcash'
      imageBase64, // sans le préfixe data:image/...
    } = body;

    if (!prenom || !nom || !telephone || !planId || !numeroExpediteur || !methode || !imageBase64) {
      return jsonResponse({ statut: "refuse" }, 400);
    }

    if (!/^\d{8}$/.test(numeroExpediteur.replace(/\D/g, "").slice(-8))) {
      return refuse(supabaseAdmin(), { telephone, planId, quantite, numeroExpediteur, methode }, "numero_invalide");
    }

    if (!NUMEROS_RECEPTION[methode as "moncash" | "natcash"]) {
      return jsonResponse({ statut: "refuse" }, 400);
    }

    const supabase = supabaseAdmin();

    // 1. Calcul du montant attendu
    const { data: plan, error: planErr } = await supabase
      .from("plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (planErr || !plan) {
      return jsonResponse({ statut: "refuse" }, 400);
    }

    const montantForfait = plan.unite === "mois" ? plan.prix_unitaire : plan.prix_unitaire * Number(quantite);

    // Le client paie le prix du forfait + le frais de retrait Natcash (par tranche),
    // pour que l'administrateur ne perde rien en retirant l'argent. Aucun frais connu pour MonCash à ce jour.
    let frais = 0;
    if (methode === "natcash") {
      const { data: tranche } = await supabase
        .from("frais_natcash")
        .select("frais_retrait")
        .lte("tranche_min", montantForfait)
        .gte("tranche_max", montantForfait)
        .maybeSingle();
      frais = tranche?.frais_retrait ?? 0;
    }

    const montantAttendu = montantForfait + frais;

    // 2. Hash de l'image (anti-réutilisation)
    const imageHash = await sha256(imageBase64);

    const { data: dejaUtilisee } = await supabase
      .from("payment_proofs")
      .select("id")
      .eq("image_hash", imageHash)
      .eq("statut", "valide")
      .maybeSingle();

    if (dejaUtilisee) {
      return refuse(supabase, { telephone, planId, quantite, numeroExpediteur, methode, imageHash, montantAttendu }, "image_deja_utilisee");
    }

    // 3. Analyse de l'image par SmartIA (Groq, vision)
    const analyse = await analyserPreuveAvecGroq(imageBase64, methode);

    if (!analyse) {
      return refuse(supabase, { telephone, planId, quantite, numeroExpediteur, methode, imageHash, montantAttendu }, "analyse_ia_echouee");
    }

    const { montantDetecte, referenceDetectee, dateHeureDetectee, sembleAuthentique } = analyse;

    // 4. Vérification du montant
    if (!montantDetecte || Math.abs(montantDetecte - montantAttendu) > TOLERANCE_MONTANT_HTG) {
      return refuse(supabase, { telephone, planId, quantite, numeroExpediteur, methode, imageHash, montantAttendu, montantDetecte, referenceDetectee }, "montant_incorrect");
    }

    // 5. Vérification de fraîcheur (< 5 minutes), jamais révélée au client
    if (!dateHeureDetectee) {
      return refuse(supabase, { telephone, planId, quantite, numeroExpediteur, methode, imageHash, montantAttendu, montantDetecte, referenceDetectee }, "date_illisible");
    }
    const minutesEcoulees = (Date.now() - new Date(dateHeureDetectee).getTime()) / 60000;
    if (minutesEcoulees > FENETRE_VALIDITE_MINUTES || minutesEcoulees < -1) {
      return refuse(supabase, { telephone, planId, quantite, numeroExpediteur, methode, imageHash, montantAttendu, montantDetecte, referenceDetectee }, "capture_trop_ancienne");
    }

    // 6. Authenticité visuelle (mise en garde SmartIA contre montage/falsification)
    if (!sembleAuthentique) {
      return refuse(supabase, { telephone, planId, quantite, numeroExpediteur, methode, imageHash, montantAttendu, montantDetecte, referenceDetectee }, "image_suspecte");
    }

    // 7. Référence de transaction déjà utilisée ?
    if (referenceDetectee) {
      const { data: refDejaUtilisee } = await supabase
        .from("payment_proofs")
        .select("id")
        .eq("reference_detectee", referenceDetectee)
        .eq("statut", "valide")
        .maybeSingle();
      if (refDejaUtilisee) {
        return refuse(supabase, { telephone, planId, quantite, numeroExpediteur, methode, imageHash, montantAttendu, montantDetecte, referenceDetectee }, "reference_deja_utilisee");
      }
    }

    // 8. Tout est valide → créer/retrouver le client, générer le voucher via UniFi
    const { data: client } = await supabase
      .from("clients")
      .upsert({ prenom, nom, telephone }, { onConflict: "telephone" })
      .select()
      .single();

    const minutesTotales = calculerMinutes(plan.unite, Number(quantite));
    const voucherCode = await creerVoucherUniFi(minutesTotales, `${prenom} ${nom} - ${telephone}`);

    const { data: voucher } = await supabase
      .from("vouchers")
      .insert({
        code: voucherCode,
        client_id: client?.id,
        plan_id: planId,
        quantite,
        minutes_totales: minutesTotales,
        montant_htg: montantForfait,
        source: "manuel",
      })
      .select()
      .single();

    await supabase.from("payment_proofs").insert({
      client_telephone: telephone,
      plan_id: planId,
      quantite,
      montant_attendu: montantAttendu,
      numero_expediteur: numeroExpediteur,
      methode,
      image_hash: imageHash,
      montant_detecte: montantDetecte,
      reference_detectee: referenceDetectee,
      statut: "valide",
      voucher_id: voucher?.id,
    });

    await supabase.from("notifications").insert({
      telephone,
      titre: "Forfait activé ✅",
      corps: `Votre ${plan.label} est actif. Code voucher : ${voucherCode}.`,
      categorie: "info",
    });

    return jsonResponse({ statut: "valide", voucherCode });
  } catch (e) {
    console.error(e);
    return jsonResponse({ statut: "refuse" }, 500);
  }
});

// ---------- Fonctions utilitaires ----------

function supabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function refuse(supabase: ReturnType<typeof createClient>, ctx: Record<string, unknown>, motif: string) {
  await supabase.from("payment_proofs").insert({
    client_telephone: ctx.telephone,
    plan_id: ctx.planId,
    quantite: ctx.quantite,
    montant_attendu: ctx.montantAttendu ?? 0,
    numero_expediteur: ctx.numeroExpediteur,
    methode: ctx.methode,
    image_hash: ctx.imageHash ?? "n/a",
    montant_detecte: ctx.montantDetecte ?? null,
    reference_detectee: ctx.referenceDetectee ?? null,
    statut: "refuse",
    motif_refus: motif, // usage interne uniquement, jamais renvoyé au client
  });
  // Le client ne reçoit jamais le motif détaillé.
  return jsonResponse({ statut: "refuse" });
}

async function sha256(base64: string) {
  const bytes = Uint8Array.from(atob(base64.slice(0, 200000)), (c) => c.charCodeAt(0));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function calculerMinutes(unite: string, quantite: number) {
  switch (unite) {
    case "heure": return quantite * 60;
    case "jour": return quantite * 1440;
    case "semaine": return quantite * 1440 * 7;
    case "mois": return 1440 * 30;
    default: return 60;
  }
}

async function analyserPreuveAvecGroq(imageBase64: string, methode: string) {
  const prompt = `Tu es SmartIA, l'assistant anti-fraude de SMART.ECO en Haïti.
Analyse cette capture d'écran de transaction ${methode === "moncash" ? "MonCash" : "Natcash"}.
Réponds UNIQUEMENT en JSON strict, sans texte autour, avec ce format exact :
{"montant": <nombre en HTG ou null>, "reference": "<numéro de transaction ou null>", "dateHeure": "<ISO 8601 ou null>", "authentique": <true ou false>}
"authentique" doit être false si l'image semble modifiée, recadrée de façon suspecte, floutée sur des zones clés, ou incohérente avec une vraie capture d'écran MonCash/Natcash.`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.2-90b-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
          ],
        },
      ],
      temperature: 0,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const texte = data?.choices?.[0]?.message?.content ?? "";
  try {
    const parsed = JSON.parse(texte);
    return {
      montantDetecte: parsed.montant ?? null,
      referenceDetectee: parsed.reference ?? null,
      dateHeureDetectee: parsed.dateHeure ?? null,
      sembleAuthentique: parsed.authentique !== false,
    };
  } catch {
    return null;
  }
}

async function creerVoucherUniFi(minutes: number, note: string) {
  const res = await fetch(
    `${Deno.env.get("UNIFI_BASE_URL")}/sites/${Deno.env.get("UNIFI_SITE_ID")}/hotspot/vouchers`,
    {
      method: "POST",
      headers: {
        "X-API-KEY": Deno.env.get("UNIFI_API_KEY")!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: note,
        count: 1,
        timeLimitMinutes: minutes,
        authorizedGuestLimit: 1,
      }),
    },
  );
  const data = await res.json();
  // Adapter selon le format exact renvoyé par votre contrôleur UniFi.
  return data?.data?.[0]?.code ?? data?.code ?? "ERREUR_VOUCHER";
}
