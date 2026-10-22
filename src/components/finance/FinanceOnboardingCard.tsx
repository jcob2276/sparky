import { Check, ChevronRight } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';
import type { FinanceTabKey } from './FinanceTabContent';

interface OnboardingState {
  hasAccounts: boolean;
  hasHoldings: boolean;
  hasBudget: boolean;
}

interface FinanceOnboardingCardProps {
  state: OnboardingState;
  onNavigate: (tab: FinanceTabKey) => void;
}

const STEPS: Array<{ key: keyof OnboardingState; title: string; hint: string; tab: FinanceTabKey }> = [
  { key: 'hasAccounts', title: 'Dodaj konto i gotówkę', hint: 'Stan konta bankowego, portfel, długi', tab: 'accounts' },
  { key: 'hasHoldings', title: 'Dodaj inwestycje', hint: 'ETF-y i akcje z notowaniami na żywo', tab: 'portfolio' },
  { key: 'hasBudget', title: 'Ustaw dochód i wydatki', hint: 'Policzę poduszkę i czas do celu', tab: 'flows' },
];

/** Karta startowa jak „Account activation” w Revolut: znika, gdy wszystko jest uzupełnione. */
export function FinanceOnboardingCard({ state, onNavigate }: FinanceOnboardingCardProps) {
  const done = STEPS.filter((step) => state[step.key]).length;
  if (done === STEPS.length) return null;

  return (
    <section className="space-y-3 rounded-3xl bg-primary p-5 text-on-accent" aria-label="Uzupełnij finanse">
      <div>
        <h2 className="text-lg font-semibold">Uzupełnij swoje finanse</h2>
        <p className="text-sm opacity-80">{done} z {STEPS.length} gotowe. Bez tego majątek i cel będą puste.</p>
      </div>
      <ul className="space-y-2">
        {STEPS.map((step) => {
          const complete = state[step.key];
          return (
            <li key={step.key}>
              <Pressable
                type="button"
                disabled={complete}
                onClick={() => onNavigate(step.tab)}
                className="flex w-full items-center gap-3 rounded-2xl bg-background/25 px-3 py-3 text-left disabled:opacity-60"
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${complete ? 'bg-on-accent text-primary' : 'bg-background/30'}`}>
                  {complete ? <Check size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{step.title}</span>
                  <span className="block text-xs opacity-80">{step.hint}</span>
                </span>
              </Pressable>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
