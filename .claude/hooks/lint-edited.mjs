// PostToolUse hook: eslint only the file just edited. Exit 2 feeds errors back to Claude.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

let raw = '';
for await (const chunk of process.stdin) raw += chunk;

let file = '';
try {
  file = JSON.parse(raw)?.tool_input?.file_path ?? '';
} catch {
  process.exit(0);
}

if (!/\.(ts|tsx|js|jsx|mjs)$/.test(file) || !existsSync(file)) process.exit(0);
if (/[\/](node_modules|dist|coverage|\.worktrees|\.tmp)[\/]/.test(file)) process.exit(0);

const res = spawnSync('npx', ['eslint', '--max-warnings=0', file], {
  encoding: 'utf8',
  shell: true,
});
if (res.status === 0) process.exit(0);

process.stderr.write(`eslint failed for ${file}:\n${(res.stdout || '') + (res.stderr || '')}`.slice(0, 4000));
process.exit(2);
