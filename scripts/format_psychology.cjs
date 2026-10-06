const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scratch_voice_dump.json', 'utf-8'));

let out = '';
out += '=== DAILY RECONCILIATIONS (Reflections) ===\n\n';
data.reconciliations.forEach((r, idx) => {
  out += `[REC #${idx+1}] Date: ${r.date} | Score: ${r.day_score}\n`;
  out += `User Response:\n${r.user_response}\n`;
  if (r.blocker) out += `Midday Blocker: ${r.blocker}\n`;
  if (r.plan_failure_reason) out += `Plan Failure Reason: ${r.plan_failure_reason}\n`;
  if (r.evening_extraction) out += `Extraction: ${JSON.stringify(r.evening_extraction)}\n`;
  out += '--------------------------------------------------\n\n';
});

out += '\n=== EVAL INTERVIEWS ===\n\n';
data.interviews.forEach((i, idx) => {
  out += `[INTERVIEW #${idx+1}] Date: ${i.date}\nContent: ${i.content}\n\n`;
});

out += '\n=== FRICTION EVENTS (Top & Significant) ===\n\n';
data.frictions.forEach((f, idx) => {
  out += `[FRICTION #${idx+1}] Date: ${f.occurred_at} | Type: ${f.friction_type} | Emotional State: ${f.emotional_state}\n`;
  out += `Intention: ${f.declared_intention} | Behavior: ${f.actual_behavior}\n`;
  out += `Deviation: ${f.deviation}\n`;
  out += `Raw: ${f.raw_text}\n`;
  out += '--------------------------------------------------\n\n';
});

fs.writeFileSync('all_psychology_context.txt', out, 'utf-8');
console.log('Saved all_psychology_context.txt');
