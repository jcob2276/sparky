import React from 'react';
import { Sparkles } from 'lucide-react';

export default function WeeklyReviewSuccess() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 animate-fadeIn">
      <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl shadow-lg shadow-[var(--shadow-glow-primary)]/5">
        <Sparkles />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-text-primary">
          System oczyszczony!
        </h2>
        <p className="text-sm text-text-muted">
          Twój Tygodniowy Przegląd Zadań został zakończony. Masz teraz pełną jasność umysłu oraz zdefiniowane prognozy.
        </p>
      </div>
    </div>
  );
}
