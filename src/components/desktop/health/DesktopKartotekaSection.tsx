import { Suspense, lazy } from 'react';
import Skeleton from '../../ui/Skeleton';

const MedicalDesktopTeaser = lazy(() => import('../../medical/MedicalDesktopTeaser'));

interface Props {
  userId?: string;
}

export default function DesktopKartotekaSection({ userId }: Props) {
  return (
    <section id="badania" className="scroll-mt-28 space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border-custom" />
        <span className="pixel-label">Kartoteka & Zdrowie</span>
        <div className="h-px flex-1 bg-border-custom" />
      </div>
      {userId && (
        <Suspense fallback={<Skeleton variant="card" className="h-32 rounded-[var(--radius-xl)]" />}>
          <MedicalDesktopTeaser userId={userId} />
        </Suspense>
      )}
    </section>
  );
}
