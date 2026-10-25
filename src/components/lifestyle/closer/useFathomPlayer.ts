import { useCallback, useEffect, useRef } from 'react';

const PLAYER_ORIGIN = 'https://fathom.video';

/** Fathom's embedded video exposes the Player.js HTML5 adapter. */
export function useFathomPlayer(embed: string | undefined, seconds: number | null) {
  const frame = useRef<HTMLIFrameElement>(null);
  const requestDuration = useCallback(() => {
    try { frame.current?.contentWindow?.postMessage(JSON.stringify({
      context: 'player.js', version: '0.0.11', method: 'getDuration', listener: 'sparky-duration',
    }), PLAYER_ORIGIN); } catch (error) {
      if ((error as { name?: string } | null)?.name !== 'SecurityError') throw error;
    }
  }, []);

  useEffect(() => {
    if (!embed || seconds === null || !Number.isFinite(seconds) || seconds < 0) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const receive = (event: MessageEvent) => {
      if (event.origin !== PLAYER_ORIGIN || event.source !== frame.current?.contentWindow) return;
      let data: Record<string, unknown>;
      try { data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; } catch { return; }
      if (!data || data.context !== 'player.js') return;
      if (data.event === 'ready') requestDuration();
      if (data.event !== 'getDuration' || data.listener !== 'sparky-duration') return;
      if (typeof data.value === 'number' && data.value > 0) {
        try { frame.current?.contentWindow?.postMessage(JSON.stringify({
          context: 'player.js', version: '0.0.11', method: 'setCurrentTime', value: Math.min(seconds, data.value),
        }), PLAYER_ORIGIN); } catch (error) {
      if ((error as { name?: string } | null)?.name !== 'SecurityError') throw error;
    }
      } else if (++attempts < 60) {
        clearTimeout(timer);
        timer = setTimeout(requestDuration, 500);
      }
    };
    window.addEventListener('message', receive);
    requestDuration();
    return () => { clearTimeout(timer); window.removeEventListener('message', receive); };
  }, [embed, seconds, requestDuration]);

  return { frame, requestDuration };
}

