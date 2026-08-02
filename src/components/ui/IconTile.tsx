import type { ReactNode } from 'react';

export type IconTileTone = 'action' | 'direction' | 'success' | 'attention';

interface IconTileProps {
  icon: ReactNode;
  tone: IconTileTone;
  label?: string;
}

export default function IconTile({ icon, tone, label }: IconTileProps) {
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-ui="icon-tile"
      data-tone={tone}
      className="ui-icon-tile"
    >
      {icon}
    </span>
  );
}
