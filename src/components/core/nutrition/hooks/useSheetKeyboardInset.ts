import { useEffect, type RefObject } from 'react';

/** Keeps a bottom sheet above the virtual keyboard on mobile. */
export function useSheetKeyboardInset(sheetRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const el = sheetRef.current;
      if (!el) return;
      // On desktop / tablet (sm+), modal is vertically centered. Don't push with bottom margin.
      if (window.innerWidth >= 640) {
        el.style.marginBottom = '';
        el.style.maxHeight = '';
        return;
      }
      const keyboardOpen = vv.height < window.innerHeight * 0.85;
      const offsetBottom = keyboardOpen ? Math.max(0, window.innerHeight - vv.offsetTop - vv.height) : 0;
      el.style.marginBottom = offsetBottom > 0 ? `${offsetBottom}px` : '';
      el.style.maxHeight = `${Math.floor(vv.height * 0.94)}px`;
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); };
  }, [sheetRef]);
}
