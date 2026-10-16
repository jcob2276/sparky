import { act, fireEvent, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notify } from '../../../lib/notify';
import { computeDailyStrain, syncCalendar, syncOura, syncStrava } from '../../../lib/syncApi';
import { useDesktopDashboardState } from './useDesktopDashboardState';

vi.mock('../../../lib/notify', () => ({ notify: vi.fn() }));
vi.mock('../../../lib/syncApi', () => ({
  syncOura: vi.fn(), syncCalendar: vi.fn(), syncStrava: vi.fn(), computeDailyStrain: vi.fn(),
}));
vi.mock('../../../lib/health/workoutLogging', () => ({
  purgeStaleWorkoutDraft: vi.fn(), shouldAutoResumeWorkout: () => false,
  markWorkoutSessionActive: vi.fn(), loadWorkoutTemplate: vi.fn(),
}));

const desktopData = {
  loading: false, oura: [], nutrition: [], sessions: [], body: [], heightCm: null, strain: null,
  strava: [], projects: [], moves: [], goals: null, sprintGoals: [], stream: [], patterns: [],
  wins: [], wiki: [], knowledge: [], lenieLogs: [], phoneUsage: [], habits: [], habitLogs: [],
  marathon: null, personalTargets: null, refresh: vi.fn<() => Promise<void>>(),
};

function setup(initialEntry = '/dashboard') {
  return renderHook(() => ({
    ...useDesktopDashboardState({ userId: 'owner', desktopData }),
    location: useLocation(), navigate: useNavigate(),
  }), {
    wrapper: ({ children }) => <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>,
  });
}

describe('desktop dashboard state', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    desktopData.refresh.mockResolvedValue();
    vi.mocked(syncOura).mockResolvedValue();
    vi.mocked(syncCalendar).mockResolvedValue();
    vi.mocked(syncStrava).mockResolvedValue();
    vi.mocked(computeDailyStrain).mockResolvedValue();
  });

  it('reports failed sources while continuing the remaining synchronization', async () => {
    vi.mocked(syncOura).mockRejectedValueOnce(new Error('offline'));
    const { result } = setup();
    await act(async () => { await result.current.syncAll(); });
    expect(syncCalendar).toHaveBeenCalled();
    expect(syncStrava).toHaveBeenCalled();
    expect(computeDailyStrain).toHaveBeenCalled();
    expect(desktopData.refresh).toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('Oura'), 'error');
  });

  it('keeps synchronization active until refreshed data has loaded', async () => {
    let finishRefresh!: () => void;
    desktopData.refresh.mockReturnValue(new Promise<void>((resolve) => { finishRefresh = resolve; }));
    const { result } = setup();
    let sync!: Promise<void>;
    await act(async () => { sync = result.current.syncAll(); });
    expect(result.current.syncing).toBe(true);
    await act(async () => { finishRefresh(); await sync; });
    expect(result.current.syncing).toBe(false);
  });

  it('does not trigger shortcuts while writing inside a rich text editor', () => {
    const { result } = setup();
    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'true');
    const text = document.createElement('span');
    editor.append(text);
    document.body.append(editor);
    try {
      fireEvent.keyDown(text, { key: 'w' });
      expect(result.current.showWeightModal).toBe(false);
    } finally {
      editor.remove();
    }
  });

  it('stores selected tabs in the URL and restores them on browser back', () => {
    const { result } = setup('/dashboard?tab=health&source=tools');
    expect(result.current.activeTab).toBe('health');
    act(() => result.current.setActiveTab('intel'));
    expect(new URLSearchParams(result.current.location.search).get('tab')).toBe('intel');
    expect(new URLSearchParams(result.current.location.search).get('source')).toBe('tools');
    act(() => result.current.navigate(-1));
    expect(result.current.activeTab).toBe('health');
    act(() => result.current.navigate(1));
    expect(result.current.activeTab).toBe('intel');
  });

  it('reacts to another desktop link without needing a remount', () => {
    const { result } = setup('/dashboard?tab=health');
    act(() => result.current.navigate('/dashboard?tab=training'));
    expect(result.current.activeTab).toBe('training');
  });

  it('does not add a history entry when the current tab is chosen again', () => {
    const { result } = setup('/dashboard?tab=health');
    act(() => result.current.setActiveTab('intel'));
    act(() => result.current.setActiveTab('intel'));
    act(() => result.current.navigate(-1));
    expect(result.current.activeTab).toBe('health');
  });
});
