// supabase/functions/smartia-chat/index.ts
//
// Chat SmartIA : répond aux questions/problèmes des clients (Communauté et écran SmartIA),
// en s'appuyant sur les données réelles du client (récupérées dans Supabase),
// et signale une "escalade" (statut escalade=true) quand le problème dépasse l'IA.
//
// Variables d'environnement requises :
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   GROQ_API_KEY

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
    const { messages, client } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return jsonResponse({ reponse: "Message vide.", escalade: false }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Récupère les vraies données du client (forfait actif le plus récent) pour que
    // SmartIA réponde avec des faits, pas des suppositions.
    let contexteClient = "Aucune donnée client disponible.";
    if (client?.telephone) {
      const { data: voucher } = await supabase
        .from("vouchers")
        .select("*, clients!inner(telephone, prenom, nom)")
        .eq("clients.telephone", client.telephone)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (voucher) {
        contexteClient = `Client : ${voucher.clients.prenom} ${voucher.clients.nom}. ` +
          `Dernier voucher : code se terminant par ${voucher.code.slice(-4)}, ` +
          `${voucher.minutes_totales} minutes au total, ` +
          `acheté le ${new Date(voucher.created_at).toLocaleString("fr-FR")}, ` +
          `source : ${voucher.source}, montant : ${voucher.montant_htg} HTG.`;
      }
    }

    const systemPrompt = `Tu es SmartIA, l'assistant de support de SMART.ECO, un service WiFi communautaire en Haïti (technologie Starlink).
Réponds en français, de façon chaleureuse, courte et concrète (3-4 phrases maximum).

Contexte réel du client (utilise ces données, n'invente jamais de chiffres) :
${contexteClient}

Tu aides pour : connexion lente, code voucher qui ne marche pas, questions sur les forfaits, questions générales sur le service.

IMPORTANT — Règle d'escalade : si le problème est un litige de paiement non résolu, une panne matérielle, une plainte, une fraude suspectée, ou toute situation que tu ne peux pas résoudre toi-même avec les informations disponibles, termine ta réponse par la balise exacte [ESCALADE] sur sa propre ligne. Ne mets cette balise que si c'est vraiment nécessaire — pas pour de simples questions d'information.`;

    const groqMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-10), // garde un historique court
    ];

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        temperature: 0.4,
        max_tokens: 300,
      }),
    });

    if (!res.ok) {
      return jsonResponse({ reponse: "SmartIA est momentanément indisponible.", escalade: true });
    }

    const data = await res.json();
    let texte = data?.choices?.[0]?.message?.content ?? "Désolé, je n'ai pas compris.";

    const escalade = texte.includes("[ESCALADE]");
    texte = texte.replace("[ESCALADE]", "").trim();

    return jsonResponse({ reponse: texte, escalade });
  } catch (e) {
    console.error(e);
    return jsonResponse({ reponse: "Une erreur est survenue.", escalade: true }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
