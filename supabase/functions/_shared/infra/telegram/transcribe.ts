import { fetchWithRetry } from "../../httpClient.ts";
import { transcribeBlob } from "../../openai.ts";

/** Telegram Bot API getFile — for voice / file download in webhook handlers. */
export async function getTelegramFilePath(
  token: string,
  fileId: string,
): Promise<string> {
  const fileRes = await fetchWithRetry(
    `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`,
    {},
    { timeoutMs: 15000, retries: 1, logTag: "telegram.getFile" },
  );
  const fileData = await fileRes.json();
  if (!fileData.ok) {
    throw new Error("Nie udało się pobrać ścieżki pliku z Telegrama");
  }
  return fileData.result.file_path as string;
}

export function telegramFileUrl(token: string, filePath: string): string {
  return `https://api.telegram.org/file/bot${token}/${filePath}`;
}

// Download i transkrypcja mają osobne budżety: pobranie małego pliku z Telegrama jest zawsze
// szybkie (stały limit wystarcza), a Whisper dla dłuższej głosówki realnie potrzebuje więcej
// czasu niż na pobranie — jeden wspólny timeout (dawniej 30s na oba) ucinał transkrypcję
// dłuższych nagrań, mimo że samo pobranie już dawno się skończyło.
const VOICE_DOWNLOAD_TIMEOUT_MS = 15000;

export async function transcribeAudio(
  fileId: string,
  telegramToken: string,
  openAiKey: string,
  options?: { timeoutMs?: number },
): Promise<string> {
  const transcribeTimeoutMs = options?.timeoutMs ?? 30000;
  const filePath = await getTelegramFilePath(telegramToken, fileId);
  const fileUrl = telegramFileUrl(telegramToken, filePath);

  if (!fileUrl.startsWith("https://api.telegram.org/")) {
    throw new Error("Invalid file URL - potential SSRF");
  }

  const downloadController = new AbortController();
  const downloadTimeoutId = setTimeout(() => downloadController.abort(), VOICE_DOWNLOAD_TIMEOUT_MS);
  let audioBlob: Blob;
  try {
    const audioRes = await fetch(fileUrl, { signal: downloadController.signal });
    audioBlob = await audioRes.blob();
  } finally {
    clearTimeout(downloadTimeoutId);
  }

  return transcribeBlob(audioBlob, openAiKey, { filename: "voice.ogg", timeoutMs: transcribeTimeoutMs });
}
