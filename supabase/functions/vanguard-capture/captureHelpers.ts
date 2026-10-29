import { getEmbedding } from "../_shared/openai.ts";

export function chunkText(text: string, maxWords = 400, overlapWords = 50): string[] {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 10);
  const chunks: string[] = [];
  let current: string[] = [];
  let wordCount = 0;

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/);
    if (wordCount + words.length > maxWords && current.length > 0) {
      chunks.push(current.join("\n\n"));
      current = [current.join("\n\n").split(/\s+/).slice(-overlapWords).join(" ")];
      wordCount = overlapWords;
    }
    current.push(paragraph.trim());
    wordCount += words.length;
  }

  if (current.length > 0) chunks.push(current.join("\n\n"));
  return chunks.filter((chunk) => chunk.trim().length > 20);
}

export async function embed(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const embedding = await getEmbedding(text, apiKey);
    if (!embedding || !Array.isArray(embedding)) return null;
    if (Array.isArray(embedding[0])) return embedding[0] as number[];
    return embedding as number[];
  } catch (err) {
    console.error("[capture] embed exception:", err);
    return null;
  }
}

export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
