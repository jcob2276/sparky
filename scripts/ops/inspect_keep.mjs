import fs from 'node:fs';
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

async function run() {
  if (!fs.existsSync('screeny')) {
    fs.mkdirSync('screeny', { recursive: true });
  }

  const supabase = createClient(env.VITE_SUPABASE_URL, env.SB_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user } } = await supabase.auth.admin.getUserById(env.VANGUARD_USER_ID);
  console.log('User email:', user.email);

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: user.email,
    options: { redirectTo: 'http://localhost:5173/keep' },
  });

  if (linkError || !linkData?.properties?.action_link) {
    throw new Error('Failed to generate magic link: ' + linkError?.message);
  }

  const browser = await chromium.launch({ headless: true });

  // 1. Mobile inspection
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();

  console.log('Navigating mobile to magic link...');
  await mobilePage.goto(linkData.properties.action_link);
  await mobilePage.waitForLoadState('networkidle');
  await mobilePage.waitForTimeout(2000);

  console.log('Navigating to /keep...');
  await mobilePage.goto('http://localhost:5173/keep');
  await mobilePage.waitForLoadState('networkidle');
  await mobilePage.waitForTimeout(2000);

  await mobilePage.screenshot({ path: 'screeny/mobile_keep_main.png', fullPage: false });
  console.log('Saved screeny/mobile_keep_main.png');

  // 1. Click view options (sliders/filter icon in header) while on main list
  const optionsBtn = mobilePage.locator('.keep-view-options-trigger').first();
  if (await optionsBtn.count() > 0 && await optionsBtn.isVisible()) {
    console.log('Clicking options button...');
    await optionsBtn.click();
    await mobilePage.waitForTimeout(500);
    await mobilePage.screenshot({ path: 'screeny/mobile_keep_options.png', fullPage: false });
    console.log('Saved screeny/mobile_keep_options.png');
    // Close options menu by clicking backdrop
    const closeBtn = mobilePage.locator('button[aria-label="Zamknij opcje widoku"]').first();
    if (await closeBtn.count() > 0) {
      await closeBtn.click();
      await mobilePage.waitForTimeout(500);
    }
  }

  // 2. Click on the note row to open editor
  const noteRow = mobilePage.locator('.note-list-row:has-text("Tożsamość")').first();
  if (await noteRow.count() > 0) {
    console.log('Clicking note row...');
    await noteRow.click();
    await mobilePage.waitForTimeout(1000);
    await mobilePage.screenshot({ path: 'screeny/mobile_keep_note_detail.png', fullPage: false });
    console.log('Saved screeny/mobile_keep_note_detail.png');

    // Click back button in note detail to return to list
    const backBtn = mobilePage.locator('.keep-note-back').first();
    if (await backBtn.count() > 0 && await backBtn.isVisible()) {
      console.log('Clicking back button...');
      await backBtn.click();
      await mobilePage.waitForTimeout(1000);
    }
  }

  // 3. Click the new note button (the edit icon in header)
  const newNoteBtn = mobilePage.locator('button:has(svg.lucide-square-pen)').first();
  if (await newNoteBtn.count() > 0 && await newNoteBtn.isVisible()) {
    console.log('Clicking new note button...');
    await newNoteBtn.click();
    await mobilePage.waitForTimeout(1000);
    await mobilePage.screenshot({ path: 'screeny/mobile_keep_new_note.png', fullPage: false });
    console.log('Saved screeny/mobile_keep_new_note.png');
  }

  await browser.close();
  console.log('Keep detail inspection complete.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
