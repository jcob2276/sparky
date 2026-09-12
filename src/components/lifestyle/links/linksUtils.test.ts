import { describe, it, expect } from 'vitest';
import {
  getYouTubeId,
  isYouTubeUrl,
  formatDomainName,
  estimateReadingTime,
  matchesLinkQuickFilter,
  countFilterBadges,
} from './linksUtils';
import type { SavedLink } from '../../../lib/linksApi';

describe('linksUtils', () => {
  it('extracts YouTube IDs correctly', () => {
    expect(getYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(getYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(getYouTubeId('https://youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(getYouTubeId('https://example.com/article')).toBeNull();
  });

  it('detects YouTube URLs', () => {
    expect(isYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    expect(isYouTubeUrl('https://blog.samaltman.com/what-i-wish-someone-told-me')).toBe(false);
  });

  it('formats domain names cleanly', () => {
    expect(formatDomainName('www.theverge.com')).toBe('theverge.com');
    expect(formatDomainName('github.com')).toBe('github.com');
    expect(formatDomainName('')).toBe('link');
  });

  it('estimates reading time appropriately', () => {
    expect(estimateReadingTime('')).toBe(1);
    const text200Words = Array(200).fill('word').join(' ');
    expect(estimateReadingTime(text200Words)).toBe(1);
    const text500Words = Array(500).fill('word').join(' ');
    expect(estimateReadingTime(text500Words)).toBe(3);
  });

  it('filters links by quick filters and computes badge counts', () => {
    const links: SavedLink[] = [
      {
        id: '1',
        url: 'https://youtu.be/dQw4w9WgXcQ',
        title: 'Rickroll',
        description: 'Music video',
        domain: 'youtube.com',
        category: 'Inne',
        notes: '',
        takeaways: [],
        status: 'unread',
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        url: 'https://paulgraham.com/lesson.html',
        title: 'The Lesson to Unlearn',
        description: 'Essay',
        domain: 'paulgraham.com',
        category: 'Kariera',
        notes: 'Great insight on testing vs learning',
        takeaways: ['School teaches you to pass tests', 'Real life is different'],
        status: 'read',
        created_at: new Date().toISOString(),
      },
    ];

    expect(matchesLinkQuickFilter(links[0], 'all')).toBe(true);
    expect(matchesLinkQuickFilter(links[0], 'unread')).toBe(true);
    expect(matchesLinkQuickFilter(links[0], 'read')).toBe(false);
    expect(matchesLinkQuickFilter(links[0], 'videos')).toBe(true);
    expect(matchesLinkQuickFilter(links[0], 'with_notes')).toBe(false);

    expect(matchesLinkQuickFilter(links[1], 'read')).toBe(true);
    expect(matchesLinkQuickFilter(links[1], 'with_notes')).toBe(true);
    expect(matchesLinkQuickFilter(links[1], 'with_takeaways')).toBe(true);
    expect(matchesLinkQuickFilter(links[1], 'videos')).toBe(false);

    const counts = countFilterBadges(links);
    expect(counts.all).toBe(2);
    expect(counts.unread).toBe(1);
    expect(counts.read).toBe(1);
    expect(counts.videos).toBe(1);
    expect(counts.with_notes).toBe(1);
    expect(counts.with_takeaways).toBe(1);
  });
});
