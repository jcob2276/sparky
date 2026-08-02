import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

type InputSize = 'sm' | 'md' | 'lg';

type InputOwnProps = {
  size?: InputSize;
  icon?: ReactNode;
  error?: string;
  label?: ReactNode;
};

type InputProps = InputOwnProps & Omit<InputHTMLAttributes<HTMLInputElement>, keyof InputOwnProps>;

const SIZE_CLASSES: Record<InputSize, string> = {
  sm: 'h-[var(--control-sm)] px-[var(--space-3)] text-sm',
  md: 'h-[var(--control-md)] px-[var(--space-4)] text-base',
  lg: 'h-[var(--control-lg)] px-[var(--space-4)] text-base',
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ size = 'md', icon, error, label, className = '', disabled, id, 'aria-describedby': describedBy, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? `input-${generatedId}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const descriptionIds = [describedBy, errorId].filter(Boolean).join(' ') || undefined;
    return (
      <div className="block w-full">
        {label ? <label htmlFor={inputId} className="mb-1 block text-xs font-semibold text-text-secondary">{label}</label> : null}
        <div className="relative w-full">
          {icon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/50">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            data-ui="input"
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={descriptionIds}
            className={`ui-control ui-input w-full font-medium text-text-primary outline-none placeholder:text-text-muted/40 ${
              icon ? 'pl-9' : ''
            } ${SIZE_CLASSES[size]} ${
              error
                ? 'ui-control--error border-danger/50'
                : 'border-border-custom/60'
            } ${disabled ? 'cursor-not-allowed opacity-[var(--opacity-disabled)]' : ''} ${className}`}
            {...props}
          />
        </div>
        {error && (
          <p id={errorId} className="mt-1 text-xs text-danger font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
