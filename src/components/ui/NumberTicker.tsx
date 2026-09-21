import { useMemo } from 'react';

export interface NumberTickerProps {
  /** The value to display — accepts formatted strings (e.g. "01:30", "120 kg") or numbers */
  value: number | string;
  className?: string;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * NumberTicker — High-fidelity physical digit roller inspired by Apple Watch / Emil Kowalski / Motion Primitives.
 * Smoothly rolls digits vertically on the GPU compositor using spring bezier curves.
 */
export default function NumberTicker({ value, className = '' }: NumberTickerProps) {
  const chars = useMemo(() => String(value).split(''), [value]);

  return (
    <span
      className={`inline-flex items-baseline tabular-nums font-mono select-none ${className}`}
      aria-label={String(value)}
    >
      {chars.map((char, i) => {
        const isDigit = char >= '0' && char <= '9';
        if (!isDigit) {
          return (
            <span key={`char-${i}`} className="inline-block">
              {char}
            </span>
          );
        }

        const digit = parseInt(char, 10);

        return (
          <span
            key={`col-${i}`}
            aria-hidden="true"
            className="inline-block relative overflow-hidden h-[1em] leading-[1em] align-baseline"
          >
            <span
              className="inline-flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.35,1)] will-change-transform motion-reduce:transition-none"
              style={{
                transform: `translateY(-${digit * 10}%)`,
              }}
            >
              {DIGITS.map((d) => (
                <span
                  key={d}
                  className="h-[1em] leading-[1em] flex items-center justify-center"
                >
                  {d}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
