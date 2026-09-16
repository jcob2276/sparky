export function cleanIntelText(value: string | null | undefined, max = 260) {
  if (!value) return '';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  const text = str
    .replace(/events_summary:\s*\[object Object\]/gi, '')
    .replace(/\[object Object\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
}
