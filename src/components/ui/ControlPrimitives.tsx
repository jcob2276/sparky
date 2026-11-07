import {
  Children,
  forwardRef,
  isValidElement,
  useRef,
  useState,
  type ReactNode,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Check, ChevronDown } from 'lucide-react';
import Button, { type ButtonProps } from './Button';
import Sheet from './Sheet';
import { haptics } from '../../hooks/useHaptics';

const CONTROL_MOTION = 'transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-[var(--motion-fast)] ease-[var(--ease-out)] disabled:cursor-not-allowed disabled:opacity-[var(--opacity-disabled)]';

/** Semantic low-level interaction target for complex widgets.
 * Use Button for ordinary actions; Pressable exists for calendars, cards and drag handles. */
export type PressableProps = ButtonHTMLAttributes<HTMLButtonElement> & Partial<Pick<ButtonProps, 'variant' | 'size' | 'loading' | 'icon' | 'iconPosition' | 'haptic'>>;

export const Pressable = forwardRef<HTMLButtonElement, PressableProps>(
  ({ className = '', type = 'button', variant, size, loading, icon, iconPosition, haptic = 'selection', onClick, ...props }, ref) => {
    const usesButtonContract = variant !== undefined || size !== undefined || loading !== undefined || icon !== undefined || iconPosition !== undefined;
    if (usesButtonContract) {
      return <Button ref={ref} type={type} variant={variant} size={size} loading={loading} icon={icon} iconPosition={iconPosition} haptic={haptic} onClick={onClick} className={className} {...props} />;
    }
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!props.disabled && haptic !== 'none') {
        if (haptic === 'light') haptics.light();
        else if (haptic === 'medium') haptics.medium();
        else haptics.selection();
      }
      onClick?.(e);
    };
    return <button ref={ref} type={type} data-ui="pressable" onClick={handleClick} className={`ui-pressable ${CONTROL_MOTION} cursor-pointer select-none active:scale-[0.965] ${className}`} {...props} />;
  },
);
Pressable.displayName = 'Pressable';

export const ControlInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => (
    <input ref={ref} data-ui="control-input" className={`ui-control ${CONTROL_MOTION} font-inherit text-inherit outline-none ${className}`} {...props} />
  ),
);
ControlInput.displayName = 'ControlInput';

interface SelectOption { value: string; label: string; disabled: boolean }

function collectOptions(children: ReactNode): SelectOption[] {
  const out: SelectOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement<{ value?: unknown; disabled?: boolean; children?: ReactNode }>(child)) return;
    if (child.type === 'option') {
      const label = Children.toArray(child.props.children).join('');
      out.push({ value: String(child.props.value ?? label), label, disabled: Boolean(child.props.disabled) });
    } else if (child.props.children) {
      out.push(...collectOptions(child.props.children));
    }
  });
  return out;
}

/**
 * Select w stylu aplikacji: zamiast natywnego okna systemowego otwiera arkusz wewnątrz aplikacji.
 * Natywny <select> zostaje w DOM (ukryty wizualnie) jako źródło wartości, formularzy i testów.
 */
export const ControlSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = '', children, value, defaultValue, disabled, multiple, ...props }, ref) => {
    const [open, setOpen] = useState(false);
    const [internal, setInternal] = useState(defaultValue === undefined ? undefined : String(defaultValue));
    const nativeRef = useRef<HTMLSelectElement | null>(null);
    const setRefs = (node: HTMLSelectElement | null) => {
      nativeRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    };
    const options = collectOptions(children);
    const current = value !== undefined ? String(value) : (internal ?? options[0]?.value ?? '');
    const currentLabel = options.find((option) => option.value === current)?.label ?? '';

    if (multiple) {
      return <select ref={ref} data-ui="control-select" multiple disabled={disabled} value={value} defaultValue={defaultValue} className={`ui-control ${CONTROL_MOTION} font-inherit text-inherit outline-none ${className}`} {...props}>{children}</select>;
    }

    const pick = (next: string) => {
      setOpen(false);
      const node = nativeRef.current;
      if (!node || next === current) return;
      setInternal(next);
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
      setter?.call(node, next);
      node.dispatchEvent(new Event('change', { bubbles: true }));
    };

    return (
      <>
        <div
          role="presentation"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled || undefined}
          data-ui="control-select-trigger"
          onClick={() => { if (disabled) return; haptics.light(); setOpen(true); }}
          onKeyDown={(event) => { if (!disabled && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setOpen(true); } }}
          className={`ui-control ${CONTROL_MOTION} flex cursor-pointer items-center justify-between gap-2 text-left font-inherit text-inherit outline-none ${disabled ? 'opacity-[var(--opacity-disabled)]' : ''} ${className}`}
        >
          <span data-text={currentLabel} className="min-w-0 flex-1 truncate before:content-[attr(data-text)]" />
          <ChevronDown size={14} className="shrink-0 opacity-60" />
        </div>
        <select ref={setRefs} data-ui="control-select" tabIndex={-1} disabled={disabled} value={value} defaultValue={defaultValue} className="sr-only" {...props}>{children}</select>
        <Sheet open={open} onOpenChange={setOpen} side="bottom" compact title={props['aria-label'] ?? 'Wybierz'}>
          <div role="listbox" className="-mx-2 flex flex-col">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === current}
                disabled={option.disabled}
                onClick={() => pick(option.value)}
                className={`flex min-h-12 items-center justify-between gap-3 rounded-xl px-3 text-left text-base disabled:opacity-40 ${option.value === current ? 'bg-primary/10 font-semibold text-primary' : 'text-text-primary hover:bg-surface-2'}`}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {option.value === current ? <Check size={18} className="shrink-0" /> : null}
              </button>
            ))}
          </div>
        </Sheet>
      </>
    );
  },
);
ControlSelect.displayName = 'ControlSelect';

export const ControlTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = '', ...props }, ref) => (
    <textarea ref={ref} data-ui="control-textarea" className={`ui-control ${CONTROL_MOTION} font-inherit text-inherit outline-none ${className}`} {...props} />
  ),
);
ControlTextarea.displayName = 'ControlTextarea';
