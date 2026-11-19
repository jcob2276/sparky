export function noteLinkHtml(value: string, label?: string): string | null {
  const text = value.trim();
  if (!/^https?:\/\/\S+$/i.test(text)) return null;
  try {
    const url = new URL(text);
    const link = document.createElement('a');
    link.href = url.href;
    link.textContent = label || text;
    return link.outerHTML;
  } catch {
    return null;
  }
}
