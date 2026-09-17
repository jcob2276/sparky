export const VISUAL_CARDS_AND_MUTATIONS_PROMPT = `
OPCJONALNE — KARTA WIZUALNA (templateId + data):
Gdy odpowiedź można wzbogacić wizualnie — dodaj pola "templateId" i "data" do JSON.
Używaj tylko gdy karta dodaje wartość (liczby, lista zadań, wydarzenie, cytat, wykres), nie dla prostych tekstowych odpowiedzi.

Dostępne templateId:
- metric — { label, value, unit?, trend?, trendValue? }
- rating — { label, value, max? }
- mood — { label?, value (1-5), note? }
- progress — { label, value, max?, unit?, color? }
- compact — { title, body?, badge?, timestamp? }
- insight_summary — { title, body, confidence (high|medium|low), evidence?, action? }
- quote — { text, author?, source? }
- snippet — { code, language?, title? }
- event — { title, date?, time?, location?, duration?, tags? }
- task — { title, items: [{text,done?,priority?}] }
- duration — { label, hours?, minutes?, description? }
- procedure — { title, steps: [{step,text,done?}] }
- routine — { title, items: [{time?,activity,duration?}], frequency? }
- schedule_briefing — { date, events: [{time,title,duration?,color?}], summary? }
- link — { title, url, domain? }
- person — { name, role?, bio?, tags? }
- place — { name, address?, description?, category? }
- spec_sheet — { title?, rows: [{label,value}] }
- transaction — { title, amount, currency?, direction (in|out), date?, category?, note? }
- article — { title, body, author?, date?, readingTime? }
- conversation — { messages: [{speaker,text,isUser?}], title? }
- gallery — { images: [{url,caption?}] }
- snapshot — { imageUrl, caption?, timestamp? }
- html — { html_template: string (ID szablonu lub raw HTML), widget_data: object }

Szablony html_template (bezpieczne, bez JS):
- metric_signal_dashboard — {{title}}, {{value}}, {{unit}}, {{note}}
- personal_review_magazine — {{headline}}, {{body}}
- work_progress_command — {{project}}, {{task}}, {{deadline}}
- decision_studio — {{question}}, {{option_a}}, {{option_b}}
- system_action_receipt — {{action}}, {{timestamp}}
- visual_memory_editorial — {{date}}, {{moment}}, {{caption}}

Widgety insight (widget_type + widget_data w insight_cards_mutation):
- trend — { points: [{label, value}], unit?, color? }
- bar — { points: [{label, value}], color? }
- timeline — { events: [{time?, title, subtitle?, color?}] }

Przykład użycia:
{
  "answer": "Twój HRV dziś: 72ms, powyżej Twojej średniej tygodniowej.",
  "templateId": "metric",
  "data": { "label": "HRV", "value": 72, "unit": "ms", "trend": "up", "trendValue": 8 },
  ...
}

OPCJONALNE — AKTUALIZACJA SCHEDULE (schedule_mutation):
Gdy użytkownik pyta o plan tygodnia lub prosi o dodanie/zmianę — dodaj pole "schedule_mutation":
{
  "schedule_mutation": {
    "action": "set_presentation" | "add_pending_item" | "complete_pending_item",
    "hero": { "cardId": "...", "title": "...", "description": "...", "startTime": "...", "priority": 1 },
    "editorial_intro": "Krótki przegląd tygodnia",
    "quote_blocks": [{ "title": "...", "content": "...", "priority": "normal" }],
    "add_item": { "id": "...", "kind": "todo" | "event", "title": "...", "dayDate": "YYYY-MM-DD", "startTime": "...", "pastAfter": "ISO" },
    "complete_item_id": "..."
  }
}
Używaj tylko gdy action dotyczy konkretnej zmiany w planie/schedulu. Pomiń gdy nie ma mutacji.

OPCJONALNE — INSIGHT CARDS (insight_cards_mutation):
Gdy chcesz zapisać/aktualizować insight cards lub usunąć je — dodaj pole "insight_cards_mutation":
{
  "insight_cards_mutation": {
    "action": "add" | "update" | "delete",
    "cards": [
      {
        "id": "opcjonalne_uuid_dla_update",
        "template_id": "metric | progress | insight_summary | compact | ...",
        "widget_type": "trend | bar | timeline (opcjonalnie zamiast template_id)",
        "title": "Tytuł karty",
        "insight": "Krótki komentarz",
        "widget_data": { ... },
        "tags": ["tag1"]
      }
    ],
    "delete_ids": ["uuid1", "uuid2"]
  }
}
Pomiń gdy brak zmian w insight cards.
`;
