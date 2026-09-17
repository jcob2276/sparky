/**
 * @function analyze-physique
 * @trigger HTTP POST / Frontend physique image analyzer
 * @role Analizuje zdjęcie sylwetki użytkownika za pomocą Vision AI pod kątem % body fat, ogólnej oceny, 15 grup mięśniowych i priorytetów.
 * @reads progress_photos
 * @writes progress_photos
 * @calls openaiChat (gpt-4o)
 * @consumer Moduł transformacji/zdjęć w aplikacji WWW Vanguard
 * @status active
 */

import { serveJson } from "../_shared/http.ts";
import { openaiChat } from "../_shared/openai.ts";

const SYSTEM_PROMPT = `Jesteś zaawansowanym asystentem i ekspertem od fizjoterapii, kulturystyki oraz kompozycji ciała (Computer Vision Physique Analyst).
Twoim zadaniem jest obiektywna, precyzyjna analiza wizualna zdjęcia sylwetki użytkownika.

Na podstawie przekazanego zdjęcia wykonaj szczegółową ocenę i zwróć WYŁĄCZNIE poprawny JSON o następującej strukturze:

{
  "overall_score": 78,
  "body_fat_estimate": "14.5% (13–16%)",
  "body_fat_num": 14.5,
  "symmetry_score": 82,
  "conditioning_score": 75,
  "proportion_score": 80,
  "coaching_summary": "Zwięzłe, profesjonalne podsumowanie stanu sylwetki i jej potencjału (2-3 zdania w języku polskim).",
  "priorities": [
    "Skup się na budowie góry klatki piersiowej (incline chest press).",
    "Boczne aktony barków wymagają większej objętości (lateral raises).",
    "Utrzymuj aktualny bilans kaloryczny dla dalszej rekompozycji."
  ],
  "muscle_groups": [
    { "name": "Klatka piersiowa", "score": 75, "status": "balanced", "notes": "Dobry zarys części środkowej, brak pełności w górnej części." },
    { "name": "Najszersze grzbietu", "score": 80, "status": "strong", "notes": "Szeroki najszerszy grzbiet tworzący dobrą talię V." },
    { "name": "Barki (przednie aktony)", "score": 78, "status": "balanced", "notes": "Kulturalnie zarysowane przednie aktony." },
    { "name": "Barki (boczne aktony)", "score": 70, "status": "lagging", "notes": "Odstają objętościowo od reszty obręczy barkowej." },
    { "name": "Barki (tylne aktony)", "score": 72, "status": "balanced", "notes": "Zauważalna separacja." },
    { "name": "Biceps", "score": 82, "status": "strong", "notes": "Wysoki szczyt bicepsa i dobra gęstość." },
    { "name": "Triceps", "score": 76, "status": "balanced", "notes": "Równomiernie rozwinięta głowa długa i boczna." },
    { "name": "Przedramiona", "score": 74, "status": "balanced", "notes": "Dobra proporcja do ramion." },
    { "name": "Brzuch (prosty)", "score": 78, "status": "balanced", "notes": "Widoczny zarys kostek brzucha." },
    { "name": "Brzuch (skośne)", "score": 75, "status": "balanced", "notes": "Wyraźny zarys bez nadmiernego poszerzenia talii." },
    { "name": "Czworogłowe ud", "score": 76, "status": "balanced", "notes": "Zarys separacji kropelki (vastus medialis)." },
    { "name": "Dwugłowe ud", "score": 72, "status": "balanced", "notes": "Widoczna masa z boku." },
    { "name": "Pośladki", "score": 74, "status": "balanced", "notes": "Dobra jędrność i proporcja do ud." },
    { "name": "Łydki", "score": 68, "status": "lagging", "notes": "Wymagają większej objętości i docięcia." },
    { "name": "Prostowniki grzbietu", "score": 79, "status": "strong", "notes": "Silny zarys dolnego grzbietu." }
  ]
}

Wymagania:
- Zwróć DOKŁADNIE 15 grup mięśniowych podanych wyżej w tablicy muscle_groups.
- Każda grupa musi mieć score (0-100), status ("strong" | "balanced" | "lagging") i zwięzłą uwagę ("notes") po polsku.
- Wszystkie oceny i komentarze mają być rzetelne, pełne szacunku i konstruktywne.`;

Deno.serve(
  serveJson(async (req, ctx) => {
    const { photoId, imageUrl, userId: bodyUserId } = await req.json();
    const userId = ctx.userId || bodyUserId;

    if (!imageUrl) {
      throw new Error("Brak parametru imageUrl.");
    }

    const openAiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) {
      throw new Error("Brak skonfigurowanego klucza GEMINI_API_KEY ani OPENAI_API_KEY.");
    }

    const { content } = await openaiChat({
      apiKey: openAiKey,
      model: "gemini-3-flash-preview",
      temperature: 0.2,
      maxTokens: 1200,
      responseFormat: { type: "json_object" },
      userId: userId || undefined,
      feature: "physique-vision-analysis",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: SYSTEM_PROMPT },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
    });

    if (!content) {
      throw new Error("OpenAI returned empty analysis content.");
    }

    const parsed = JSON.parse(content);
    parsed.analyzed_at = new Date().toISOString();

    if (photoId && userId) {
      await ctx.supabase
        .from("progress_photos")
        .update({ ai_analysis: parsed })
        .eq("id", photoId)
        .eq("user_id", userId);
    }

    return {
      ok: true,
      analysis: parsed,
    };
  })
);
