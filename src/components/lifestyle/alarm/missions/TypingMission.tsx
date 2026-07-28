import { useState } from 'react';
import { Type, Sparkles } from 'lucide-react';
import { notify } from '../../../../lib/notify';

interface TypingMissionProps {
  typingPhrase?: string;
  onComplete: () => void;
}

const DEFAULT_PHRASES = [
  'Wstaję z energią i zdobywam ten dzień!',
  'Każdy poranek to nowa szansa na sukces.',
  'Mój umysł jest wypoczęty, jasny i gotowy do działania.'
];

export function TypingMission({ typingPhrase, onComplete }: TypingMissionProps) {
  const [targetText] = useState(() => typingPhrase || DEFAULT_PHRASES[Math.floor(Math.random() * DEFAULT_PHRASES.length)]);
  const [typedText, setTypedText] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTypedText(val);

    if (val.trim() === targetText.trim()) {
      notify('Afirmacja wpisana poprawnie!', 'success');
      onComplete();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center space-y-5 bg-surface/50 backdrop-blur-md rounded-2xl border border-white/10 max-w-sm mx-auto">
      <div className="flex items-center space-x-2 text-indigo-400">
        <Sparkles className="w-6 h-6 animate-pulse" />
        <span className="text-sm font-semibold tracking-wider uppercase">Poranna Afirmacja</span>
      </div>

      <div className="text-xs text-muted-foreground">
        Przepisz poniższe zdanie, aby wyłączyć budzik:
      </div>

      <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-foreground font-medium text-sm leading-relaxed text-left">
        "{targetText}"
      </div>

      <div className="w-full space-y-2">
        <input
          type="text"
          value={typedText}
          onChange={handleChange}
          placeholder="Wpisz tekst dokładnie tutaj..."
          autoFocus
          className="w-full px-4 py-3 bg-black/40 border border-white/15 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-400"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>Dopasowanie:</span>
          <span className={typedText === targetText ? 'text-emerald-400 font-bold' : 'text-indigo-300'}>
            {typedText.length} / {targetText.length} znaków
          </span>
        </div>
      </div>
    </div>
  );
}
