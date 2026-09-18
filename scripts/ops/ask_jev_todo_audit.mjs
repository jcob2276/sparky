import fs from 'node:fs';

// Parse .env and .env.local
let apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey && fs.existsSync('.env.local')) {
  const localEnv = fs.readFileSync('.env.local', 'utf-8');
  const m = localEnv.match(/OPENROUTER_API_KEY=([^\r\n]+)/);
  if (m) apiKey = m[1].trim();
}
if (!apiKey && fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf-8');
  const m = envContent.match(/OPENROUTER_API_KEY=([^\r\n]+)/);
  if (m) apiKey = m[1].trim();
}

const state = {
  view: 'Todo View (/todo)',
  user_prompt: 'http://localhost:5173/todo użyj jeva i pomyśl jak to wszystko zrobić lepiej i mniej seamless',
  current_ui_state: {
    mobile_viewport: '390x844',
    above_the_fold_elements: [
      'Top bar with Back, Title, Plus, Bulk select button',
      'Segmented View Mode toggle (Lista, Macierz, Kanban)',
      'Search & filter bar (input)',
      'AppleRemindersSmartGrid: 5 large orange cards (Dzisiaj 0, Zaplanowane 0, Wszystkie 12, Z flagą 2, Ukończone 60) taking 300px height',
      'AI Batch Classify Banner ("Szybka klasyfikacja z AI")',
      'Na dziś / Aktywne section header',
      'DayCapacityBar ("POJEMNOŚĆ DNIA 0m / 0m")',
      'Current event widget ("TERAZ Wydarzenie 06:45")'
    ],
    task_visibility_above_the_fold: 'ZERO tasks visible without scrolling 1.5 - 2 screen heights',
    visual_styling: 'Orange background, orange cards, orange inputs — monochromatic soup lacking contrast and grounding, everything blends together without clear seams or depth'
  }
};

async function run() {
  console.log('Asking Jev about /todo overhaul and interpretation of "mniej seamless"...');
  const res = await fetch('https://openrouter.ai/api/alpha/decisions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'jev-latest',
      state,
      questions: {
        user_intent_interpretation: {
          type: 'choice',
          instructions: 'What does the user mean by "zrobić lepiej i mniej seamless"?',
          criteria: {
            tactile_grounding_and_deliberate: 'Add clear visual structure, tangible seams/borders/depth (stop flat orange soup where everything blends into one seamless void), reduce automated AI clutter, make task execution intentional and focused',
            more_hidden_features: 'Hide everything behind gestures',
            keep_as_is: 'The UI is already good'
          }
        },
        above_the_fold_prioritization: {
          type: 'choice',
          instructions: 'How should above-the-fold space on mobile /todo be allocated?',
          criteria: {
            tasks_first_compact_controls: 'Tasks should be visible immediately; collapse or compact the 5 huge smart cards into a sleek horizontal row/pill strip, hide AI classify when not needed, bring Na dziś / Power List directly into view',
            keep_all_5_cards_large: 'Keep the 5 huge cards taking up the entire top half of the screen'
          }
        },
        visual_hierarchy_decision: {
          type: 'choice',
          instructions: 'How should the surfaces and contrast be styled on /todo (similar to our successful /keep overhaul)?',
          criteria: {
            elevated_grouped_surfaces: 'Use distinct elevated grouped surfaces with subtle depth, crisp borders, high contrast text and dividers (like iOS Reminders / Apple Notes), escaping the flat orange monochromatic soup',
            monochromatic_flat_orange: 'Keep all elements flat orange on orange'
          }
        },
        critical_flaws_count: {
          type: 'score',
          instructions: 'Rate the severity of having 0 tasks visible above the fold on a ToDo screen on mobile (1 = fine, 10 = critical failure of a ToDo list).',
          criteria: [
            '1 - Totally acceptable',
            '5 - Suboptimal',
            '10 - Critical failure: a todo list where you cannot see any tasks on first glance'
          ]
        }
      }
    })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Jev HTTP Error:', res.status, err);
    process.exit(1);
  }

  const data = await res.json();
  console.log('Jev Decisions Result:\n', JSON.stringify(data, null, 2));
}

run().catch(console.error);
