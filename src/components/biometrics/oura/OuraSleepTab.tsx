import { SleepDetailView } from './SleepDetailView';
import type { OuraHealthHubData } from './types';

export function OuraSleepTab(data: OuraHealthHubData) {
  return <SleepDetailView data={data} />;
}
