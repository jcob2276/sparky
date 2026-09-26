import { FC } from 'react';
import Button from '../ui/Button';

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
    <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-4">
      <div>
        <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
          <span>💡</span> O co zapytać Analityka AI?
        </h3>
        <p className="text-xs text-text-secondary mt-1">
          Odpowiada na podstawie danych 13F, transakcji Kongresu USA, szortów KNF oraz raportów GPW.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {PRESET_QUESTIONS.map((q) => (
          <div
            key={q.title}
            onClick={() => onSelectPrompt(q.prompt)}
            className="p-4 rounded-2xl bg-surface border border-border-custom/70 hover:border-primary/50 transition-all flex flex-col justify-between gap-3 shadow-xs group cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors">
                  {q.title}
                </span>
                <span className="px-2 py-0.5 rounded-md text-3xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                  {q.tag}
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
                {q.prompt}
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onSelectPrompt(q.prompt)}
              className="w-full text-xs font-semibold rounded-xl"
            >
              Zapytaj →
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
