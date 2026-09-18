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
  view: 'Biometrics & Oura Hub (/oura)',
  user_prompt: 'masz api oura masz api garmina stary masz jedzenie masz wszystko zrób te całe strony kozackie i jev;a',
  available_telemetry: {
    oura_enhanced: {
      sleep_phase_5_min: 'hypnogram string (Deep, REM, Light, Awake)',
      hr_items: 'Minute-by-minute nocturnal HR trace (lowest 45 bpm, avg 50.5)',
      hrv_items: 'Minute-by-minute nocturnal HRV trace (avg 69 ms)',
      readiness_contributors: '9 contributors (HRV balance 88, RHR 100, previous night 33)',
      sleep_contributors: '7 contributors (deep 58, rem 32, timing 84, total_sleep 44)',
      vitals: 'SpO2 97.8%, breath 14.2, temp +0.21C, vascular age 20'
    },
    garmin_strava: {
      runs: '13.2 km, 10.8 km, 3.0 km pacing, avg HR, cardio strain 10',
      vo2max: '47.1 ml/kg/min (Cooper test / GC)',
      load_status: 'Optimal adaptation zone'
    },
    nutrition: {
      daily_strain_components: 'kcal 2155, carbs 183g, protein 90g (low vs 140g target), caffeine alert 38mg active, sleep debt -7.8h'
    }
  },
  current_ui_flaws: {
    navbar: 'Fixed floating navbar clips and obscures lower metric cards on mobile',
    data_silence: 'Hypnogram, HR curve, Garmin runs, and nutrition fueling are available in DB but omitted or fragmented',
    styling: 'Flat dark cards with generic text instead of Whoop/Apple-grade interactive biometric telemetry'
  }
};

async function run() {
  console.log('Asking Jev about Biometrics & Oura Hub overhaul...');
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
        architecture_scope: {
          type: 'choice',
          instructions: 'Should /oura become an integrated Triad Biometrics Hub (Oura Sleep/HRV + Garmin Training Load + Fueling/Caffeine)?',
          criteria: {
            integrated_biometric_triad: 'Unify Sleep (Oura), Strain/Workouts (Garmin), and Fueling (Nutrition) into a comprehensive Athletic Recovery Hub',
            isolated_oura_only: 'Keep /oura isolated to only basic Oura sleep numbers'
          }
        },
        hypnogram_and_curves_priority: {
          type: 'choice',
          instructions: 'Should we render the nocturnal hypnogram stage bar and HR/HRV recovery curve from oura_enhanced data?',
          criteria: {
            render_hypnogram_and_hrv: 'Render tactile visual hypnogram (Deep/REM/Light/Awake) and nocturnal HR drop timing to explain why recovery was 59/100',
            omit_curves: 'Only show text numbers without visual hypnogram'
          }
        },
        bottom_navbar_fix: {
          type: 'choice',
          instructions: 'How should navigation on /oura be structured to eliminate the clipping of content cards?',
          criteria: {
            sticky_header_segmented_pills: 'Use a clean sticky top segmented pill bar or properly padded container (pb-28) with backdrop blur, preventing any content clipping',
            keep_floating_overlay: 'Keep floating bar that obscures content'
          }
        },
        telemetry_depth_score: {
          type: 'score',
          instructions: 'Rate the value of cross-referencing late-night meal (22:25, 2745 kcal) and low protein (90g) with low REM sleep (40m) and HR drop delay (1 = trivial, 10 = elite actionable biohacking insight).',
          criteria: [
            '1 - Generic advice',
            '5 - Helpful correlation',
            '10 - Elite actionable biohacking insight connecting behavior directly to Oura recovery'
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
