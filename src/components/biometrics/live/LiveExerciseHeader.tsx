import { ArrowDown, ArrowUp, ChevronDown, MoreHorizontal } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import ExerciseThumb from '../workout/ExerciseThumb';
import LiveExerciseMenu from './LiveExerciseMenu';

interface Props {
  name: string;
  subtitle: string;
  active: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isBarbell: boolean;
  menuOpen: boolean;
  onActivate: () => void;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onWarmup: () => void;
  onPlates: () => void;
  onRemoveSet: () => void;
  onSwap?: () => void;
  onRemove: () => void;
}

export default function LiveExerciseHeader({
  name,
  subtitle,
  active,
  canMoveUp,
  canMoveDown,
  isBarbell,
  menuOpen,
  onActivate,
  onToggleMenu,
  onCloseMenu,
  onMoveUp,
  onMoveDown,
  onWarmup,
  onPlates,
  onRemoveSet,
  onSwap,
  onRemove,
}: Props) {
  return (
    <div className="flex items-center gap-2 p-3">
      <Pressable
        onClick={onActivate}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        aria-expanded={active}
        aria-label={`${name}, ${subtitle}`}
      >
        <ExerciseThumb name={name} size={active ? 'lg' : 'md'} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-bold leading-tight text-text-primary">{name}</span>
          <span className="block truncate text-xs font-medium text-text-muted">{subtitle}</span>
        </span>
      </Pressable>

      <div className="flex items-center gap-1 shrink-0">
        {(canMoveUp || canMoveDown) && (
          <div className="flex items-center rounded-full bg-surface-2 p-0.5">
            <Pressable
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp?.();
              }}
              disabled={!canMoveUp}
              aria-label={`Przesuń ${name} w górę`}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                canMoveUp
                  ? 'text-text-secondary hover:bg-surface-3 active:bg-primary/10'
                  : 'text-text-muted/20 cursor-not-allowed'
              }`}
            >
              <ArrowUp size={15} />
            </Pressable>
            <Pressable
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown?.();
              }}
              disabled={!canMoveDown}
              aria-label={`Przesuń ${name} w dół`}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                canMoveDown
                  ? 'text-text-secondary hover:bg-surface-3 active:bg-primary/10'
                  : 'text-text-muted/20 cursor-not-allowed'
              }`}
            >
              <ArrowDown size={15} />
            </Pressable>
          </div>
        )}

        {active ? (
          <div className="relative shrink-0">
            <Pressable
              onClick={onToggleMenu}
              aria-label="Więcej opcji ćwiczenia"
              className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary hover:bg-surface-2"
            >
              <MoreHorizontal size={20} />
            </Pressable>
            {menuOpen && (
              <LiveExerciseMenu
                canPlates={isBarbell}
                onClose={onCloseMenu}
                onWarmup={onWarmup}
                onPlates={onPlates}
                onRemoveSet={onRemoveSet}
                onSwap={onSwap}
                onRemove={onRemove}
              />
            )}
          </div>
        ) : (
          <Pressable
            onClick={onActivate}
            aria-label={`Rozwiń ${name}`}
            className="flex h-10 w-10 items-center justify-center rounded-full text-text-muted hover:bg-surface-2"
          >
            <ChevronDown size={18} aria-hidden />
          </Pressable>
        )}
      </div>
    </div>
  );
}
