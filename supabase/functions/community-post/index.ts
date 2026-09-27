// supabase/functions/community-post/index.ts
//
// Publie un post ou une réponse dans la Communauté. Si le texte contient
// "@SmartIA" (insensible à la casse), génère automatiquement une réponse
// IA en utilisant les données réelles du client, via Groq.
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
    const { texte, prenom, telephone, parentId } = await req.json();

    if (!texte || !prenom) {
      return jsonResponse({ erreur: "texte et prenom requis" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: post, error } = await supabase
      .from("communaute_posts")
      .insert({
        parent_id: parentId ?? null,
        telephone: telephone ?? null,
        prenom,
        texte,
        est_ia: false,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return jsonResponse({ erreur: "Échec de la publication" }, 500);
    }

    let reponseIA = null;

    if (/@smartia/i.test(texte)) {
      reponseIA = await genererReponseIA(supabase, texte, telephone);

      if (reponseIA) {
        const { data: replyRow } = await supabase
          .from("communaute_posts")
          .insert({
            parent_id: post.id,
            telephone: null,
            prenom: "SmartIA",
            texte: reponseIA,
            est_ia: true,
          })
          .select()
          .single();
        reponseIA = replyRow;
      }
    }

    return jsonResponse({ post, reponseIA });
  } catch (e) {
    console.error(e);
    return jsonResponse({ erreur: "Erreur serveur" }, 500);
  }
});

async function genererReponseIA(supabase: ReturnType<typeof createClient>, texte: string, telephone: string | null) {
  let contexteClient = "Aucune donnée client disponible.";
  if (telephone) {
    const { data: voucher } = await supabase
      .from("vouchers")
      .select("*, clients!inner(telephone, prenom, nom)")
      .eq("clients.telephone", telephone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (voucher) {
      contexteClient = `Client : ${voucher.clients.prenom} ${voucher.clients.nom}. ` +
        `Dernier voucher : ${voucher.minutes_totales} minutes au total, ` +
        `acheté le ${new Date(voucher.created_at).toLocaleString("fr-FR")}, ` +
        `source : ${voucher.source}, montant : ${voucher.montant_htg} HTG.`;
    }
  }

  const systemPrompt = `Tu es SmartIA, l'assistant de SMART.ECO (WiFi communautaire en Haïti). Tu réponds publiquement dans le fil Communauté, où d'autres clients te lisent.
Réponds en français, en 2-3 phrases maximum, clair et utile.

Contexte réel du client qui te tague (n'invente jamais de chiffres) :
${contexteClient}

Ne partage jamais de détails privés du client (numéro complet, montant précis) publiquement si ce n'est pas nécessaire — reste général si la question d'un tiers pourrait exposer des infos sensibles.`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: texte },
      ],
      temperature: 0.4,
      max_tokens: 200,
    }),
  });

  if (!res.ok) return "SmartIA est momentanément indisponible pour répondre ici.";
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() ?? null;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
