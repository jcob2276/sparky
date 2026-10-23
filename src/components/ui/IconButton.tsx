import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import Button from './Button';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: ReactNode;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'tonal';
}

/** Keeps a 44x44 touch target even when callers shrink the visual size (h-8 w-8 etc.). */
const HIT_AREA =
  "relative after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']";

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, size = 'md', variant = 'ghost', className = '', ...props }, ref) => (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={`${HIT_AREA} aspect-square !min-w-0 !px-0 ${className}`}
      aria-label={label}
      title={props.title ?? label}
      {...props}
    >
      {icon}
    </Button>
  ),
);

IconButton.displayName = 'IconButton';

export default IconButton;
