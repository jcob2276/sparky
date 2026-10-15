import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthMonitorSlidersCard } from './HealthMonitorSlidersCard';
import type { OuraHealthHubData } from '../oura/types';

describe('HealthMonitorSlidersCard', () => {
  const mockData: OuraHealthHubData = {
    date: '2026-10-15',
    strainRow: null,
    oura: {
      id: '1',
      date: '2026-10-15',
      user_id: 'user1',
      created_at: null,
      active_calories: 500,
      bedtime_end_timestamp: null,
      bedtime_timestamp: null,
      deep_sleep_hours: 1.5,
      hrv_avg: 55,
      is_disciplined: true,
      latency_minutes: 12,
      optimal_bedtime_end_offset: null,
      optimal_bedtime_start_offset: null,
      readiness_score: 85,
      rem_sleep_hours: 1.8,
      rhr_avg: 48,
      sleep_efficiency: 90,
      sleep_score: 88,
      sleep_time_recommendation: null,
      sleep_time_status: null,
      steps: 8000,
      stress_score: 25,
      temp_deviation: 0.1,
      total_calories: 2200,
      total_sleep_hours: 8,
    } as unknown as NonNullable<OuraHealthHubData['oura']>,
    enhanced: {
      id: '1',
      date: '2026-10-15',
      user_id: 'user1',
      created_at: '2026-10-15T00:00:00Z',
      sleep_average_hrv: 58,
      sleep_lowest_heart_rate: 46,
      sleep_average_breath: 14.2,
      temperature_deviation: 0.05,
      spo2_percentage: 98,
      active_calories: 500,
      bedtime_end: null,
      bedtime_start: null,
      deep_sleep_hours: 1.5,
      readiness_score: 85,
      recovery_high_minutes: 300,
      rem_sleep_hours: 1.8,
      sleep_contributors: null,
      sleep_efficiency: 90,
      sleep_latency_minutes: 12,
      sleep_phase_5_min: null,
      sleep_score: 88,
      stress_day_summary: null,
      stress_high_minutes: 30,
      total_burn: 2200,
      total_sleep_hours: 8,
      updated_at: null,
      vascular_age: null,
    } as unknown as NonNullable<OuraHealthHubData['enhanced']>,
    ouraHistory: Array.from({ length: 20 }).map((_, i) => ({
      id: `hist-${i}`,
      date: `2026-09-${String(i + 1).padStart(2, '0')}`,
      user_id: 'user1',
      created_at: '2026-09-01T00:00:00Z',
      active_calories: 450,
      bedtime_end_timestamp: null,
      bedtime_timestamp: null,
      deep_sleep_hours: 1.4,
      hrv_avg: 52 + (i % 6),
      is_disciplined: true,
      latency_minutes: 15,
      optimal_bedtime_end_offset: null,
      optimal_bedtime_start_offset: null,
      readiness_score: 80,
      rem_sleep_hours: 1.6,
      rhr_avg: 49,
      sleep_efficiency: 88,
      sleep_score: 84,
      sleep_time_recommendation: null,
      sleep_time_status: null,
      steps: 7500,
      stress_score: 30,
      temp_deviation: 0,
      total_calories: 2100,
      total_sleep_hours: 7.8,
    })) as unknown as NonNullable<OuraHealthHubData['ouraHistory']>,
    enhancedHistory: Array.from({ length: 20 }).map((_, i) => ({
      id: `enh-${i}`,
      date: `2026-09-${String(i + 1).padStart(2, '0')}`,
      user_id: 'user1',
      created_at: '2026-09-01T00:00:00Z',
      sleep_average_hrv: 52 + (i % 6),
      sleep_lowest_heart_rate: 47 + (i % 4),
      sleep_average_breath: 14.0 + (i % 3) * 0.2,
      temperature_deviation: -0.1 + (i % 5) * 0.05,
      spo2_percentage: 97 + (i % 3),
      active_calories: 450,
      bedtime_end: null,
      bedtime_start: null,
      deep_sleep_hours: 1.4,
      readiness_score: 80,
      recovery_high_minutes: 300,
      rem_sleep_hours: 1.6,
      sleep_contributors: null,
      sleep_efficiency: 88,
      sleep_latency_minutes: 15,
      sleep_phase_5_min: null,
      sleep_score: 84,
      stress_day_summary: null,
      stress_high_minutes: 30,
      total_burn: 2100,
      total_sleep_hours: 7.8,
      updated_at: null,
      vascular_age: null,
    })) as unknown as NonNullable<OuraHealthHubData['enhancedHistory']>,
  };

  it('renders all 5 vital sliders with their names and metrics', () => {
    render(<HealthMonitorSlidersCard data={mockData} />);

    expect(screen.getByText(/Monitor parametrów życiowych/i)).toBeInTheDocument();
    expect(screen.getByText('HRV')).toBeInTheDocument();
    expect(screen.getByText('Tętno spoczynkowe')).toBeInTheDocument();
    expect(screen.getByText('Częstotliwość oddechu')).toBeInTheDocument();
    expect(screen.getByText('Odchylenie temperatury skóry')).toBeInTheDocument();
    expect(screen.getByText('SpO₂')).toBeInTheDocument();
  });

  it('displays calibrating state when history is insufficient', () => {
    const calibratingData: OuraHealthHubData = {
      ...mockData,
      ouraHistory: [],
      enhancedHistory: [],
    };

    render(<HealthMonitorSlidersCard data={calibratingData} />);

    expect(screen.getAllByText(/Brak danych lub kalibracja/i)[0]).toBeInTheDocument();
  });
});
