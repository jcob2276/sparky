import React from 'react';
import { Target, Moon, Activity, Zap } from 'lucide-react';

export const METRIC_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  sleep_hours: {
    label: 'Sen',
    icon: <Moon size={12} />,
    color: 'var(--color-info)',
  },
  readiness_score: {
    label: 'Gotowość',
    icon: <Activity size={12} />,
    color: 'var(--color-success)',
  },
  execution_score: {
    label: 'Zadania',
    icon: <Zap size={12} />,
    color: 'var(--color-warning)',
  },
};

export function getMetaMeta(metric: string) {
  return METRIC_META[metric] ?? { label: metric, icon: <Target size={12} />, color: 'var(--color-text-muted)' };
}
