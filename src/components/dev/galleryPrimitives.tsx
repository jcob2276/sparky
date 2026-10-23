import type { ReactNode } from 'react';

export function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-text-primary">
        {icon}{title}
      </h2>
      {children}
    </section>
  );
}

export function Row({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      {label && <p className="text-xs font-semibold text-text-muted">{label}</p>}
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

