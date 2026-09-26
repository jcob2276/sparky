import { useEffect, useRef } from 'react';

/**
 * useModalBackHandler — Zapewnia natywną obsługę gestu/przycisku 'Wstecz' na telefonie
 * dla modali, drawerów i wysuwanych paneli.
 *
 * Gdy modal się otwiera, dodaje wpis do historii przeglądarki.
 * Gdy użytkownik cofnie na telefonie (Android Back gesture / swipe back),
 * modal się zamyka zamiast wychodzić z całej aplikacji.
 */
export function useModalBackHandler(modalKey: string, isOpen: boolean, onClose: () => void): void {
  const isPushedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      if (isPushedRef.current) {
        isPushedRef.current = false;
        if (window.history.state?.modal === modalKey) {
          window.history.back();
        }
      }
      return;
    }

    // Modal został otwarty — wypychamy stan do historii
    window.history.pushState({ modal: modalKey }, '');
    isPushedRef.current = true;

    const handlePopState = () => {
      if (isPushedRef.current) {
        isPushedRef.current = false;
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState, { once: true });

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (isPushedRef.current && window.history.state?.modal === modalKey) {
        isPushedRef.current = false;
        window.history.back();
      }
    };
  }, [isOpen, modalKey, onClose]);
}
