import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

// Parse .env
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
  if (match) {
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[match[1]] = val;
  }
}

// Get Jev API Key
let apiKey = env.OPENROUTER_API_KEY;
if (!apiKey && fs.existsSync('.env.local')) {
  const localEnv = fs.readFileSync('.env.local', 'utf-8');
  const m = localEnv.match(/OPENROUTER_API_KEY=(.+)/);
  if (m) apiKey = m[1].trim();
}
if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY in .env or .env.local');

async function askJevAboutView(viewName, data) {
  const t0 = Date.now();
  const res = await fetch('https://openrouter.ai/api/alpha/decisions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'jev-latest',
      state: data,
      questions: {
        has_text_clipping: {
          type: 'noul',
          instructions: 'Does this view have clipped titles, truncated words with ellipsis in critical headers, or cut-off labels?',
        },
        typography_and_wrapping_clean: {
          type: 'noul',
          instructions: 'Is the typography clean, without words broken awkwardly across lines (e.g. single letters broken off)?',
        },
        primary_issue: {
          type: 'choice',
          instructions: 'What is the primary UI flaw or issue present in this view?',
          criteria: {
            none: 'View is clean, polished and production ready',
            clipped_header_title: 'The date range or main header is clipped or truncated',
            broken_word_wrap: 'Event titles or cards have single letters or broken words on multiple lines',
            layout_misalignment: 'Grid elements or columns overlap awkwardly',
            other: 'Other issue',
          },
        },
        quality_score: {
          type: 'score',
          instructions: 'Rate production UI readiness and Apple-like visual polish from 1 (broken) to 5 (flawless)',
          criteria: [
            '1: Broken, multiple clipping and wrap errors',
            '2: Poor, visible truncation or wrap bugs',
            '3: Decent, minor visual flaws',
            '4: Very good, polished and readable',
            '5: Flawless Apple-level perfection',
          ],
        },
      },
    }),
  });

  const json = await res.json();
  return {
    timeMs: Date.now() - t0,
    answers: json.answers,
  };
}

async function run() {
  const screenyDir = path.resolve(process.cwd(), 'screeny');
  if (!fs.existsSync(screenyDir)) fs.mkdirSync(screenyDir, { recursive: true });

  const supabase = createClient(env.VITE_SUPABASE_URL, env.SB_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user } } = await supabase.auth.admin.getUserById(env.VANGUARD_USER_ID);
  console.log('Authenticating user:', user.email);

  const { data: linkData } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: user.email,
    options: { redirectTo: 'http://localhost:5173/kalendarz' },
  });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('Logging in via Playwright...');
  await page.goto(linkData.properties.action_link);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);

  await page.goto('http://localhost:5173/kalendarz');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const viewsToTest = [
    { name: 'Tydzien', selector: null },
    { name: 'Dzien', selector: 'button:has-text("Dzień")' },
    { name: 'Miesiac', selector: 'button:has-text("Miesiąc")' },
    { name: 'ModalNowe', selector: 'button:has-text("Nowe")' },
  ];

  console.log('\n========================================');
  console.log('🚀 AUDYT KALENDARZA: PLAYWRIGHT + JEV');
  console.log('========================================');

  for (const v of viewsToTest) {
    if (v.selector) {
      await page.click(v.selector);
      await page.waitForTimeout(800);
    }

    const headerTitle = await page.locator('header h1').innerText().catch(() => '');
    const cards = await page.locator('.apple-event-card').allInnerTexts().catch(() => []);
    const cleanCards = cards.map(c => c.replace(/\n+/g, ' | ').trim()).slice(0, 10);

    const screenPath = path.join(screenyDir, `calendar_${v.name.toLowerCase()}.png`);
    await page.screenshot({ path: screenPath });

    const viewState = {
      view: v.name,
      headerTitle,
      sampleCards: cleanCards,
    };

    console.log(`\n📸 [${v.name}] Zrzut: ${screenPath}`);
    console.log(`   Nagłówek: "${headerTitle}"`);
    console.log(`   Przykładowe karty:`, cleanCards.slice(0, 3));

    const jevVerdict = await askJevAboutView(v.name, JSON.stringify(viewState));
    const ans = jevVerdict.answers;

    console.log(`   🤖 Werdykt Jeva (${jevVerdict.timeMs}ms):`);
    console.log(`      - Ucięcie tekstu: ${ans?.has_text_clipping?.noul > 0.4 ? '❌ WYKRYTO' : '✅ CZYSTO'} (noul: ${ans?.has_text_clipping?.noul})`);
    console.log(`      - Typografia/łamanie: ${ans?.typography_and_wrapping_clean?.noul < 0.5 ? '❌ PROBLEM' : '✅ CZYSTO'} (noul: ${ans?.typography_and_wrapping_clean?.noul})`);
    console.log(`      - Główny problem: ${ans?.primary_issue?.choice}`);
    console.log(`      - Ocena Jakości (1-5): ⭐ ${ans?.quality_score?.score} / 5`);
  }

  await browser.close();
  console.log('\n========================================');
  console.log('Audyt zakończony.');
  console.log('========================================');
}

run().catch(console.error);
