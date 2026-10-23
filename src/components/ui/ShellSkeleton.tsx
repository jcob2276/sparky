import Skeleton from './Skeleton';

/**
 * Route fallback: the shape of a typical screen (title, hero stat, rows, tab bar)
 * instead of a centered spinner, so the first paint already looks like the app.
 */
export default function ShellSkeleton() {
  return (
    <div className="min-h-screen bg-background" role="status" aria-busy="true" aria-label="Ładowanie">
      <div className="mx-auto flex max-w-[var(--content-narrow)] flex-col gap-6 px-4 pb-32 pt-6">
        <div className="space-y-2">
          <Skeleton variant="block" className="h-9 w-2/5" />
          <Skeleton variant="block" className="h-3 w-1/4" />
        </div>
        <Skeleton variant="block" className="h-36 w-full !rounded-[var(--radius-hero)]" />
        <div className="space-y-3">
          <Skeleton variant="card" lines={2} />
          <Skeleton variant="card" lines={2} />
          <Skeleton variant="card" lines={2} />
        </div>
      </div>
      <div className="fixed inset-x-6 bottom-6 flex justify-center">
        <Skeleton variant="block" className="h-16 w-full max-w-sm !rounded-full" />
      </div>
    </div>
  );
}
