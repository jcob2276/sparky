import type { FC } from 'react';
import { ShieldCheck } from 'lucide-react';

export const CompanyPiotroskiCard: FC<{ ticker: string }> = ({ ticker }) => (
  <section className="bg-surface-elevated border border-border-custom rounded-2xl p-4 sm:p-5 space-y-2">
    <h3 className="text-xs sm:text-sm font-bold text-text-primary flex items-center gap-2">
      <ShieldCheck size={18} /> Piotroski F-Score · {ticker}
    </h3>
    <p className="text-xs text-text-secondary">Brak zweryfikowanych danych do obliczenia wyniku.</p>
    <p className="text-3xs text-text-muted leading-relaxed">
      Wymagane są porównywalne dane z raportów rocznych: zysk, aktywa, przepływy operacyjne,
      zadłużenie, płynność, emisje akcji, marża brutto i rotacja aktywów.
      Ocena Piotroskiego oraz ranking Magic Formula pozostają niedostępne do czasu podłączenia tych danych.
    </p>
  </section>
);
