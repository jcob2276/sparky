import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CloserVoiceCard from './CloserVoiceCard';
import type { VoiceReport } from '../../../lib/closer/closerVoiceTrends';

const report: VoiceReport = {
  calls: 12,
  metrics: [
    { key: 'share', label: 'Twój udział w mówieniu', unit: '%', recent: 72, delta: -6, better: 'lower', hint: 'orientacyjnie 40–50% w rozmowie o potrzebach' },
    { key: 'wpm', label: 'Tempo (przybliżone)', unit: 'słów/min', recent: null, delta: null, better: 'none', hint: null },
  ],
};

describe('CloserVoiceCard', () => {
  it('pokazuje metryki z wartością, zmianą i podpowiedzią, a pomija te bez próby', () => {
    render(<CloserVoiceCard report={report} />);
    expect(screen.getByText('72 %')).toBeInTheDocument();
    expect(screen.getByText('-6')).toBeInTheDocument();
    expect(screen.getByText(/orientacyjnie 40–50%/)).toBeInTheDocument();
    expect(screen.queryByText('Tempo (przybliżone)')).not.toBeInTheDocument();
  });

  it('nie pokazuje nic przy mniej niż 3 rozmowach', () => {
    const { container } = render(<CloserVoiceCard report={{ ...report, calls: 2 }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
