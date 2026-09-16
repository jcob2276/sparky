import { describe, it, expect } from 'vitest';
import { getAudioFileExtension } from './audioRecorder';

describe('audioRecorder', () => {
  it('maps MIME types to expected file extensions', () => {
    expect(getAudioFileExtension('audio/webm')).toBe('webm');
    expect(getAudioFileExtension('audio/webm;codecs=opus')).toBe('webm');
    expect(getAudioFileExtension('audio/mp4')).toBe('mp4');
    expect(getAudioFileExtension('audio/aac')).toBe('mp4');
    expect(getAudioFileExtension('audio/m4a')).toBe('mp4');
    expect(getAudioFileExtension('audio/ogg')).toBe('ogg');
    expect(getAudioFileExtension('audio/ogg;codecs=opus')).toBe('ogg');
    expect(getAudioFileExtension('audio/wav')).toBe('wav');
    expect(getAudioFileExtension(undefined)).toBe('webm');
    expect(getAudioFileExtension('')).toBe('webm');
  });
});
