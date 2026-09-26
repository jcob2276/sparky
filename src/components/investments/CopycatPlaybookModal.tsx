import { FC } from 'react';
import Button from '../ui/Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CopycatPlaybookModal: FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center p-4 bg-scrim/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-surface border border-border-custom rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-border-custom/50 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧠</span>
            <h2 className="text-lg font-bold text-text-primary tracking-tight">
              Playbook Kopiowania Insiderów (USA & GPW)
            </h2>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="rounded-lg p-1 text-text-secondary hover:text-text-primary"
          >
            ✕
          </Button>
        </div>

        <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <div className="p-3.5 rounded-xl bg-surface border border-border-custom/60">
            <h4 className="font-semibold text-text-primary flex items-center gap-2 mb-1">
              <span>⚡</span> 1. Zwracaj uwagę na opóźnienie (Days to File)
            </h4>
            <p className="text-xs">
              STOCK Act w USA daje politykom do 45 dni na zgłoszenie. Jeśli transakcja ma etykietę{' '}
              <strong className="text-success font-medium">Świeże (&lt; 14 dni)</strong>, masz realną szansę wejść w cenie zbliżonej do polityka. Jeśli minęło &gt; 30 dni — instytucje mogły już zdyskontować informację.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface border border-border-custom/60">
            <h4 className="font-semibold text-text-primary flex items-center gap-2 mb-1">
              <span>🔥</span> 2. Święty Graal: Klastry Zakupowe (Cluster Buying)
            </h4>
            <p className="text-xs">
              Jeden zakup to może być przypadek. Gdy <strong>2 lub 3 insiderów kupuje ten sam ticker</strong> w odstępie 30 dni (np. w Kongresie USA lub w zarządzie spółki GPW), statystycznie generuje to najwyższy wskaźnik alfy. Używaj filtra „🔥 Klastry”.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface border border-border-custom/60">
            <h4 className="font-semibold text-text-primary flex items-center gap-2 mb-1">
              <span>🇵🇱</span> 3. GPW vs USA: Różnica w motywacjach
            </h4>
            <p className="text-xs">
              Zgłoszenia STOCK Act opisują transakcje polityków USA. Zawiadomienia MAR na GPW dotyczą osób pełniących obowiązki zarządcze. Kwoty i nazwiska pokazujemy tylko wtedy, gdy publiczne źródło je zawiera.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface border border-border-custom/60">
            <h4 className="font-semibold text-text-primary flex items-center gap-2 mb-1">
              <span>📈</span> 4. Zawsze sprawdź aktualny wykres
            </h4>
            <p className="text-xs">
              Nigdy nie kupuj automatycznie. Przy każdej karcie masz przycisk <strong>„Wykres ↗”</strong> (TradingView dla USA, Stooq dla GPW). Jeśli kurs odjechał już o ponad 15% od ceny transakcji, poczekaj na lokalne cofnięcie.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border-custom/50 flex justify-end">
          <Button
            size="md"
            variant="primary"
            onClick={onClose}
            className="rounded-xl px-5"
          >
            Rozumiem, przejdź do radaru
          </Button>
        </div>
      </div>
    </div>
  );
};
