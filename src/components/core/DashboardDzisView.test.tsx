import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DashboardDzisView, type DashboardDzisViewProps } from './DashboardDzisView';
import { parseTodayLayout } from '../../lib/todayLayout';

// The children own unrelated network queries; this test covers the real section renderer.
vi.mock('../lifestyle/PowerList', () => ({ default: () => <p>Daily tasks</p> }));
vi.mock('../biometrics/DailyStrainCard', () => ({ default: () => <p>Recovery</p> }));
vi.mock('../terminy/UrgentObligationsBanner', () => ({ UrgentObligationsBanner: () => <p>Urgent obligations</p> }));
vi.mock('../terminy/UpcomingObligationsStrip', () => ({ UpcomingObligationsStrip: () => null }));
vi.mock('./bodyMeasure/BodyMeasureBanner', () => ({ default: () => <p>Measurement reminder</p> }));
vi.mock('./DashboardGreeting', () => ({ DashboardGreeting: () => <p>Today</p> }));
vi.mock('./DailySnapshotCard', () => ({ default: () => <p>Daily snapshot</p> }));
vi.mock('./nutrition/FoodQuickCapture', () => ({ default: () => <p>Food log</p> }));
vi.mock('./ThreeSpheresGoalsCard', () => ({ ThreeSpheresGoalsCard: () => <p>Goals</p> }));
vi.mock('./TodayRunwayCard', () => ({ default: () => <p>Agenda</p> }));
vi.mock('./VisionHeroCard', () => ({ default: () => <p>Vision</p> }));

const props: DashboardDzisViewProps = {
  userId: 'owner', layout: parseTodayLayout(null), layoutLoading: false, layoutError: false,
  saving: false, editing: false, onEdit: () => {}, onCloseEditor: () => {},
  onSaveLayout: async () => {}, onRetryLayout: () => {}, plan: { todayWin: null },
  nutritionKey: 0, workoutKey: 0, onFoodSaved: () => {}, onOpenTerminy: () => {},
  weeklyReviewDue: false, onOpenWeeklyReview: () => {},
};
afterEach(cleanup);

it('renders the saved order and omits hidden cards without losing fixed reminders', () => {
  const layout = parseTodayLayout(null);
  layout.sections = [
    { id: 'agenda', visible: true },
    { id: 'recovery', visible: true },
    ...layout.sections.filter(section => section.id !== 'agenda' && section.id !== 'recovery')
      .map(section => ({ ...section, visible: false })),
  ];
  const { container } = render(<DashboardDzisView {...props} layout={layout} />);
  expect([...container.querySelectorAll('[data-today-section]')].map(node => node.getAttribute('data-today-section')))
    .toEqual(['agenda', 'recovery']);
  expect(screen.queryByText('Food log')).not.toBeInTheDocument();
  expect(screen.getByText('Urgent obligations')).toBeInTheDocument();
  expect(screen.getByText('Measurement reminder')).toBeInTheDocument();
});

it('keeps a path back to editing after all cards are hidden and blocks overwrite after a failed read', () => {
  const layout = parseTodayLayout(null);
  layout.sections.forEach(section => { section.visible = false; });
  const { rerender } = render(<DashboardDzisView {...props} layout={layout} />);
  expect(screen.getByRole('button', { name: 'Edytuj układ Dziś' })).toBeEnabled();
  expect(screen.getByText(/Wszystkie sekcje są ukryte/)).toBeInTheDocument();
  rerender(<DashboardDzisView {...props} layoutError />);
  expect(screen.getByRole('button', { name: 'Edytuj układ Dziś' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Ponów odczyt układu' })).toBeEnabled();
});
