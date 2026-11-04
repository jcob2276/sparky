interface Props {
  width: number;
  bounds: { min: number; max: number; default: number };
  onStart: (event: React.PointerEvent<HTMLDivElement>) => void;
  onCommit: (width: number) => void;
}

/** Uchwyt do zmiany szerokości listy notatek: przeciąganie, strzałki, dwuklik przywraca domyślną. */
export default function SplitListResizer({ width, bounds, onStart, onCommit }: Props) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Zmień szerokość listy notatek"
      aria-valuenow={width}
      aria-valuemin={bounds.min}
      aria-valuemax={bounds.max}
      tabIndex={0}
      className="keep-split-resizer"
      onPointerDown={onStart}
      onDoubleClick={() => onCommit(bounds.default)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); onCommit(width - 24); }
        if (event.key === 'ArrowRight') { event.preventDefault(); onCommit(width + 24); }
      }}
    />
  );
}
