import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { converseDailyPlan, transcribeVoiceRecording } from '../../../lib/voicePlanningApi';
import { useVoicePlanInterview } from './useVoicePlanInterview';

vi.mock('../../../lib/voicePlanningApi', () => ({ converseDailyPlan: vi.fn(), transcribeVoiceRecording: vi.fn() }));
vi.mock('../../../lib/notify', () => ({ notify: vi.fn() }));
afterEach(() => vi.unstubAllGlobals());

it('uses the latest live transcript if recording transcription fails', async () => {
  const previews: Preview[] = [];
  class Preview {
    onresult?: (event: { results: Array<Array<{ transcript: string }>> }) => void;
    start() { previews.push(this); }
    stop() {}
  }
  class Recorder {
    static isTypeSupported() { return true; }
    state = 'recording';
    mimeType = 'audio/webm';
    onstop?: () => Promise<void>;
    start() {}
    stop() { this.state = 'inactive'; void this.onstop?.(); }
  }
  vi.stubGlobal('SpeechRecognition', Preview);
  vi.stubGlobal('MediaRecorder', Recorder);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop: vi.fn() }] }) } });
  vi.mocked(transcribeVoiceRecording).mockRejectedValue(new Error('offline'));
  vi.mocked(converseDailyPlan).mockResolvedValue({ reply: 'Zapisane', slots: [], is_ready: false });
  const { result } = renderHook(() => useVoicePlanInterview({ userId: 'owner', planningDate: '2026-10-16' }));
  await act(async () => { await result.current.startRecording(); });
  act(() => { previews[0].onresult?.({ results: [[{ transcript: 'Jutro biegam' }]] }); });
  act(() => result.current.stopRecording());
  await waitFor(() => expect(converseDailyPlan).toHaveBeenCalledWith(expect.objectContaining({
    messages: [{ role: 'user', content: 'Jutro biegam' }],
  })));
});
