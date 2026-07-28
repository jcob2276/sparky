import { useState, useEffect, useCallback } from 'react';
import { Brain, RefreshCw } from 'lucide-react';
import { notify } from '../../../../lib/notify';

interface MemoryMissionProps {
  gridSize?: number; // default 3 (3x3)
  targetRounds?: number; // default 2
  onComplete: () => void;
}

export function MemoryMission({ gridSize = 3, targetRounds = 2, onComplete }: MemoryMissionProps) {
  const totalTiles = gridSize * gridSize;
  const [completedRounds, setCompletedRounds] = useState(0);
  const [pattern, setPattern] = useState<number[]>([]);
  const [selectedTiles, setSelectedTiles] = useState<number[]>([]);
  const [phase, setPhase] = useState<'showing' | 'user' | 'success' | 'failed'>('showing');

  const startNextRound = useCallback(() => {
    const tileCountToLight = 3 + completedRounds;
    const newPattern: number[] = [];
    while (newPattern.length < Math.min(tileCountToLight, totalTiles)) {
      const randIndex = Math.floor(Math.random() * totalTiles);
      if (!newPattern.includes(randIndex)) {
        newPattern.push(randIndex);
      }
    }
    setPattern(newPattern);
    setSelectedTiles([]);
    setPhase('showing');

    const timer = setTimeout(() => {
      setPhase('user');
    }, 1800);

    return () => clearTimeout(timer);
  }, [completedRounds, totalTiles]);

  useEffect(() => {
    startNextRound();
  }, [startNextRound]);

  const handleTileClick = (index: number) => {
    if (phase !== 'user') return;
    if (selectedTiles.includes(index)) return;

    const nextSelected = [...selectedTiles, index];
    setSelectedTiles(nextSelected);

    // Check correctness
    if (!pattern.includes(index)) {
      setPhase('failed');
      notify('Zła sekwencja! Spróbuj ponownie.', 'error');
      setTimeout(() => {
        startNextRound();
      }, 1200);
      return;
    }

    if (nextSelected.length === pattern.length) {
      setPhase('success');
      const nextRounds = completedRounds + 1;
      setCompletedRounds(nextRounds);

      if (nextRounds >= targetRounds) {
        notify('Gra pamięciowa ukończona!', 'success');
        onComplete();
      } else {
        notify('Dobrze! Następny poziom.', 'success');
        setTimeout(() => {
          startNextRound();
        }, 1000);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center space-y-5 bg-surface/50 backdrop-blur-md rounded-2xl border border-white/10 max-w-sm mx-auto">
      <div className="flex items-center space-x-2 text-amber-400">
        <Brain className="w-6 h-6 animate-pulse" />
        <span className="text-sm font-semibold tracking-wider uppercase">Gra Pamięciowa</span>
      </div>

      <div className="text-xs text-muted-foreground">
        Zapamiętaj kafelki ({completedRounds + 1} z {targetRounds})
      </div>

      <div className="text-sm font-medium text-foreground min-h-[24px]">
        {phase === 'showing' && <span className="text-amber-400 font-bold">Zapamiętaj podświetlone pola!</span>}
        {phase === 'user' && <span className="text-emerald-400 font-bold">Zaznacz zapamiętane pola!</span>}
        {phase === 'failed' && <span className="text-red-400 font-bold">Błąd! Resetowanie...</span>}
        {phase === 'success' && <span className="text-emerald-400 font-bold">Znakomicie!</span>}
      </div>

      <div className={`grid grid-cols-3 gap-3 w-full max-w-[260px]`}>
        {Array.from({ length: totalTiles }).map((_, idx) => {
          const isHighlighted = phase === 'showing' && pattern.includes(idx);
          const isSelected = selectedTiles.includes(idx);
          const isCorrect = isSelected && pattern.includes(idx);
          const isWrong = isSelected && !pattern.includes(idx);

          return (
            <button
              key={idx}
              onClick={() => handleTileClick(idx)}
              disabled={phase !== 'user'}
              className={`aspect-square rounded-2xl border transition-all duration-200 ${
                isHighlighted
                  ? 'bg-amber-400 border-amber-300 shadow-lg shadow-amber-400/30 scale-105'
                  : isWrong
                  ? 'bg-red-500 border-red-400'
                  : isCorrect
                  ? 'bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/30'
                  : 'bg-white/5 border-white/10 hover:bg-white/15'
              }`}
            />
          );
        })}
      </div>

      {phase === 'failed' && (
        <button
          onClick={startNextRound}
          className="flex items-center space-x-2 text-xs text-muted-foreground hover:text-foreground transition-colors pt-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Powtórz próbę</span>
        </button>
      )}
    </div>
  );
}
