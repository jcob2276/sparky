import { Pressable } from './ControlPrimitives';

/** Przezroczysta warstwa za otwartym popoverem: klik poza menu je zamyka. Warstwę (z-index) i tło ustawia wywołujący. */
export default function PopoverScrim({
  onClick,
  label,
  className = '',
}: {
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return <Pressable type="button" className={`fixed inset-0 ${className}`} onClick={onClick} aria-label={label} />;
}
