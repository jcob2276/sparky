import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SleepRecoveryArchitecture } from './SleepRecoveryArchitecture';

afterEach(cleanup);
const props = { deepMinutes: 0, remMinutes: 0, totalSleepMinutes: 40, avgHrv: 30, lowestHr: 45, formatMinutes: (value: number) => `${value}m` };
describe('sleep phase evidence labels', () => {
  it('does not assign fixed example clock times to a measured phase sequence', () => {
    render(<SleepRecoveryArchitecture {...props} hypnogramString="11112233" />);
    expect(screen.queryByText('22:02 — 04:09')).not.toBeInTheDocument();
    expect(screen.queryByText('Spoczynek nocy o 03:15')).not.toBeInTheDocument();
    expect(screen.getByText('Brak godzin nocy')).toBeInTheDocument();
  });
  it('makes a missing phase timeline visible', () => {
    render(<SleepRecoveryArchitecture {...props} />);
    expect(screen.getByText('Brak przebiegu faz snu')).toBeInTheDocument();
  });
  it('does not interpret unknown phase codes as measured light sleep', () => {
    render(<SleepRecoveryArchitecture {...props} hypnogramString="12x3" />);
    expect(screen.getByText('Nieprawidłowy przebieg faz snu')).toBeInTheDocument();
    expect(screen.queryByText('Nocny Hipnogram (co 5 min)')).not.toBeInTheDocument();
  });
  it('keeps recorded zero phase duration visible', () => {
    render(<SleepRecoveryArchitecture {...props} />);
    expect(screen.getAllByText('0m')).toHaveLength(2);
  });
  it('labels the actual interval in Warsaw time', () => {
    render(<SleepRecoveryArchitecture {...props} hypnogramString="11112233" bedtimeStart="2026-10-15T22:00:00Z" bedtimeEnd="2026-10-15T22:40:00Z" />);
    expect(screen.getByText('00:00 — 00:40')).toBeInTheDocument();
  });
  it('shows a material difference between recorded phases and the night interval', () => {
    render(<SleepRecoveryArchitecture {...props} hypnogramString="11112233" bedtimeStart="2026-10-15T22:00:00Z" bedtimeEnd="2026-10-16T06:00:00Z" date="2026-10-16" />);
    expect(screen.getByText('Niespójny czas przebiegu faz')).toBeInTheDocument();
    expect(screen.getByText(/2026-10-16: fazy obejmują 40 min, a zapisany przedział 480 min/)).toBeInTheDocument();
  });
  it('keeps missing contributor values distinct from recorded zero', () => {
    render(<SleepRecoveryArchitecture {...props} sleepContributors={{ efficiency: null, total_sleep: 0 }} />);
    expect(screen.getByText('0/100')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
