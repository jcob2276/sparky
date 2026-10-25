import { ExternalLink, FileText, Video } from 'lucide-react';
import type { CloserCallRow } from '../../../lib/closer/closerCallsApi';
import { fathomPlaybackUrls, transcriptExcerpt } from '../../../lib/closer/closerCallReview';
import EmptyState from '../../ui/EmptyState';
import { useFathomPlayer } from './useFathomPlayer';

export default function CloserCallEvidence({ call, seconds }: { call: CloserCallRow; seconds: number | null }) {
  const playback = fathomPlaybackUrls(call.share_url, seconds);
  const excerpt = transcriptExcerpt(call.transcript, seconds);
  const { frame, requestDuration } = useFathomPlayer(playback?.embed, seconds);
  return (
    <div className="space-y-6 lg:sticky lg:top-0">
      <section aria-label="Nagranie">
        {playback ? (
          <>
            <div className="aspect-video overflow-hidden rounded-[var(--radius-grouped)] bg-surface-2">
              <iframe ref={frame} onLoad={requestDuration} src={playback.embed} title="Nagranie rozmowy"
                className="h-full w-full border-0" allow="picture-in-picture" allowFullScreen />
            </div>
            <a href={playback.external} target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary hover:underline">
              <ExternalLink size={16} /> Otwórz w Fathom
            </a>
          </>
        ) : <EmptyState icon={<Video size={22} />} label="Nagranie jest niedostępne"
          description="Możesz nadal przejrzeć analizę i zapisać własne wnioski." />}
      </section>

      <section aria-label="Fragment transkrypcji" className="space-y-4">
        <div>
          <h4 className="text-base font-semibold text-text-primary">Co rzeczywiście padło</h4>
          <p className="mt-1 text-sm leading-relaxed text-text-secondary">Fragment transkrypcji przy wybranym momencie.</p>
        </div>
        {excerpt.length ? (
          <div className="max-h-80 space-y-5 overflow-y-auto rounded-[var(--radius-grouped)] bg-surface-2 p-4 sm:p-5">
            {excerpt.map((line, index) => (
              <div key={line.timestamp + ':' + index} className="space-y-1.5">
                <p className="text-xs font-medium text-text-secondary">
                  <span className="mr-2 font-mono tabular-nums text-primary">{line.timestamp}</span>{line.speaker}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-7 text-text-primary">{line.text}</p>
              </div>
            ))}
          </div>
        ) : <EmptyState icon={<FileText size={22} />} compact label="Brak fragmentu transkrypcji"
          description={seconds === null ? 'Wybierz moment z oznaczeniem czasu.' : 'Dla tego momentu nie ma tekstu źródłowego.'} />}
      </section>
    </div>
  );
}

