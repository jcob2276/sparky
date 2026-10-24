import { describe, expect, it, vi } from 'vitest';
import { requestChronicle, subscribeChronicleIntent, takeChronicleIntent } from './chronicleIntent';

const intent = { goal: 'konto', period: 'week', offset: 0, compareOffset: 1 } as const;

describe('chronicleIntent', () => {
  it('czeka na odbiorcę, który jeszcze nie istnieje, i oddaje zamiar tylko raz', () => {
    requestChronicle(intent);
    expect(takeChronicleIntent()).toEqual(intent);
    expect(takeChronicleIntent()).toBeNull();
  });

  it('budzi słuchacza, a po wypisaniu już nie', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeChronicleIntent(listener);
    requestChronicle(intent);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    requestChronicle(intent);
    expect(listener).toHaveBeenCalledTimes(1);
    takeChronicleIntent();
  });
});
