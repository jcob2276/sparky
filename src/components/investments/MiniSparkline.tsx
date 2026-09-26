import { FC, useId } from 'react';

interface Props {
  data?: number[];
  width?: number;
  height?: number;
  className?: string;
}

export const MiniSparkline: FC<Props> = ({
  data,
  width = 64,
  height = 24,
  className = '',
}) => {
  const gradientId = useId();

  if (!data || data.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={`overflow-visible ${className}`}
        aria-hidden="true"
      >
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeDasharray="2 2"
          className="text-text-muted/40"
        />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const paddingY = 3;
  const drawHeight = height - paddingY * 2;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = paddingY + drawHeight - ((val - min) / range) * drawHeight;
    return { x, y };
  });

  const pathD = points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const isUp = data[data.length - 1] >= data[0];
  const strokeClass = isUp ? 'stroke-success' : 'stroke-danger';
  const fillGradient = isUp ? 'var(--color-success)' : 'var(--color-danger)';

  // Area fill path
  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`overflow-visible ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillGradient} stopOpacity="0.25" />
          <stop offset="100%" stopColor={fillGradient} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradientId})`} />
      <path
        d={pathD}
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={strokeClass}
      />
    </svg>
  );
};
