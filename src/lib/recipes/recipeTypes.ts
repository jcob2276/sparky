export interface Recipe {
  id: string;
  title: string;
  meal_type: string;
  category: string;
  subcategory: string;
  is_airfryer_compatible: boolean;
  temp_c: number;
  cook_time: number;
  airfryer_settings: string;
  prep_time: number;
  /** Szacunek na jedną porcję (nie liczony ze składników). */
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tags: string[];
  lidl_biedronka_basket: string[];
  ingredients: string[];
  instructions: string[];
  pro_tip: string;
}

export type RecipeQuickFilter = 'airfryer' | 'protein40' | 'protein50' | 'fast' | 'lowCarb';

export interface RecipeFilters {
  query: string;
  category: string | null;
  quick: ReadonlySet<RecipeQuickFilter>;
}
