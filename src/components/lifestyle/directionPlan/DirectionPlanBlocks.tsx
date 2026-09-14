import { Sparkles, AlertTriangle, MessageSquareQuote } from 'lucide-react';
import Spinner from '../../ui/Spinner';

type Phase1Recap = { narrative: string; longterm_motif: string | null; question: string };

export function Block1Narrative({ phase1, phase1Loading }: { phase1: Phase1Recap | null; phase1Loading: boolean }) {
  return (
    <div className="rounded-2xl border border-primary/25 bg-gradient-to-b from-surface via-surface to-primary/[0.03] p-4 md:p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-custom/50 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Sparkles size={15} />
          </div>
          <div>
            <h3 className="text-2xs font-black uppercase tracking-[var(--ds-arbitrary-0-2em)] text-primary">
              Vanguard Intelligence · Zoom-out Tygodnia
            </h3>
            <p className="text-3xs font-semibold text-text-muted">
              Synteza zachowań, telemetrii i autentycznego głosu
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-3xs font-bold text-text-muted">
          <span className="rounded-full border border-border-custom bg-surface px-2 py-0.5">🎙️ Głosówki</span>
          <span className="rounded-full border border-border-custom bg-surface px-2 py-0.5">📱 Czas ekranu & No-Drift</span>
          <span className="rounded-full border border-border-custom bg-surface px-2 py-0.5">🌙 Rytm snu Oura</span>
          <span className="rounded-full border border-border-custom bg-surface px-2 py-0.5">🎯 PowerList & BHAG</span>
        </div>
      </div>

      {phase1Loading && (
        <div className="flex items-center gap-3 py-6 justify-center text-text-muted text-sm animate-pulse">
          <Spinner size="sm" />
          <span>Vanguard AI krzyżuje telemetrię, głosówki i historię Power Listy…</span>
        </div>
      )}

      {phase1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-2xs font-black uppercase tracking-wider text-text-muted">
              Jak wyglądał twój tydzień
            </p>
            <p className="text-sm leading-relaxed text-text-primary tracking-normal font-sans">
              {phase1.narrative}
            </p>
          </div>

          {phase1.longterm_motif && (
            <div className="rounded-xl border border-warning/30 bg-warning/[0.06] p-3.5 space-y-1.5 animate-fadeIn">
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle size={14} />
                <p className="text-2xs font-black uppercase tracking-wider">
                  Długoterminowy motyw / Zawieszony wzorzec
                </p>
              </div>
              <p className="text-xs md:text-sm text-text-primary leading-relaxed pl-5">
                {phase1.longterm_motif}
              </p>
            </div>
          )}

          {phase1.question && (
            <div className="rounded-xl border border-primary/30 bg-primary/[0.05] p-3.5 md:p-4 space-y-1.5 animate-fadeIn">
              <div className="flex items-center gap-2 text-primary">
                <MessageSquareQuote size={15} />
                <p className="text-2xs font-black uppercase tracking-wider">
                  Pytanie otwierające refleksję
                </p>
              </div>
              <p className="text-sm text-text-primary font-medium italic leading-relaxed pl-6">
                „{phase1.question}”
              </p>
            </div>
          )}
        </div>
      )}

      {!phase1Loading && !phase1 && (
        <p className="text-sm text-text-muted italic py-2 text-center">
          AI podsumowanie pojawi się za chwilę…
        </p>
      )}
    </div>
  );
}
