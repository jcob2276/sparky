export interface MealPhotoPromptContext {
  profileLine: string
  historyBlock: string
  correctionsBlock: string
}

const MAX_HINT_CHARS = 500

/**
 * Prompt for meal-photo analysis. `hint` is the user's own correction ("to sernik baskijski, nie zwykły"):
 * it overrides the model's guess about *what* is on the plate, while portions and macros still come from the image.
 */
export function buildMealPhotoPrompt(ctx: MealPhotoPromptContext, hint?: string): string {
  const cleanHint = (hint ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_HINT_CHARS)
  const hintBlock = cleanHint
    ? ` Użytkownik poprawia rozpoznanie: "${cleanHint}". To jest prawda o tym, CO jest na zdjęciu (nazwy, rodzaj); porcje i makra nadal oszacuj ze zdjęcia.`
    : ''
  return `Przeanalizuj zdjęcie całego posiłku. Zwróć wyłącznie JSON: {"items":[{"id":string,"name":string,"grams":number,"minGrams":number,"maxGrams":number,"calories":number,"protein":number,"carbs":number,"fat":number,"fiber":number|null,"sugar":number|null,"confidence":"high"|"medium"|"low","assumptions":string[],"questions":[{"id":string,"prompt":string,"impactKcal":number,"options":[{"id":string,"label":string,"grams":number|null,"calories":number|null,"protein":number|null,"carbs":number|null,"fat":number|null,"fiber":number|null,"sugar":number|null}]}]}]}. Makra dotyczą całej oszacowanej porcji, nie 100 g. Każda opcja odpowiedzi ma zawierać skorygowane gramy, kalorie i makra całego składnika po wybraniu tej opcji. Rozdziel widoczne składniki. Uwzględnij możliwy olej, sos i ukryte dodatki, ale nie udawaj pomiaru: podaj realistyczny zakres minGrams/maxGrams. Pytania twórz tylko wtedy, gdy odpowiedź może istotnie zmienić kalorie; maksymalnie 3 kandydatów na składnik. Krótkie etykiety i pytania po polsku. Kontekst użytkownika: ${ctx.profileLine}. Najczęstsze wybory: ${ctx.historyBlock || 'brak'}. Wcześniejsze poprawki użytkownika (stosuj je do nazewnictwa): ${ctx.correctionsBlock || 'brak'}.${hintBlock}`
}
