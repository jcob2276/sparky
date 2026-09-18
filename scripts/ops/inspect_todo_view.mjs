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
    options: { redirectTo: 'http://localhost:5173/todo' },
  });

  if (linkError || !linkData?.properties?.action_link) {
    throw new Error('Failed to generate magic link: ' + linkError?.message);
  }

  const browser = await chromium.launch({ headless: true });

  // 1. Mobile View (iPhone 14)
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  console.log('Mobile: Navigating to magic link...');
  await mobilePage.goto(linkData.properties.action_link);
  await mobilePage.waitForLoadState('networkidle');
  await mobilePage.waitForTimeout(2000);
  await mobilePage.goto('http://localhost:5173/todo');
  await mobilePage.waitForLoadState('networkidle');
  await mobilePage.waitForTimeout(3000);
  await mobilePage.screenshot({ path: 'screeny/todo_mobile.png', fullPage: true });
  console.log('Saved screeny/todo_mobile.png');

  // 2. Desktop View
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const desktopPage = await desktopContext.newPage();
  console.log('Desktop: Navigating to magic link...');
  await desktopPage.goto(linkData.properties.action_link);
  await desktopPage.waitForLoadState('networkidle');
  await desktopPage.waitForTimeout(2000);
  await desktopPage.goto('http://localhost:5173/todo');
  await desktopPage.waitForLoadState('networkidle');
  await desktopPage.waitForTimeout(3000);
  await desktopPage.screenshot({ path: 'screeny/todo_desktop.png', fullPage: true });
  console.log('Saved screeny/todo_desktop.png');

  await browser.close();
  console.log('Inspection complete.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
