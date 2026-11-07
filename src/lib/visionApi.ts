import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import type { Tables } from './database.types';

export type Measurement = Tables<'endmyopia_measurements'>;

export async function fetchMeasurements(): Promise<Measurement[]> {
  const { data, error } = await supabase
    .from('endmyopia_measurements')
    .select('*')
    .order('measured_at', { ascending: true });

  if (error) {
    console.error('[visionApi] fetchMeasurements failed:', error.message);
    throw new Error(error.message);
  }

  return (data || []) as Measurement[];
}

export function useVisionMeasurements() {
  return useQuery({
    queryKey: ['vision-measurements'],
    queryFn: () => fetchMeasurements(),
    staleTime: 1000 * 60 * 10,
  });
}

