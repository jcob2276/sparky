import type { HTMLAttributes } from 'react';

export interface GroupedListRowProps extends HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

export function GroupedList({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} role="list" data-ui="grouped-list" className={`ui-grouped-list ${className}`} />;
}

export function GroupedListRow({ inset = true, className = '', ...props }: GroupedListRowProps) {
  return (
    <div
      {...props}
      role="listitem"
      data-ui="grouped-list-row"
      data-inset={inset || undefined}
      className={`ui-grouped-list-row ${className}`}
    />
  );
}
