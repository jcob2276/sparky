import { EPISTEMIC_THRESHOLDS } from '@vanguard/domain'
import { allowedRelations } from './rules.ts'

export function buildExtractionPrompt(activeLinksText: string) {
  return `Jestes rygorystycznym Architektem Grafu Sparky. Z tekstu i biometrii wyciagnij triady relacji.

ZASADY EKSTRAKCJI (Graphiti + LightRAG patterns):
- Encja = konkretna, nazwana rzecz. ZAWSZE uzywaj NAJSPECYFICZNIEJSZEJ formy: "Cyberbezpieczenstwo magisterskie URz" nie "studia", "trening biegu 10km" nie "sport".
- Uzywaj "Jakub" jako kanonicznej encji uzytkownika. Nigdy: "ja", "uzytkownik", "on".
- Encje piszemy z Wielkiej Litery (Title Case): "Babcia z Krosna", "Gavronify", "Sprzedaz SaaS".
- NIE twórz wezlów z: pospolitych rzeczowników (dzien, zycie, ludzie, rzeczy, czas), dat, przyslowkow, emocji bez konkretnego targetu.
- Deduplication (Graphiti rule): jesli dwie encje sa TYM SAMYM obiektem realnym, uzywaj pelniejszej nazwy. "NYC" = "New York City" → "New York City".
- NIGDY nie fabrykuj encji spoza tekstu.
- Do kazdej triady dodaj evidence_quote: doslowny cytat z [TEKST], ktory ja uzasadnia; nigdy z przykladow ani listy istniejacych faktow.
- Jesli wniosek nie jest wprost powiedzany → memory_type="hypothesis", confidence_score <= ${EPISTEMIC_THRESHOLDS.GRAPH_HYPOTHESIS_MAX_CONFIDENCE}.
- Relacja MUSI byc jedna z listy:
${allowedRelations.join(", ")}
- Dla rodziny: ma_relacje_z, zna_osobe, mieszka_w, pamieta, wywoluje.
- Dla miejsc: konkretny wezel miejsca np. "Krosno", "Zeglice", "Rzeszow".
- Dla osob rodzinnych: opisowe wezly np. "Babcia z Krosna", "Kuzynka Wiolka".

DYSKUSJA I ROZWIĄZYWANIE KONFLIKTÓW PAMIĘCI (Mem0 pattern):
Porównaj każdą nowo wyciąganą triadę z aktualną listą istniejących faktów w grafie:
EXISTING ACTIVE FACTS:
${activeLinksText || "(brak)"}

Dla każdej nowej triady określ jej "resolution":
- "action": "insert" -> Nowy fakt, który nie dotyczy ani nie koliduje z żadnym istniejącym faktem.
- "action": "merge" -> Nowa triada opisuje ten sam fakt, który już istnieje (identyczny subject, relation i target, np. ponowne wspomnienie tego samego faktu). Wskazuje to na duplikację/wzmocnienie. W "conflicting_link" podaj istniejący fakt.
- "action": "supersede" -> Nowa triada bezpośrednio zaprzecza lub nadpisuje istniejący fakt (np. zmiana miejsca zamieszkania, nowa rola zawodowa zastępująca starą, zmiana nawyku). Stary fakt zostanie oznaczony jako historyczny/przestarzały. W "conflicting_link" podaj istniejący fakt, który jest nadpisywany.

POLE KEYWORDS (LightRAG pattern):
Dla kazdej triady dodaj "keywords" — 2-4 slowa kluczowe tematyczne oddzielone przecinkiem.

Format odpowiedzi, TYLKO JSON:
{
  "triads": [
    {
      "source": "Jakub",
      "source_type": "person",
      "relation": "jest",
      "target": "Student",
      "target_type": "concept",
      "memory_type": "fact",
      "confidence_score": 0.9,
      "keywords": "studia, edukacja",
      "resolution": {
        "action": "supersede",
        "conflicting_link": {
          "source": "Jakub",
          "relation": "jest",
          "target": "Inzynier"
        }
      }
    }
  ]
}

Przyklady:
- Tekst: "mam dwie babcie, jedna mieszka w Krosnie, druga w Zeglicach"
  -> {"triads":[
    {"source":"Jakub","source_type":"person","relation":"ma_relacje_z","target":"Babcia z Krosna","target_type":"person","memory_type":"fact","confidence_score":0.9,"keywords":"rodzina, babcia, relacje","resolution":{"action":"insert"}},
    {"source":"Babcia z Krosna","source_type":"person","relation":"mieszka_w","target":"Krosno","target_type":"place","memory_type":"fact","confidence_score":0.9,"keywords":"miejsce, Krosno, babcia","resolution":{"action":"insert"}},
    {"source":"Jakub","source_type":"person","relation":"ma_relacje_z","target":"Babcia z Zeglic","target_type":"person","memory_type":"fact","confidence_score":0.9,"keywords":"rodzina, babcia, relacje","resolution":{"action":"insert"}},
    {"source":"Babcia z Zeglic","source_type":"person","relation":"mieszka_w","target":"Zeglice","target_type":"place","memory_type":"fact","confidence_score":0.9,"keywords":"miejsce, Zeglice, babcia","resolution":{"action":"insert"}}
  ]}
- Tekst: "chce przejsc ze sfera marketingowej do sprzedazy na zywo"
  -> {"triads":[{"source":"Jakub","source_type":"person","relation":"planuje","target":"Przejscie z marketingu do sprzedazy bezposredniej","target_type":"goal","memory_type":"fact","confidence_score":0.85,"keywords":"sprzedaz, kariera, zmiana, cel","resolution":{"action":"insert"}}]}`

}
