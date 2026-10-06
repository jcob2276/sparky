import fs from 'fs';
import path from 'path';

const env = fs.readFileSync('.env.local', 'utf-8');
let openRouterKey = '';
env.split('\n').forEach(line => {
  if (line.startsWith('OPENROUTER_API_KEY=')) openRouterKey = line.split('=')[1].trim();
});

if (!openRouterKey) {
  console.error('Missing OPENROUTER_API_KEY in .env.local');
  process.exit(1);
}

const files = [
  'C:\\Users\\jakub\\Downloads\\Daniel_Durys.mp3',
  'C:\\Users\\jakub\\Downloads\\Ewelina_Mikolajczyk.mp3'
];

async function transcribeFile(filePath) {
  const fileName = path.basename(filePath);
  console.log(`Transcribing ${fileName}...`);
  const audioData = fs.readFileSync(filePath).toString('base64');

  const prompt = `Dokonaj wiernej, dokładnej i dosłownej transkrypcji tego nagrania rozmowy sprzedażowej w języku polskim.
W nagraniu rozmawiają dwie osoby: Jakub (closer/konsultant) i klient/klientka, która została umówiona przez settera.
Zwróć WYŁĄCZNIE czysty tekst dialogu / transkrypcji, bez wstępów, bez podsumowań ani komentarzy. Oznaczaj rozmówców jako "Jakub" i "Klient" (lub odpowiednio do płci/imienia).`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'input_audio',
                  input_audio: {
                    data: audioData,
                    format: 'mp3'
                  }
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`);
      }

      const resJson = await response.json();
      const text = resJson.choices?.[0]?.message?.content?.trim() || '';

      if (text) {
        console.log(`✅ Successfully transcribed ${fileName}`);
        return text;
      } else {
        throw new Error('Empty response from model');
      }
    } catch (err) {
      console.warn(`Attempt ${attempt} for ${fileName} failed:`, err.message);
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 3000));
      } else {
        throw err;
      }
    }
  }
}

async function run() {
  const results = {};
  for (const file of files) {
    if (fs.existsSync(file)) {
      const text = await transcribeFile(file);
      results[path.basename(file)] = text;
      
      // Save individually
      const outPath = file.replace('.mp3', '_transcript.md');
      fs.writeFileSync(outPath, text, 'utf-8');
      console.log(`Saved transcript to ${outPath}`);
    } else {
      console.error(`File not found: ${file}`);
    }
  }
}

run().catch(err => {
  console.error('Fatal error during transcription:', err);
  process.exit(1);
});
