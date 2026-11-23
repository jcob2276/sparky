import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import MealComposer from './MealComposer';

export default function MealCaptureScreen() {
  const { key } = useLocation();
  const [params] = useSearchParams();
  const action = params.get('akcja');

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 pb-6 pt-[calc(1rem+var(--safe-top))]">
      <header className="flex items-center gap-2">
        <Link to="/dzis" aria-label="Wróć do Dzisiaj" className="inline-flex size-11 items-center justify-center rounded-full text-primary">
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <h1 className="text-xl font-semibold">Dodaj posiłek</h1>
      </header>
      <MealComposer key={key} launchAction={action === 'aparat' || action === 'skaner' ? action : undefined} />
    </main>
  );
}
