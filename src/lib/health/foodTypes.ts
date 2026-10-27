import type { FoodSource } from './foodTrust';

export interface FoodBase {
  barcode: string | null;
  name: string;
  brand: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  saturated_fat?: number | null;
  /** Sól g/100 g; z etykiety lub OFF, więc to dana, nie szacunek. */
  salt?: number | null;
  defaultGrams?: number | null;
  source?: FoodSource;
  useCount?: number;
  incomplete?: boolean;
  confidence?: 'high' | 'medium' | 'low';
}
