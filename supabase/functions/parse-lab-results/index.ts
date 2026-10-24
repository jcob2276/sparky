/**
 * @function parse-lab-results
 * @trigger HTTP POST / Frontend (Badania → Laboratorium → Dodaj wyniki → Zdjęcie wyniku)
 * @role Odczytuje ze zdjęcia lub skanu wyniku badań listę markerów (nazwa, wartość, jednostka, zakres); nic nie zapisuje, użytkownik zatwierdza w kreatorze.
 * @reads —
 * @writes —
 * @calls Gemini Vision
 * @consumer MedicalImport (krok wpisywania wyników)
 * @status active
 */
import { serveJson, HttpError } from '../_shared/http.ts'
import { openaiChat } from '../_shared/openai.ts'
import { parseJsonFromContent } from '../_shared/deepseek.ts'
import { LAB_PARSE_PROMPT, normalizeLabParse } from './labParseCore.ts'

const MAX_BASE64_CHARS = 9_000_000

Deno.serve(serveJson(async (req, ctx) => {
  const body = await req.json().catch(() => ({}))
  const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : ''
  const mimeType = typeof body.mimeType === 'string' && /^image\/(jpeg|png|webp)$/.test(body.mimeType) ? body.mimeType : 'image/jpeg'
  if (!imageBase64) throw new HttpError(400, 'Brak zdjęcia wyniku.')
  if (imageBase64.length > MAX_BASE64_CHARS) throw new HttpError(413, 'Zdjęcie jest za duże. Zrób bliższe ujęcie.')
  const apiKey = Deno.env.get('GEMINI_API_KEY') || ''
  if (!apiKey) throw new HttpError(500, 'Odczyt zdjęć nie jest skonfigurowany.')

  const { content } = await openaiChat({
    apiKey,
    model: 'gemini-3.8-flash',
    temperature: 0.1,
    maxTokens: 6000,
    responseFormat: { type: 'json_object' },
    userId: ctx.userId ?? undefined,
    feature: 'lab-photo-parse',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: LAB_PARSE_PROMPT },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
      ],
    }],
  })

  const parsed = normalizeLabParse(parseJsonFromContent(content))
  if (!parsed || parsed.results.length === 0) throw new HttpError(422, 'Nie udało się odczytać wyników ze zdjęcia. Spróbuj ostrzejszego, bliższego ujęcia.')
  return parsed
}))
