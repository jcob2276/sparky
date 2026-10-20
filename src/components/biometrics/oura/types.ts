/**
 * @file types.ts
 * @role Definicje typów dla Oura / NOOP Health & Sleep Hub (110%) z pełną obsługą historii 30 dni.
 */
import type { Tables } from '../../../lib/database.types';
import type { OuraNightDetails } from '../../../lib/biometrics/ouraNightDetails';
import type { OuraContextInsights } from '../../../lib/biometrics/ouraContextInsights';
import type { CorrelationsData } from '../../../lib/correlationsApi';
import type { BiometricReadError } from '../../../lib/biometricsApi';


export interface OuraHealthHubData {
  sourceErrors?: BiometricReadError[];
  userId?:string;
  date?: string | null;
  strainRow: Tables<'daily_strain'> | null;
  oura: Tables<'oura_daily_summary'> | null;
  ouraYesterday?: Tables<'oura_daily_summary'> | null;
  enhanced?: Tables<'oura_enhanced'> | null;
  enhancedYesterday?: Tables<'oura_enhanced'> | null;
  ouraHistory?: Tables<'oura_daily_summary'>[];
  enhancedHistory?: Tables<'oura_enhanced'>[];
  birthDateStr?: string | null;
  biologicalSex?: 'male' | 'female' | null;
  garminVo2Max?: number | null;
  externalVo2Source?: string | null;
  nightDetails?: OuraNightDetails | null;
  nightContext?: OuraContextInsights | null;
  correlations?: CorrelationsData | null;
  correlationsError?: string | null;
  correlationsLoading?: boolean;
}
