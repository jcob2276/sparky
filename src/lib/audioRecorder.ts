/**
 * Cross-platform audio recording utilities for iOS Safari / WebKit and Android / Chrome.
 */

/**
 * Detects the best audio MIME type supported by the current browser / WebView.
 * Handles iOS Safari / WebKit (which only supports audio/mp4 or audio/aac)
 * as well as Chromium / Android / Firefox (which support audio/webm;codecs=opus).
 */
export function getSupportedAudioMimeType(): string {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return 'audio/webm';
  }
  const candidateTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  for (const type of candidateTypes) {
    try {
      if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    } catch {
      /* ignore check failures */
    }
  }
  return '';
}

/**
 * Returns the appropriate audio file extension for a given MIME type string.
 * Used to ensure OpenAI Whisper receives a recognized filename matching the container format.
 */
export function getAudioFileExtension(mimeType?: string): string {
  if (!mimeType) return 'webm';
  const clean = mimeType.toLowerCase();
  if (clean.includes('mp4') || clean.includes('m4a') || clean.includes('aac')) return 'mp4';
  if (clean.includes('ogg')) return 'ogg';
  if (clean.includes('wav')) return 'wav';
  if (clean.includes('webm')) return 'webm';
  return 'webm';
}

interface SpeechPreview {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onerror: () => void;
  onstart?: () => void;
  onend?: () => void;
  start: () => void;
  stop: () => void;
  abort?: () => void;
}

export function createSpeechRecognition(): SpeechPreview | null {
  const speechWindow = window as Window & {
    SpeechRecognition?: new () => SpeechPreview;
    webkitSpeechRecognition?: new () => SpeechPreview;
  };
  const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
  return Recognition ? new Recognition() : null;
}

/** Optional browser speech preview; recorded audio remains the primary source. */
export function startSpeechPreview(onTranscript: (text: string) => void): SpeechPreview | null {
  const recognition = createSpeechRecognition();
  if (!recognition) return null;
  recognition.lang = 'pl-PL';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results, (result) => result[0]?.transcript ?? '').join(' ').trim();
    onTranscript(transcript);
  };
  recognition.onerror = () => {};
  recognition.start();
  return recognition;
}
