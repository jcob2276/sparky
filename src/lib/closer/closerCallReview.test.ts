import { describe, expect, it } from 'vitest';
import { fathomPlaybackUrls, reviewMoments, timestampSeconds, transcriptExcerpt } from './closerCallReview';

describe('reviewing a recorded call', () => {
  it('keeps the selected utterance when many short replies precede it', () => {
    const lines = Array.from({length:20},(_,i) => ({timestamp:'00:03:' + String(i).padStart(2,'0'),text:'Line ' + i}));
    expect(transcriptExcerpt(lines,190).map(line=>line.text)).toContain('Line 10');
  });
  it('orders real moments chronologically and tolerates incomplete AI data', () => {
    const moments = reviewMoments({ ai_mistakes: [{ timestamp: '00:03:10', what: 'Obiekcja', why: 'Dopytaj o powód' }, { what: 'Bez czasu', why: null }, { what: 42 }],
      ai_good_moves: [{ timestamp: '00:01:00', what: 'Pytanie o cel', why: 'Konkretny kontekst' }] });
    expect(moments.map(m => [m.kind, m.what])).toEqual([['repeat','Pytanie o cel'],['practice','Obiekcja'],['practice','Bez czasu']]);
    expect(moments[2].why).toBe('');
    expect(moments[1]).toMatchObject({ quote: null, experiment: null });
    expect(reviewMoments({ ai_mistakes: [{ timestamp: '00:01:00', what: 'X', quote: ' Muszę to przemyśleć ', experiment: 'Zapytaj o powód.' }], ai_good_moves: [] })[0])
      .toMatchObject({ quote: 'Muszę to przemyśleć', experiment: 'Zapytaj o powód.' });
  });
  it('uses actual nearby transcript lines, without inventing a quote from AI feedback', () => {
    const transcript = [{ timestamp:'00:00:01',text:'Początek' },
      { timestamp:'00:02:55',speaker:{display_name:'Klient'},text:'Muszę to przemyśleć.' },
      { timestamp:'00:03:10',speaker:{display_name:'Ja'},text:'Co budzi wątpliwość?' },
      { timestamp:'00:08:00',text:'Później' }];
    expect(transcriptExcerpt(transcript,190).map(l => l.text)).toEqual(['Muszę to przemyśleć.','Co budzi wątpliwość?']);
    expect(transcriptExcerpt(null,190)).toEqual([]);
    expect(transcriptExcerpt(transcript,null)).toEqual([]);
  });
  it('builds playback only for genuine Fathom share links', () => {
    expect(fathomPlaybackUrls('https://fathom.video/share/abc_123',190)?.embed)
      .toBe('https://fathom.video/embed/abc_123?autoplay=0');
    for (const url of ['javascript:alert(1)','https://fathom.video.evil.test/share/token','https://fathom.video@evil.test/share/token','http://fathom.video/share/token']) {
      expect(fathomPlaybackUrls(url,10)).toBeNull();
    }
    expect(fathomPlaybackUrls(null,0)).toBeNull();
  });
  it('rejects invalid timestamps instead of seeking to a made-up moment', () => {
    expect(timestampSeconds('01:02:03')).toBe(3723);
    expect(timestampSeconds('02:03.5')).toBe(123.5);
    for (const value of ['','--:--:--','00:99:00','-1:00','text']) expect(timestampSeconds(value)).toBeNull();
  });
});

