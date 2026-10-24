import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

const html = readFileSync('public/poker/index.html', 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
const appScript = scripts.at(-1)?.[1] ?? '';

type Attempt = { key: string; title?: string | null; spec?: unknown; correct: boolean; estimate: number | null; trueEq: number; confidence: number | null; ev: number };
interface Core {
  requiredEquity: (pot: number, bet: number) => number;
  drawEquity: (outs: number, street: string) => number;
  callEV: (eq: number, pot: number, bet: number) => number;
  makeDrillSpec: (rng: () => number) => { t: number; street: string; pot: number; bet: number };
  buildDrill: (spec: { t: number; street: string; pot: number; bet: number }) => { bestAction: string; callEV: number; equity: number; pot: number; bet: number; explanation: string };
  summarize: (p: { attempts: Attempt[] }) => { accuracy: number; streak: number; avgError: number | null; calibration: Array<{ level: number; n: number; accuracy: number | null }> };
  pickNext: (p: { attempts: Attempt[] }, n: number, rng: () => number, last: string) => { type: string; retry?: boolean; index?: number };
  calibrationVerdict: (s: ReturnType<Core['summarize']>) => string | null;
}

function loadCore(): Core {
  const core = appScript.split('// <core>')[1]?.split('// </core>')[0] ?? '';
  return new Function(`${core}\nreturn { requiredEquity, drawEquity, callEV, makeDrillSpec, buildDrill, summarize, pickNext, calibrationVerdict };`)() as Core;
}

const seeded = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const attempt = (patch: Partial<Attempt>): Attempt => ({ key: 'c0', correct: true, estimate: null, trueEq: 35, confidence: null, ev: 0, ...patch });

describe('poker learning core', () => {
  const core = loadCore();

  it('wymagane equity liczy pulę po calli (pot + 2 × bet)', () => {
    expect(core.requiredEquity(120, 40)).toBeCloseTo(0.2, 5);
    expect(core.requiredEquity(150, 150)).toBeCloseTo(1 / 3, 5);
    expect(core.requiredEquity(200, 100)).toBeCloseTo(0.25, 5);
  });

  it('equity z outów: flop ma dwie karty do przyjścia, turn jedną', () => {
    expect(core.drawEquity(9, 'FLOP')).toBeCloseTo(0.35, 2);
    expect(core.drawEquity(4, 'TURN')).toBeCloseTo(4 / 46, 5);
    expect(core.drawEquity(15, 'FLOP')).toBeCloseTo(0.54, 2);
  });

  it('wygenerowane zadania mają jednoznaczną odpowiedź zgodną z EV', () => {
    const rng = seeded(7);
    for (let i = 0; i < 300; i++) {
      const spec = core.makeDrillSpec(rng);
      const drill = core.buildDrill(spec);
      const req = core.requiredEquity(drill.pot, drill.bet);
      expect(Math.abs(drill.equity - req)).toBeGreaterThanOrEqual(0.03);
      expect(drill.bestAction).toBe(drill.callEV > 0 ? 'CALL' : 'FOLD');
      expect(drill.callEV > 0).toBe(drill.equity > req);
    }
  });

  it('podsumowanie liczy celność, serię, błąd oceny i kalibrację pewności', () => {
    const sum = core.summarize({
      attempts: [
        attempt({ correct: false, confidence: 3, estimate: 50, trueEq: 35 }),
        attempt({ correct: true, confidence: 2, estimate: 30, trueEq: 35 }),
        attempt({ correct: true, confidence: 3, estimate: 35, trueEq: 35 }),
      ],
    });
    expect(sum.accuracy).toBe(67);
    expect(sum.streak).toBe(2);
    expect(sum.avgError).toBe(6.7);
    expect(sum.calibration[2]).toEqual({ level: 3, n: 2, accuracy: 50 });
  });

  it('ostrzega przed przesadną pewnością dopiero od 3 prób', () => {
    const few = core.summarize({ attempts: [attempt({ correct: false, confidence: 3 }), attempt({ correct: false, confidence: 3 })] });
    expect(core.calibrationVerdict(few)).toBeNull();
    const many = core.summarize({ attempts: [1, 2, 3].map(() => attempt({ correct: false, confidence: 3 })) });
    expect(core.calibrationVerdict(many)).toContain('przesadna pewność');
  });

  it('nierozwiązane błędy wracają do powtórki, a rozwiązane nie', () => {
    const wrong = { attempts: [attempt({ key: 'c2', correct: false })] };
    expect(core.pickNext(wrong, 5, () => 0.1, 'c0')).toMatchObject({ type: 'curated', index: 2, retry: true });
    const fixed = { attempts: [attempt({ key: 'c2', correct: false }), attempt({ key: 'c2', correct: true })] };
    expect(core.pickNext(fixed, 5, () => 0.1, 'c0').retry).toBeUndefined();
  });
});

describe('poker lab UI', () => {
  function boot() {
    const window = new Window({ url: 'http://localhost/poker/index.html' });
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'innerText');
    Object.defineProperty(window.HTMLElement.prototype, 'innerText', { ...descriptor, set(value: unknown) { descriptor?.set?.call(this, String(value)); } });
    window.HTMLCanvasElement.prototype.getContext = () => ({ beginPath() {}, clearRect() {}, lineTo() {}, moveTo() {}, setLineDash() {}, stroke() {} }) as never;
    window.document.write(html.replace(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/g, ''));
    window.eval(`${appScript}\nwindow.__lab = { handleUserDecision, onEstimateInput, setConfidence, loadNextScenario, revealHint };`);
    window.dispatchEvent(new window.Event('DOMContentLoaded'));
    return window as Window & { __lab: Record<string, (...args: unknown[]) => void> };
  }

  it('ruch jest zablokowany, dopóki nie ocenisz equity i pewności', () => {
    const w = boot();
    const call = w.document.getElementById('btnCall') as unknown as HTMLButtonElement;
    expect(call.disabled).toBe(true);
    w.__lab.onEstimateInput(40);
    expect(call.disabled).toBe(true);
    w.__lab.setConfidence(2);
    expect(call.disabled).toBe(false);
  });

  it('podpowiedź jest ukryta do kliknięcia, a decyzja zapisuje próbę i informację zwrotną', () => {
    const w = boot();
    expect(w.document.getElementById('hintBox')?.classList.contains('hidden')).toBe(true);
    w.__lab.onEstimateInput(40);
    w.__lab.setConfidence(3);
    w.__lab.handleUserDecision('CALL');
    const feedback = w.document.getElementById('learningFeedback')?.textContent ?? '';
    expect(feedback).toContain('oceniłeś 40%');
    const stored = JSON.parse(w.localStorage.getItem('poker-decision-lab-v2') ?? '{}') as { attempts: Array<{ correct: boolean; confidence: number }> };
    expect(stored.attempts).toHaveLength(1);
    expect(stored.attempts[0]).toMatchObject({ correct: true, confidence: 3 });
    expect(w.document.getElementById('statResilience')?.textContent).toBe('100%');
  });

  it('wygenerowane zadanie ukrywa przycisk all-in', () => {
    const w = boot();
    let hidden = false;
    for (let i = 0; i < 40 && !hidden; i++) {
      w.__lab.loadNextScenario();
      hidden = w.document.getElementById('btnRaise')?.classList.contains('hidden') ?? false;
    }
    expect(hidden).toBe(true);
  });
});
