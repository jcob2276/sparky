import { describe, expect, it } from 'vitest';
import { shouldDiscardEmptyNote } from './noteDiscardRules';

describe('shouldDiscardEmptyNote', () => {
  it('keeps a drawing-only or attachment-only note', () => {
    expect(shouldDiscardEmptyNote({ hasText: false, hasAttachments: false, hasDrawing: true })).toBe(false);
    expect(shouldDiscardEmptyNote({ hasText: false, hasAttachments: true, hasDrawing: false })).toBe(false);
  });

  it('discards a genuinely empty draft', () => {
    expect(shouldDiscardEmptyNote({ hasText: false, hasAttachments: false, hasDrawing: false })).toBe(true);
  });
});
