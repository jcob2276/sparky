import { useRef, type KeyboardEvent } from 'react';
import { useHaptics } from '../../hooks/useHaptics';
import { Pressable } from './ControlPrimitives';

export type RatingTone = 'critical' | 'warning' | 'neutral' | 'info' | 'success';

export interface RatingOption {
  value: number;
  label: string;
  tone: RatingTone;
}

export interface DiscreteRatingProps {
  label: string;
  value: number;
  max: number;
  options: readonly RatingOption[];
  onChange: (value: number) => void;
  description?: string;
}

function nextRatingIndex(key: string, current: number, length: number) {
  if (key === 'Home') return 0;
  if (key === 'End') return length - 1;
  if (key === 'ArrowRight' || key === 'ArrowDown') return Math.min(current + 1, length - 1);
  if (key === 'ArrowLeft' || key === 'ArrowUp') return Math.max(current - 1, 0);
  return current;
}

export default function DiscreteRating({
  label,
  value,
  max,
  options,
  onChange,
  description,
}: DiscreteRatingProps) {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const { selection } = useHaptics();
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));

  const select = (nextValue: number) => {
    if (nextValue === value) return;
    selection();
    onChange(nextValue);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = nextRatingIndex(event.key, index, options.length);
    if (next === index) return;
    event.preventDefault();
    const nextOption = options[next];
    if (!nextOption) return;
    select(nextOption.value);
    optionRefs.current[next]?.focus();
  };

  return (
    <section className="ui-rating" data-ui="discrete-rating">
      <div className="ui-rating__header">
        <span className="ui-rating__label">{label}</span>
        <span className="ui-rating__value">{value}/{max}</span>
      </div>
      <div
        role="radiogroup"
        aria-label={label}
        className={`ui-rating__options ${options.length > 5 ? 'ui-rating__options--dense' : ''}`}
      >
        {options.map((option, index) => {
          const selected = option.value === value;
          const descriptiveLabel = option.label === String(option.value)
            ? `${label}: ${option.value} z ${max}`
            : `${label}: ${option.label}, ${option.value} z ${max}`;
          return (
            <Pressable
              key={option.value}
              ref={(node) => { optionRefs.current[index] = node; }}
              role="radio"
              aria-checked={selected}
              aria-label={descriptiveLabel}
              tabIndex={index === selectedIndex ? 0 : -1}
              data-tone={option.tone}
              className="ui-rating-option"
              onClick={() => select(option.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              <span className="ui-rating-option__value">{option.value}</span>
              {option.label !== String(option.value) && (
                <span className="ui-rating-option__label">{option.label}</span>
              )}
            </Pressable>
          );
        })}
      </div>
      {description && <p className="ui-rating__description">{description}</p>}
    </section>
  );
}
