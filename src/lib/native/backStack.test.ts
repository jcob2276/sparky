import { describe, it, expect } from 'vitest';
import { registerBackHandler, handleNativeBack } from './backStack';

describe('backStack', () => {
  it('handles back action in LIFO order', () => {
    const log: string[] = [];

    const unregister1 = registerBackHandler(() => {
      log.push('handler1');
      return true;
    });

    const unregister2 = registerBackHandler(() => {
      log.push('handler2');
      return true;
    });

    // When back button is triggered, the last registered handler should execute first
    const handled = handleNativeBack();
    expect(handled).toBe(true);
    expect(log).toEqual(['handler2']);

    // Unregister top handler
    unregister2();

    // Now handler1 should execute
    const handledAgain = handleNativeBack();
    expect(handledAgain).toBe(true);
    expect(log).toEqual(['handler2', 'handler1']);

    // Unregister handler1
    unregister1();

    // Stack is empty
    const handledEmpty = handleNativeBack();
    expect(handledEmpty).toBe(false);
  });

  it('passes through to previous handler if current handler returns false', () => {
    const log: string[] = [];

    const unregisterBottom = registerBackHandler(() => {
      log.push('bottom');
      return true;
    });

    const unregisterTop = registerBackHandler(() => {
      log.push('top-declined');
      return false; // did not handle
    });

    const handled = handleNativeBack();
    expect(handled).toBe(true);
    expect(log).toEqual(['top-declined', 'bottom']);

    unregisterTop();
    unregisterBottom();
  });
});
