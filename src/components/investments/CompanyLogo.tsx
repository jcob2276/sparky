import { FC, useState } from 'react';

interface Props {
  ticker: string;
  name?: string;
  size?: number;
  className?: string;
}

const FAILED_SYMBOLS = new Set<string>();

export const CompanyLogo: FC<Props> = ({
  ticker,
  name,
  size = 32,
  className = '',
}) => {
  const clean = (ticker || '').replace(/[$]/g, '').trim().toUpperCase();
  const isValidSymbol = Boolean(clean && clean !== '—' && clean !== '-' && !clean.includes(' '));
  const symbol = clean.replace(/\//g, '-');

  const [sourceIdx, setSourceIdx] = useState(0);
  const [hasError, setHasError] = useState(() => !isValidSymbol || FAILED_SYMBOLS.has(symbol));

  const sources = [
    `https://api.elbstream.com/logos/symbol/${symbol}?format=png`,
    `https://financialmodelingprep.com/image-stock/${symbol}.png`,
  ];

  const handleImgError = () => {
    if (sourceIdx + 1 < sources.length) {
      setSourceIdx((prev) => prev + 1);
    } else {
      FAILED_SYMBOLS.add(symbol);
      setHasError(true);
    }
  };

  const showImg = isValidSymbol && !hasError && sourceIdx < sources.length;

  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`rounded-xl bg-surface border border-border-custom/60 flex items-center justify-center overflow-hidden shrink-0 shadow-xs ${className}`}
      title={name || clean}
    >
      {showImg ? (
        <img
          src={sources[sourceIdx]}
          alt={name || clean}
          width={size}
          height={size}
          loading="lazy"
          onError={handleImgError}
          className="w-full h-full object-contain p-0.5"
        />
      ) : (
        <span className="font-mono text-2xs font-extrabold text-text-primary tracking-wider select-none">
          {clean && clean !== '—' ? clean.slice(0, 3) : '•'}
        </span>
      )}
    </div>
  );
};
