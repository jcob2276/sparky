interface NoteDiscardState {
  hasText: boolean;
  hasAttachments: boolean;
  hasDrawing: boolean;
}

export const shouldDiscardEmptyNote = (state: NoteDiscardState): boolean => (
  !state.hasText && !state.hasAttachments && !state.hasDrawing
);
