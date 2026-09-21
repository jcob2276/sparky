import fs from 'node:fs';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

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
    options: { redirectTo: 'http://localhost:5173/trening' },
  });

  if (linkError || !linkData?.properties?.action_link) {
    throw new Error('Failed to generate magic link: ' + linkError?.message);
  }

  const browser = await chromium.launch({ headless: true });

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await mobileContext.newPage();
  console.log('Navigating to magic link...');
  await page.goto(linkData.properties.action_link);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.goto('http://localhost:5173/trening');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const _info = await page.evaluate(() => {
    const el = document.querySelector('header');
    const html = document.documentElement;
    const body = document.body;
    return {
      htmlClass: html.className,
      bodyClass: body.className,
      theme: html.getAttribute('data-theme'),
      colorScheme: window.getComputedStyle(html).colorScheme,
      bg: window.getComputedStyle(body).backgroundColor,
      headerBg: el ? window.getComputedStyle(el).backgroundColor : null,
      primaryVar: window.getComputedStyle(html).getPropertyValue('--primary'),
      bgVar: window.getComputedStyle(html).getPropertyValue('--background'),
    };
  });
  const coloredEls = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const res = [];
    for (const el of all) {
      const bg = window.getComputedStyle(el).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && !bg.includes('242, 242, 247') && !bg.includes('255, 255, 255')) {
        res.push({ tag: el.tagName, class: el.className ? String(el.className).slice(0, 50) : '', bg });
      }
    }
    return res.slice(0, 15);
  });
  console.log('Colored elements:', coloredEls);

  await page.screenshot({ path: 'screeny/trening_mobile.png', fullPage: true });
  console.log('Saved screeny/trening_mobile.png');

  // Try clicking Powtórz
  const repeatBtn = await page.$('button:has-text("Powtórz")');
  if (repeatBtn) {
    console.log('Clicking Powtórz button...');
    await repeatBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screeny/trening_with_workout.png', fullPage: true });
    console.log('Saved screeny/trening_with_workout.png');

    // Click history pills
    const pills = await page.$$('button[title*="Poprzednio:"]');
    console.log('Found history pills:', pills.length);
    for (let i = 0; i < Math.min(3, pills.length); i++) {
      await pills[i].click();
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screeny/trening_filled_pills.png', fullPage: true });
    console.log('Saved screeny/trening_filled_pills.png');
  }

  await browser.close();
  console.log('Inspection complete.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
