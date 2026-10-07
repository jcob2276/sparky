import { useState, type FocusEvent } from 'react';

function isEntryField(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

/** Free up the small viewport during entry, including keyboards that resize the WebView. */
export function useWorkoutEntryFocus() {
  const [isEnteringData, setIsEnteringData] = useState(false);
  return {
    isEnteringData,
    onFocusCapture: (event: FocusEvent<HTMLElement>) => {
      if (isEntryField(event.target)) setIsEnteringData(true);
    },
    onBlurCapture: (event: FocusEvent<HTMLElement>) => {
      if (!isEntryField(event.relatedTarget)) setIsEnteringData(false);
    },
    finishEntry: () => {
      const active = document.activeElement;
      if (active instanceof HTMLElement) active.blur();
      setIsEnteringData(false);
    },
  };
}
