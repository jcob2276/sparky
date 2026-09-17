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

// Download i transkrypcja mają osobne budżety: pobranie pliku z Telegrama dla dłuższych
// nagrań (np. 3-4 min / kilkanaście MB) wymaga odpowiedniego czasu, zwłaszcza na wolniejszych łączach.
const VOICE_DOWNLOAD_TIMEOUT_MS = 60000;

export async function transcribeAudio(
  fileId: string,
  telegramToken: string,
  openAiKey: string,
  options?: { timeoutMs?: number },
): Promise<string> {
  const transcribeTimeoutMs = options?.timeoutMs ?? 45000;
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
    if (!audioRes.ok) {
      throw new Error(`Błąd pobierania audio z Telegrama: HTTP ${audioRes.status}`);
    }
    audioBlob = await audioRes.blob();
  } finally {
    clearTimeout(downloadTimeoutId);
  }

  const rawExt = filePath.split(".").pop()?.toLowerCase() || "oga";
  const ext = (rawExt === "oga" || rawExt === "opus") ? "ogg" : rawExt;
  const mime = ext === "ogg" ? "audio/ogg" : ext === "mp3" ? "audio/mpeg" : ext === "m4a" ? "audio/mp4" : "audio/ogg";
  const typedBlob = audioBlob.type ? audioBlob : new Blob([audioBlob], { type: mime });

  return transcribeBlob(typedBlob, openAiKey, {
    filename: `voice.${ext}`,
    timeoutMs: transcribeTimeoutMs,
  });
}
