import React, { forwardRef } from 'react';
import Spinner from './Spinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'tonal';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  children,
  className = '',
  disabled,
  type = 'button',
  ...props
}, ref) {
  const baseClass = 'ui-button inline-flex items-center justify-center font-semibold touch-manipulation disabled:pointer-events-none cursor-pointer focus-visible:outline-none';

  const sizeClasses = {
    sm: 'ui-button--sm px-3.5 text-xs gap-1.5',
    md: 'ui-button--md px-4 text-sm gap-2',
    lg: 'ui-button--lg px-5 text-base gap-2.5',
  };

  const variantClasses = {
    primary: 'ui-button--primary bg-primary text-on-accent',
    secondary: 'ui-button--secondary bg-surface-3 text-primary',
    outline: 'ui-button--outline bg-transparent text-primary',
    ghost: 'ui-button--ghost bg-transparent text-primary',
    danger: 'ui-button--danger bg-danger text-on-accent',
    tonal: 'ui-button--tonal bg-primary/10 text-primary',
  };

  return (
    <button
      ref={ref}
      type={type}
      {...props}
      data-ui="button"
      data-variant={variant}
      data-size={size}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={`${baseClass} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {loading && <Spinner size="sm" className="shrink-0" />}
      {!loading && icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
      {children}
      {!loading && icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
