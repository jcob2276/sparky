import { useState, useEffect, useCallback } from 'react';
import { Calculator, CheckCircle2 } from 'lucide-react';
import type { MathDifficulty } from '../../../../types/alarm';
import { notify } from '../../../../lib/notify';

interface MathMissionProps {
  difficulty?: MathDifficulty;
  totalQuestions?: number;
  onComplete: () => void;
}

interface Problem {
  expression: string;
  answer: number;
}

function generateProblem(diff: MathDifficulty = 'medium'): Problem {
  if (diff === 'easy') {
    const a = Math.floor(Math.random() * 30) + 10;
    const b = Math.floor(Math.random() * 30) + 5;
    const op = Math.random() > 0.5 ? '+' : '-';
    const ans = op === '+' ? a + b : a - b;
    return { expression: `${a} ${op} ${b}`, answer: ans };
  } else if (diff === 'hard') {
    const a = Math.floor(Math.random() * 15) + 6;
    const b = Math.floor(Math.random() * 12) + 4;
    const c = Math.floor(Math.random() * 50) + 10;
    return { expression: `(${a} × ${b}) + ${c}`, answer: a * b + c };
  } else {
    // medium
    const a = Math.floor(Math.random() * 12) + 3;
    const b = Math.floor(Math.random() * 12) + 3;
    return { expression: `${a} × ${b}`, answer: a * b };
  }
}

export function MathMission({ difficulty = 'medium', totalQuestions = 3, onComplete }: MathMissionProps) {
  const [solvedCount, setSolvedCount] = useState(0);
  const [currentProblem, setCurrentProblem] = useState<Problem>(() => generateProblem(difficulty));
  const [inputVal, setInputVal] = useState('');
  const [isError, setIsError] = useState(false);

  const nextProblem = useCallback(() => {
    setCurrentProblem(generateProblem(difficulty));
    setInputVal('');
    setIsError(false);
  }, [difficulty]);

  useEffect(() => {
    nextProblem();
  }, [nextProblem]);

  const handleDigit = (digit: string) => {
    if (inputVal.length >= 6) return;
    setInputVal((prev) => prev + digit);
    setIsError(false);
  };

  const handleBackspace = () => {
    setInputVal((prev) => prev.slice(0, -1));
  };

  const handleSubmit = () => {
    const parsed = parseInt(inputVal, 10);
    if (isNaN(parsed)) return;

    if (parsed === currentProblem.answer) {
      const nextSolved = solvedCount + 1;
      setSolvedCount(nextSolved);
      if (nextSolved >= totalQuestions) {
        onComplete();
      } else {
        notify('Poprawna odpowiedź! Następne zadanie.', 'success');
        nextProblem();
      }
    } else {
      setIsError(true);
      notify('Błędna odpowiedź, spróbuj ponownie!', 'error');
      setInputVal('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center space-y-5 bg-surface/50 backdrop-blur-md rounded-2xl border border-white/10 max-w-sm mx-auto">
      <div className="flex items-center space-x-2 text-primary">
        <Calculator className="w-6 h-6" />
        <span className="text-sm font-semibold tracking-wider uppercase">Zadanie Matematyczne</span>
      </div>

      <div className="text-xs text-muted-foreground">
        Rozwiąż zadanie ({solvedCount + 1} z {totalQuestions})
      </div>

      <div className="text-3xl font-black text-foreground tracking-tight py-3 px-6 bg-black/40 rounded-xl border border-white/10 w-full min-h-[64px] flex items-center justify-center">
        {currentProblem.expression} = ?
      </div>

      <div
        className={`w-full text-2xl font-bold py-2 rounded-lg border text-center transition-colors ${
          isError
            ? 'border-red-500/50 bg-red-500/10 text-red-400'
            : 'border-primary/30 bg-primary/5 text-primary'
        }`}
      >
        {inputVal || <span className="opacity-30">Odpowiedź...</span>}
      </div>

      <div className="grid grid-cols-3 gap-2 w-full">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '0'].map((btn) => (
          <button
            key={btn}
            onClick={() => handleDigit(btn)}
            className="py-3 bg-white/5 hover:bg-white/15 text-foreground font-semibold rounded-xl text-lg border border-white/10 active:scale-95 transition-all"
          >
            {btn}
          </button>
        ))}
        <button
          onClick={handleBackspace}
          className="py-3 bg-white/5 hover:bg-white/15 text-muted-foreground font-semibold rounded-xl text-sm border border-white/10 active:scale-95 transition-all"
        >
          ⌫
        </button>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!inputVal}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-white font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-98"
      >
        <CheckCircle2 className="w-5 h-5" />
        <span>Sprawdź odpowiedź</span>
      </button>
    </div>
  );
}
