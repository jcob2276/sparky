import fs from 'node:fs';

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
  view: 'Identity Fundament / Core Context (/tozsamosc or /profil)',
  user_question: 'czy to ma wgl sens [...] używaj jeva żeby to ogarnął i podjął decyzje i zauważył rzeczy',
  user_context_documents: {
    setting_mastering: {
      source: 'SETTING MASTERING (Maciej Gawroński, Leszek Buczak, Gawronify)',
      key_facts: [
        'Jakub pracuje w firmie jako setter od 11.5 miesiąca.',
        'Maciej daje mu ostatnią szansę – firma dopłaca do pustych calli.',
        'Warunek kontraktowy (KPI od 3. tyg): min. 3 zamknięte sprzedaże high-ticket z leadów LUB min. 5 subskrypcji aplikacji po 500 PLN.',
        'Główny błąd w rozmowach: unika kwalifikacji finansowej, boi się odrzucać ludzi (no-fity), wchodzi w 15-minutowe miłe pogaduszki zamiast trzymać ramę i żądać decyzji.'
      ]
    },
    psychological_portrait: {
      source: 'Uporządkowany portret psychologiczny.docx',
      key_facts: [
        '22 lata, student w Rzeszowie.',
        '8-10h dziennie przed ekranami, czarne dziury czasowe, 40-90 min scrolla w łóżku rano.',
        'Zasypianie przy YouTube w tle, masturbacja/porno, ucieczka przed dyskomfortem.',
        'Opisuje siebie jako: leniwy, ambitny, przez-stymulowany.',
        'Stracił klientów przez zaniedbanie i odkładanie odpisywania na kilka dni.'
      ]
    },
    therapy_analysis: {
      source: 'Analiza.docx (sesja z Magdaleną)',
      key_facts: [
        'Ucieczka w intelekt, logikę i analizę przed czuciem emocji i bliskością.',
        'Podświadomy lęk: bliskość kończy się stratą (trauma prenatalna po zmarłym bracie bliźniaku).',
        'Wybieranie niedostępnych kobiet, autosabotaż gdy pojawia się realne zaangażowanie.'
      ]
    },
    astrology_calendar: {
      source: 'Analiza czasowa - Jakub Soboń.pdf (58 stron)',
      key_facts: [
        '58-stronicowy astrokalendarz wedyjski (Krittika, Rahu w 7 domu Chitra, Ketu w 1 domu, Saturn Atma Karaka).'
      ]
    },
    identity_fundament_screen: {
      source: 'Sparky Identity Fundament UI',
      key_declarations: [
        'Moim kierunkiem nie jest kolejne planowanie ani rozumienie siebie, tylko zmniejszanie rozjazdu między potencjałem a dowożeniem.',
        'Drifter: ucieczka w kodowanie/projektowanie aplikacji zamiast sprzedaży, telefonu i ekspozycji.',
        'Drifter: szukanie kolejnego insightu zamiast wykonania akcji.',
        'Drifter: analiza siebie bez realnej akcji tego samego dnia.'
      ]
    }
  }
};

async function run() {
  const res = await fetch('https://openrouter.ai/api/alpha/decisions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'jev-latest',
      state,
      questions: {
        is_identity_fundament_currently_an_escapism_drifter: {
          type: 'choice',
          instructions: 'Does this Identity Fundament screen and context accumulation currently make sense, or is it an intellectual escape mechanism?',
          criteria: {
            monumental_intellectual_escapism: 'It is a textbook intellectual escape: writing declarations about "działam mimo oporu" and reading 58-page astrology / trauma PDFs while actively avoiding cold calls, risking getting fired by Maciej, and spending nights coding Sparky instead of qualifying leads.',
            genuine_foundational_clarity: 'It provides necessary clarity and should be kept as an inspiring personal vision without change.'
          }
        },
        hidden_pattern_diagnosis: {
          type: 'choice',
          instructions: 'What is the deep hidden pattern connecting the 58-page astrology PDF, therapy notes, setting coaching, and Sparky OS development?',
          criteria: {
            exposure_avoidance_through_infinite_introspection: 'Exposure avoidance: whenever real-world rejection or tension is imminent (sales calls, setting KPIs, approaching women, business delivery), Jakub retreats into infinite introspection (astrology, prenatal trauma analysis, building personal OS, tweaking CSS and identity vaults) where he feels in control and heroic without risking real rejection.',
            just_lack_of_time_management: 'He just needs a better Google Calendar schedule and Pomodoro timer.'
          }
        },
        role_of_identity_in_sparky: {
          type: 'choice',
          instructions: 'What must Sparky do with this Identity Fundament to make it actually useful and not toxic rationalization?',
          criteria: {
            brutal_confrontation_engine: 'Never let it be a static inspirational altar. Sparky must weaponize Jakub’s own words against his excuses: confront daily behavior against his declared drifters (e.g. "Spędziłeś 2h na kodowaniu dashboardu i 0 calli. Sam nazwałeś to drifterem #3"). Turn it from a diary into an unyielding behavioral auditor.',
            soft_affirming_space: 'Keep it gentle and private so the user feels understood and emotionally validated.'
          }
        },
        severity_score: {
          type: 'score',
          instructions: 'Rate the urgency of breaking this cycle given that Jakub is 11.5 months into the company and Maciej is on the verge of terminating him (1 = trivial, 10 = critical existential inflection point).',
          criteria: [
            '1 - Low urgency',
            '5 - Moderate urgency',
            '10 - Code Red: Last chance at work, chronic avoidance cycle about to cause financial and professional collapse'
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
