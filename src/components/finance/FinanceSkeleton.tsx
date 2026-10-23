import Skeleton from '../ui/Skeleton';

/** Szkielet ekranu Finansów: segmenty, liczba bohater, akcje i lista transakcji. */
export function FinanceSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-busy="true" aria-label="Ładowanie finansów">
      <div className="flex flex-col items-center gap-4 pt-2">
        <div className="flex gap-2">
          <Skeleton variant="block" className="h-9 w-20 !rounded-full" />
          <Skeleton variant="block" className="h-9 w-24 !rounded-full" />
          <Skeleton variant="block" className="h-9 w-20 !rounded-full" />
        </div>
        <Skeleton variant="block" className="h-16 w-64" />
        <Skeleton variant="block" className="h-4 w-36" />
        <div className="flex w-full max-w-sm justify-between px-1">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} variant="block" className="h-14 w-14 !rounded-full" />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} variant="avatar" className="rounded-2xl bg-surface-1 p-3" />
        ))}
      </div>
    </div>
  );
}
