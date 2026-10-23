import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { haptics } from '../../../hooks/useHaptics';

const STAGES = ['Analizuję zdjęcie', 'Rozpoznaję składniki', 'Szacuję porcje', 'Liczę makroskładniki'];
const STAGE_MS = 1600;

/** Full-screen scan animation shown over the captured photo while the meal is analysed. */
export default function MealScanOverlay({ file }: { file: File }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  const [stage, setStage] = useState(0);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  useEffect(() => {
    void haptics.medium();
    const tick = window.setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
      void haptics.selection();
    }, STAGE_MS);
    return () => window.clearInterval(tick);
  }, []);

  return createPortal(
    <div className="meal-scan" role="status" aria-live="polite" aria-label={STAGES[stage]}>
      <div className="meal-scan__frame">
        <img src={url} alt="" className="meal-scan__photo" />
        <div className="meal-scan__tint" aria-hidden="true" />
        <div className="meal-scan__beam" aria-hidden="true" />
        <span className="meal-scan__corner meal-scan__corner--tl" aria-hidden="true" />
        <span className="meal-scan__corner meal-scan__corner--tr" aria-hidden="true" />
        <span className="meal-scan__corner meal-scan__corner--bl" aria-hidden="true" />
        <span className="meal-scan__corner meal-scan__corner--br" aria-hidden="true" />
      </div>
      <p key={stage} className="meal-scan__status">{STAGES[stage]}</p>
      <div className="meal-scan__dots" aria-hidden="true"><i /><i /><i /></div>
    </div>,
    document.body,
  );
}
