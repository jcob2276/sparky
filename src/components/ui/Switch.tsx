import type { InputHTMLAttributes } from 'react';

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'role' | 'children'> {
  label: string;
}

/** Przełącznik włącz/wyłącz z etykietą (rola `switch`). Pigułki `ToggleChip` służą filtrom, a to ustawieniu jednej opcji. */
export function Switch({ label, className = '', ...props }: SwitchProps) {
  return (
    <label className={`inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm text-text-secondary ${className}`}>
      <span className="relative inline-flex h-6 w-10 shrink-0">
        <input
          type="checkbox"
          role="switch"
          className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-full bg-surface-3 transition-colors duration-[var(--motion-fast)] checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-[var(--opacity-60)]"
          {...props}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-background shadow-sm transition-transform duration-[var(--motion-fast)] peer-checked:translate-x-4"
        />
      </span>
      {label}
    </label>
  );
}
