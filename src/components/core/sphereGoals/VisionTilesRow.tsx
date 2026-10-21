import { useMemo } from 'react';
import type { VisionBoardItemRow } from '../../../lib/dreamsApi';
import zyciePhoto from '../../../assets/vision/zycie.webp';
import deepworkPhoto from '../../../assets/vision/deepwork.webp';
import pracaPhoto from '../../../assets/vision/praca.webp';
import girlGoal from '../../../assets/girl_goal.webp';

const VISIBLE_TILES = 4;

interface Tile {
  id: string;
  src: string;
  title: string;
  /** Pionowe zdjęcia sylwetki pokazujemy w całości, bez przycinania. */
  contain?: boolean;
}

/** Domyślne zdjęcia „po co”, dopóki w tablicy wizji (`vision_board_items`) nie ma własnych. */
const DEFAULT_TILES: Tile[] = [
  { id: 'zycie', src: zyciePhoto, title: 'Życie' },
  { id: 'deepwork', src: deepworkPhoto, title: 'Deep work' },
  { id: 'praca', src: pracaPhoto, title: 'Praca' },
  { id: 'cel', src: girlGoal, title: 'Cel', contain: true },
];

/** „Po co to robię” — osobne zdjęcia z tablicy wizji jako kafelki. */
export function VisionTilesRow({ items }: { items: VisionBoardItemRow[] }) {
  const tiles = useMemo<Tile[]>(
    () =>
      items.length > 0
        ? items.map((item) => ({ id: item.id, src: item.content, title: 'Wizja' }))
        : DEFAULT_TILES,
    [items],
  );

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-text-primary">Po co to robię</h3>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {tiles.slice(0, VISIBLE_TILES).map((tile) => (
          <div key={tile.id} className="relative aspect-square overflow-hidden rounded-2xl border border-border-custom/60 bg-surface-2">
            {tile.contain && (
              <img
                src={tile.src}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full scale-125 object-cover blur-xs"
                draggable={false}
              />
            )}
            <img
              src={tile.src}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              className={`relative h-full w-full ${tile.contain ? 'object-contain' : 'object-cover'}`}
              draggable={false}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
