import type { SavedLink } from '../../../lib/linksApi';

export type LinkQuickFilter = 'all' | 'unread' | 'read' | 'videos' | 'with_notes' | 'with_takeaways';

export const CATEGORIES = ['Ciało', 'Duch', 'Konto', 'Kariera', 'Zdrowie', 'Technologia', 'Biznes', 'Inne'] as const;

export const CATEGORY_COLORS: Record<string, { pill: string; border: string }> = {
  Ciało:       { pill: 'bg-success/15 text-success', border: 'border-success/40' },
  Duch:        { pill: 'bg-info/15 text-info', border: 'border-info/40' },
  Konto:       { pill: 'bg-warning/15 text-warning', border: 'border-warning/40' },
  Kariera:     { pill: 'bg-primary/10 text-primary', border: 'border-primary/30' },
  Zdrowie:     { pill: 'bg-success/10 text-success', border: 'border-success/30' },
  Technologia: { pill: 'bg-info/10 text-info', border: 'border-info/30' },
  Biznes:      { pill: 'bg-warning/10 text-warning', border: 'border-warning/30' },
  Inne:        { pill: 'bg-surface-solid text-text-muted', border: 'border-border-custom' },
};

export const CATEGORY_DOTS: Record<string, string> = {
  Ciało: 'var(--color-success)',
  Duch: 'var(--color-info)',
  Konto: 'var(--color-warning)',
  Kariera: 'var(--color-primary)',
  Zdrowie: 'var(--color-success)',
  Technologia: 'var(--color-info)',
  Biznes: 'var(--color-warning)',
  Inne: 'var(--color-surface-2)',
};

export function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export function isYouTubeUrl(url: string): boolean {
  return Boolean(getYouTubeId(url));
}

export function formatDomainName(domain: string): string {
  if (!domain) return 'link';
  return domain.replace(/^www\./i, '');
}

export function estimateReadingTime(text: string): number {
  if (!text) return 1;
  const wordCount = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(wordCount / 200);
  return Math.max(1, minutes);
}

export function matchesLinkQuickFilter(link: SavedLink, filter: LinkQuickFilter): boolean {
  switch (filter) {
    case 'unread':
      return link.status === 'unread';
    case 'read':
      return link.status === 'read';
    case 'videos':
      return Boolean(link.thumbnail_url || isYouTubeUrl(link.url));
    case 'with_notes':
      return Boolean(link.notes && link.notes.trim().length > 0);
    case 'with_takeaways':
      return Boolean(link.takeaways && link.takeaways.length > 0);
    case 'all':
    default:
      return true;
  }
}

export function countFilterBadges(links: SavedLink[]): Record<LinkQuickFilter, number> {
  const counts: Record<LinkQuickFilter, number> = {
    all: links.length,
    unread: 0,
    read: 0,
    videos: 0,
    with_notes: 0,
    with_takeaways: 0,
  };

  for (const l of links) {
    if (l.status === 'unread') counts.unread++;
    if (l.status === 'read') counts.read++;
    if (l.thumbnail_url || isYouTubeUrl(l.url)) counts.videos++;
    if (l.notes && l.notes.trim().length > 0) counts.with_notes++;
    if (l.takeaways && l.takeaways.length > 0) counts.with_takeaways++;
  }

  return counts;
}
