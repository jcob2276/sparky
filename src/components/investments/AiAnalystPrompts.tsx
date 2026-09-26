import { FC } from 'react';

interface Props {
  onSelectPrompt: (prompt: string) => void;
}

const PRESET_QUESTIONS = [
  {
    title: 'Rosnące przychody, niski C/Z',
    prompt: 'Pokaż spółki z GPW, którym przychody rosną ponad 10% r/r, a C/Z jest poniżej 10. Pomiń mikrospółki.',
    tag: 'Fundamenty GPW',
  },
  {
    title: 'Insiderzy w bankach',
    prompt: 'Co robili insiderzy w bankach i instytucjach finansowych (PKO, Pekao, Alior, Santander) w ostatnim czasie?',
    tag: 'GPW MAR',
  },
  {
    title: 'Porównaj Dino i Żabkę',
    prompt: 'Porównaj Dino Polska i Żabkę: wyniki, marże, pozycje krótkie KNF i wycenę.',
    tag: 'GPW Duopol',
  },
  {
    title: 'Co kupuje Nancy Pelosi?',
    prompt: 'Jakie publiczne zgłoszenia STOCK Act złożyła Nancy Pelosi? Podaj ticker, datę, typ i przedział kwoty ze źródła, bez domysłów.',
    tag: 'STOCK Act',
  },
  {
    title: 'Najsilniejsza Zbieżność (Top Consensus)',
    prompt: 'Które spółki z USA i GPW mają obecnie najsilniejszą zbieżność zakupów między funduszami 13F a politykami?',
    tag: 'Sygnał 10/10',
  },
  {
    title: 'Szorty KNF: Dino, CD Projekt, Allegro',
    prompt: 'Kto szortuje Dino Polska, CD Projekt i Allegro na GPW? Jaka jest łączna pozycja krótka funduszy takich jak AQR czy Marshall Wace?',
    tag: 'KNF Rejestr',
  },
];

export const AiAnalystPrompts: FC<Props> = ({ onSelectPrompt }) => {
  return (
    <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-surface border border-border-custom shadow-xs space-y-3">
      <div>
        <h3 className="text-sm sm:text-base font-bold text-text-primary flex items-center gap-2">
          <span>💡</span> O co zapytać Analityka AI?
        </h3>
        <p className="text-3xs sm:text-xs text-text-secondary mt-0.5">
          Odpowiada na podstawie danych 13F, transakcji Kongresu USA, szortów KNF oraz raportów GPW.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {PRESET_QUESTIONS.map((q) => (
          <div
            key={q.title}
            role="button"
            tabIndex={0}
            onClick={() => onSelectPrompt(q.prompt)}
            onKeyDown={(e) => e.key === 'Enter' && onSelectPrompt(q.prompt)}
            className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-surface border border-border-custom/70 hover:border-primary/50 transition-all flex flex-col justify-between gap-2 shadow-2xs group cursor-pointer active:scale-98"
          >
            <div>
              <div className="flex items-center justify-between gap-1.5 mb-1">
                <span className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors">
                  {q.title}
                </span>
                <span className="px-1.5 py-0.2 rounded-md text-3xs font-mono font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
                  {q.tag}
                </span>
              </div>
              <p className="text-3xs sm:text-xs text-text-secondary leading-relaxed line-clamp-2 sm:line-clamp-3">
                {q.prompt}
              </p>
            </div>
            <div className="text-3xs font-mono font-semibold text-primary group-hover:underline flex items-center gap-1">
              <span>Zapytaj</span>
              <span>→</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
