/**
 * @function vanguard-keep-triage
 * @trigger HTTP POST / Frontend Pocket (LinksInbox) AI triage & single link analysis
 * @role Klasyfikuje i segreguje linki Pocket pod kątem 3 Głównych Sfer (Ciało, Duch, Konto) oraz wyciąga wnioski AI.
 * @reads vanguard_links
 * @writes vanguard_links (status, category, takeaways)
 * @calls deepseek-chat
 * @status active
 */
import { serveJson } from "../_shared/http.ts";
import { deepseekChat, parseJsonFromContent } from "../_shared/deepseek.ts";
import { LLM_TASKS } from "../_shared/llm/tasks.ts";

const ACTIONS = new Set(["keep", "archive", "todo"]);
const CATEGORIES = new Set(["Ciało", "Duch", "Konto", "Kariera", "Zdrowie", "Technologia", "Biznes", "Inne"]);
const MAX_LINKS = 15;

Deno.serve(serveJson(async (req, ctx) => {
  const body = await req.json().catch(() => ({}));
  const userId = ctx.userId ?? body.userId;
  if (!userId) throw new Error("userId required");

  const db = ctx.supabase;
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY") ?? "";
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not set");

  const linkId = body.linkId;

  // Fetch either specific link or oldest unread links
  let unreadLinks;
  if (linkId) {
    const { data, error } = await db
      .from("vanguard_links")
      .select("id, title, url, description, category, takeaways, created_at")
      .eq("user_id", userId)
      .eq("id", linkId);
    if (error) throw error;
    unreadLinks = data;
  } else {
    const { data, error } = await db
      .from("vanguard_links")
      .select("id, title, url, description, category, takeaways, created_at")
      .eq("user_id", userId)
      .eq("status", "unread")
      .order("created_at", { ascending: true })
      .limit(MAX_LINKS);
    if (error) throw error;
    unreadLinks = data;
  }

  const totalStale = (unreadLinks ?? []).length;
  if (totalStale === 0) {
    return { suggestions: [], totalStale: 0 };
  }

  const linksBlock = (unreadLinks ?? [])
    .map((l) => {
      return `id: ${l.id}\ntytul: ${l.title || "(bez tytulu)"}\nurl: ${l.url}\nopis: ${String(l.description || "").slice(0, 300)}\nkategoria: ${l.category || "nieznana"}`;
    })
    .join("\n---\n");

  const systemPrompt =
    "Jestes Antigravity - AI Jakuba. Analizujesz linki i artykuly z jego skrzynki Pocket (LinksInbox).\n\n" +
    "Twoim zadaniem jest ocena i synteza wiedzy pod katem 3 Glownych Sfer Zycia Jakuba:\n" +
    "- \"Ciało\": zdrowie fizyczne, sen, regeneracja, biometria Oura, trening silowy, odzywianie, longevity\n" +
    "- \"Duch\": umysl, psychika, relacje, uwaznosc, filozofia, nawyki, jasnosc myslenia, spokoj\n" +
    "- \"Konto\": finanse, biznes, kariera programisty, inzynieria oprogramowania, AI, zarzadzanie czasem\n\n" +
    "Dla kazdego linku zdecyduj:\n" +
    "1. \"action\": jedna z akcji:\n" +
    "   - \"keep\" - zostaw w skrzynce (wartosciowy material)\n" +
    "   - \"archive\" - bezuzyteczny szum lub material zdezaktualizowany\n" +
    "   - \"todo\" - material wymagajacy natychmiastowego wykonania zadania\n" +
    "2. \"category\": przypisz do jednej z 3 Sfer: \"Ciało\", \"Duch\" lub \"Konto\" (w ostatecznosci \"Inne\")\n" +
    "3. \"takeaways\": dokladnie 3 konkretne, zwięzłe wnioski/lekcje po polsku, wskazujace co z tego wynika i jak to wdrozyc\n" +
    "4. \"reasoning\": jedno krotkie zdanie po polsku wyjasniajace sugerowana akcje.\n\n" +
    "Zwroc TYLKO poprawny JSON: {\"suggestions\": [{\"id\": \"...\", \"action\": \"keep|archive|todo\", \"category\": \"Ciało|Duch|Konto\", \"takeaways\": [\"...\", \"...\", \"...\"], \"reasoning\": \"...\"}]}";

  const { content } = await deepseekChat({
    apiKey,
    ...LLM_TASKS.structured,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: linksBlock },
    ],
    maxTokens: 2000,
    temperature: 0.2,
  });

  const parsed = parseJsonFromContent(content);
  if (!parsed) throw new Error("Invalid AI JSON: " + content.slice(0, 200));

  const validIds = new Set((unreadLinks ?? []).map((l) => l.id));
  const rawSuggestions = (Array.isArray((parsed as Record<string, unknown>).suggestions) ? (parsed as Record<string, unknown>).suggestions : []) as unknown[];

  const suggestions = rawSuggestions
    .filter((s: any) => s && validIds.has(s.id) && ACTIONS.has(s.action))
    .map((s: any) => ({
      id: s.id,
      action: s.action,
      category: CATEGORIES.has(s.category) ? s.category : "Inne",
      takeaways: Array.isArray(s.takeaways) ? s.takeaways.map(String).slice(0, 3) : [],
      reasoning: String(s.reasoning || "").slice(0, 300),
    }));

  // If a single link was targeted, update DB immediately
  if (linkId && suggestions.length > 0) {
    const single = suggestions[0];
    await db
      .from("vanguard_links")
      .update({ category: single.category, takeaways: single.takeaways })
      .eq("id", linkId);
  }

  return { suggestions, totalStale };
}));
