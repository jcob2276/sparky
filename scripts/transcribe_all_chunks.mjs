import fs from 'fs';
import path from 'path';

const chunksDir = path.resolve('chunks_audio');
const env = fs.readFileSync('.env.local', 'utf-8');
let openRouterKey = '';
env.split('\n').forEach(line => {
  if (line.startsWith('OPENROUTER_API_KEY=')) openRouterKey = line.split('=')[1].trim();
});

if (!openRouterKey) {
  console.error('Missing OPENROUTER_API_KEY in .env.local');
  process.exit(1);
}

const progressFile = path.resolve('transcription_progress.json');
let progress = {};
if (fs.existsSync(progressFile)) {
  try {
    progress = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
  } catch (_e) {
    progress = {};
  }
}

const chunks = fs.readdirSync(chunksDir).filter(f => f.endsWith('.mp3')).sort();
console.log(`Found ${chunks.length} chunks to transcribe.`);

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

async function transcribeChunk(chunkName, index) {
  const startSec = index * 300;
  const endSec = (index + 1) * 300;
  const timeLabel = `[${formatTime(startSec)} - ${formatTime(endSec)}]`;

  if (progress[chunkName] && progress[chunkName].length > 50) {
    console.log(`Chunk ${chunkName} ${timeLabel} already transcribed (${progress[chunkName].length} chars). Skipping.`);
    return progress[chunkName];
  }

  console.log(`Transcribing ${chunkName} ${timeLabel}...`);
  const filePath = path.join(chunksDir, chunkName);
  const audioData = fs.readFileSync(filePath).toString('base64');

  const prompt = `Dokonaj wiernej, dokładnej i dosłownej transkrypcji tego nagrania audio z sesji terapeutycznej / hipnoterapeutycznej w języku polskim.
W nagraniu rozmawiają dwie osoby: Terapeuta (prowadzący) i Jakub (klient).
Rozróżniaj wypowiedzi i oznaczaj rozmówców, np.:
Terapeuta: ...
Jakub: ...
Zwróć WYŁĄCZNIE czysty tekst dialogu / transkrypcji, bez wstępów, bez podsumowań ani komentarzy.`;

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
        progress[chunkName] = text;
        fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2), 'utf-8');
        console.log(`✓ Successfully transcribed ${chunkName} (${text.length} chars)`);
        return text;
      } else {
        throw new Error('Empty response from model');
      }
    } catch (err) {
      console.warn(`Attempt ${attempt} for ${chunkName} failed:`, err.message);
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 3000));
      } else {
        throw err;
      }
    }
  }
}

async function run() {
  for (let i = 0; i < chunks.length; i++) {
    await transcribeChunk(chunks[i], i);
  }

  console.log('\n=== ALL CHUNKS TRANSCRIBED SUCCESSFULLY ===\n');

  let fullTranscript = '# TRANSKRYPCJA SESJI HIPNOTERAPEUTYCZNEJ (24.09.2026)\n\n';
  for (let i = 0; i < chunks.length; i++) {
    const chunkName = chunks[i];
    const startSec = i * 300;
    const endSec = (i + 1) * 300;
    fullTranscript += `\n\n--- [Część ${i + 1}/11: ${formatTime(startSec)} - ${formatTime(endSec)}] ---\n\n`;
    fullTranscript += progress[chunkName] || '[Brak transkrypcji]';
  }

  fs.writeFileSync('SESJA_HIPNOTERAPIA_24_09_2026.md', fullTranscript, 'utf-8');
  console.log('Saved final complete transcript to SESJA_HIPNOTERAPIA_24_09_2026.md');
}

run().catch(err => {
  console.error('Fatal error during transcription:', err);
  process.exit(1);
});
