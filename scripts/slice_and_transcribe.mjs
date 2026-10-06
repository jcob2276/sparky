import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const inputFile = 'C:\\Users\\jakub\\Downloads\\24.09.2026 10.09.m4a';
const chunksDir = path.resolve('chunks_audio');

if (!fs.existsSync(chunksDir)) {
  fs.mkdirSync(chunksDir, { recursive: true });
}

// 1. Segment audio into 5-minute (300s) chunks
console.log('Segmenting audio into 300s chunks...');
const ffmpegCmd = `ffmpeg -i "${inputFile}" -f segment -segment_time 300 -c:a libmp3lame -b:a 48k -ar 16000 -ac 1 "${path.join(chunksDir, 'chunk_%03d.mp3')}" -y`;
execSync(ffmpegCmd, { stdio: 'inherit' });

const files = fs.readdirSync(chunksDir).filter(f => f.endsWith('.mp3')).sort();
console.log(`Created ${files.length} chunks:`, files);
