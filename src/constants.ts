/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NutrientValues } from './types.ts';

/**
 * Daily Reference Values (VDR) according to Argentine Food Code (CAA)
 * Based on a 2000 kcal diet
 */
export const DAILY_VALUES_REFERENCE: NutrientValues = {
  energy: 2000,
  energyKJ: 8400,
  carbs: 300,
  sugars: 50, // Legacy
  totalSugars: 50,
  addedSugars: 50,
  proteins: 75,
  totalFats: 55,
  saturatedFats: 22,
  transFats: 2,
  fiber: 25,
  sodium: 2400,
};

/**
 * Thresholds for "Ley de Etiquetado Frontal" (Argentina - Ley 27.642)
 * Phase 2 Thresholds (Current/Final)
 */
export const LABELING_THRESHOLDS = {
  SUGARS_ENERGY_PERCENT: 10, // % of total energy
  TOTAL_FATS_ENERGY_PERCENT: 30, // % of total energy
  SAT_FATS_ENERGY_PERCENT: 10, // % of total energy
  SODIUM_RATIO_MG_KCAL: 1, // 1mg per 1 kcal
  SODIUM_MAX_MG_100G: 300, // 300mg per 100g
  CALORIES_SOLID_KCAL_100G: 275,
  CALORIES_LIQUID_KCAL_100ML: 25,
};

export const CONVERSION_FACTORS = {
  CARBS_KCAL_PER_G: 4,
  PROTEIN_KCAL_PER_G: 4,
  FATS_KCAL_PER_G: 9,
  ALCOHOL_KCAL_PER_G: 7, 
  KCAL_TO_KJ: 4.184,
};

/**
 * Rounding rules (simplified CAA guidelines)
 */
export const ROUNDING_RULES: Partial<Record<keyof NutrientValues, number>> = {
  energy: 0,
  energyKJ: 0,
  carbs: 1,
  sugars: 1,
  totalSugars: 1,
  addedSugars: 1,
  proteins: 1,
  totalFats: 1,
  saturatedFats: 1,
  transFats: 1,
  fiber: 1,
  sodium: 0,
};

export const COMMON_ALLERGENS = [
  'Trigo', 
  'Avena', 
  'Cebada', 
  'Centeno', 
  'Leche', 
  'Huevo', 
  'Pescado', 
  'Crustáceos', 
  'Maní', 
  'Soja', 
  'Almendra', 
  'Avellana', 
  'Castaña', 
  'Nuez', 
  'Pistacho', 
  'Dióxido de Azufre/Sulfitos'
];
