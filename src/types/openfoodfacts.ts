export interface ProductNutriments {
  sugars_100g?: number;
  fat_100g?: number;
  salt_100g?: number;
  "saturated-fat_100g"?: number;
  "energy-kcal_100g"?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fiber_100g?: number;
  sodium_100g?: number;
}

export interface OpenFoodFactsProduct {
  code?: string;
  product_name?: string;
  image_url?: string;
  brands?: string;
  categories?: string;
  categories_tags?: string[];
  ecoscore_grade?: string;
  nutriscore_grade?: string;
  nova_group?: number;
  allergens_tags?: string[];
  allergens?: string;
  ingredients_text?: string;
  ingredients_count?: number;
  additives_count?: number;
  additives_tags?: string[];
  ingredients_analysis_tags?: string[];
  labels_tags?: string[];
  packaging_tags?: string[];
  origins_tags?: string[];
  nutriments?: ProductNutriments;
  ecoscore_data?: {
    adjustments?: {
      transportation?: {
        value?: number;
      };
    };
  };
  quantity?: string;
  serving_size?: string;
}
