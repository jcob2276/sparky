const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scratch_voice_dump.json', 'utf-8'));

let out = '';
data.voiceStream.forEach((v, idx) => {
  out += '========================================\n';
  out += `[VOICE #${idx+1}] Date: ${v.date} | Duration: ${v.duration || '?'}s | Mode: ${v.mode || 'raw'}\n`;
  out += `TEXT: ${v.text}\n\n`;
});

fs.writeFileSync('all_voice_transcripts.txt', out, 'utf-8');
console.log('Successfully written', data.voiceStream.length, 'transcripts.');
