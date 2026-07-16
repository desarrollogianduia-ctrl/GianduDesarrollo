/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  CalculationResult, 
  Ingredient, 
  NutrientValues, 
  Recipe,
  AllergenType
} from '../types.ts';
import { 
  DAILY_VALUES_REFERENCE, 
  LABELING_THRESHOLDS, 
  CONVERSION_FACTORS, 
  ROUNDING_RULES 
} from '../constants.ts';

export interface FlattenedIngredient {
  name: string;
  amount: number; // calculated relative amount in the final product
}

function getFlattenedIngredients(
  recipe: Recipe,
  ingredientsDb: Ingredient[],
  allRecipes: Recipe[],
  multiplier: number,
  initialWeight: number
): FlattenedIngredient[] {
  const flattened: FlattenedIngredient[] = [];
  const recipeWeightTotal = recipe.ingredients.reduce((acc, i) => acc + i.amount, 0) || 1;

  recipe.ingredients.forEach(ri => {
    const contributionFactor = multiplier * (ri.amount / recipeWeightTotal);
    
    if (ri.isRecipe) {
      const subRecipe = allRecipes.find(r => r.id === ri.ingredientId);
      if (subRecipe) {
        flattened.push(...getFlattenedIngredients(subRecipe, ingredientsDb, allRecipes, contributionFactor, initialWeight));
      } else {
        flattened.push({ name: "RECETA DESCONOCIDA", amount: contributionFactor * initialWeight });
      }
    } else {
      const ing = ingredientsDb.find(i => i.id === ri.ingredientId);
      const name = ing ? ing.name : (ri.note || "INGREDIENTE DESCONOCIDO");
      flattened.push({ name, amount: contributionFactor * initialWeight });
    }
  });

  return flattened;
}

export function calculateNutrition(
  recipe: Recipe, 
  ingredientsDb: Ingredient[], 
  allRecipes: Recipe[] = []
): CalculationResult {
  const totalNutrients: NutrientValues = {
    energy: 0,
    energyKJ: 0,
    carbs: 0,
    sugars: 0,
    totalSugars: 0,
    addedSugars: 0,
    proteins: 0,
    totalFats: 0,
    saturatedFats: 0,
    transFats: 0,
    fiber: 0,
    sodium: 0,
  };

  const initialWeight = recipe.ingredients.reduce((acc, ri) => acc + ri.amount, 0) || 1;
  const ingredientBreakdown: CalculationResult['ingredientBreakdown'] = [];

  recipe.ingredients.forEach(ri => {
    let ingValues: NutrientValues | null = null;
    let name = "";

    if (ri.isRecipe) {
      const subRecipe = allRecipes.find(r => r.id === ri.ingredientId);
      if (subRecipe) {
        const subResult = calculateNutrition(subRecipe, ingredientsDb, allRecipes);
        const subWeight = subRecipe.finalYield || subRecipe.ingredients.reduce((a, b) => a + b.amount, 0);
        ingValues = {} as any;
        Object.keys(subResult.adjustedNutrients).forEach(key => {
          (ingValues as any)[key] = (subResult.adjustedNutrients as any)[key] * (100 / subWeight);
        });
        name = subRecipe.name;
      }
    } else {
      const ing = ingredientsDb.find(i => i.id === ri.ingredientId);
      if (ing) {
        ingValues = ing;
        name = ing.name;
      }
    }

    if (!ingValues) return;

    const factor = ri.amount / 100;
    const contribution: NutrientValues = {
      energy: (ingValues.energy || 0) * factor,
      energyKJ: (ingValues.energyKJ || ((ingValues.energy || 0) * CONVERSION_FACTORS.KCAL_TO_KJ) || 0) * factor,
      carbs: (ingValues.carbs || 0) * factor,
      sugars: (ingValues.sugars || 0) * factor,
      totalSugars: (ingValues.totalSugars || ingValues.sugars || 0) * factor,
      addedSugars: (ingValues.addedSugars || 0) * factor,
      proteins: (ingValues.proteins || 0) * factor,
      totalFats: (ingValues.totalFats || 0) * factor,
      saturatedFats: (ingValues.saturatedFats || 0) * factor,
      transFats: (ingValues.transFats || 0) * factor,
      fiber: (ingValues.fiber || 0) * factor,
      sodium: (ingValues.sodium || 0) * factor,
    };

    Object.keys(totalNutrients).forEach(key => {
      (totalNutrients as any)[key] += (contribution as any)[key];
    });

    ingredientBreakdown.push({
      name,
      contribution,
      percentageByWeight: (ri.amount / initialWeight) * 100
    });
  });

  // Fully recursive flattening for the ingredient list
  const flattenedIngredients = getFlattenedIngredients(recipe, ingredientsDb, allRecipes, 1, initialWeight);

  // Group flattened ingredients by name
  const groupedFlattened = flattenedIngredients.reduce((acc, curr) => {
    const existing = acc.find(i => i.name === curr.name);
    if (existing) {
      existing.amount += curr.amount;
    } else {
      acc.push({ ...curr });
    }
    return acc;
  }, [] as FlattenedIngredient[]);

  const ingredientList = groupedFlattened
    .sort((a, b) => b.amount - a.amount)
    .map(i => i.name.toUpperCase());

  // Adjustment by final yield
  const safeFinalYield = recipe.finalYield || initialWeight;
  const yieldFactor = safeFinalYield / initialWeight;
  const adjustedNutrients: NutrientValues = {} as any;
  Object.keys(totalNutrients).forEach(key => {
    (adjustedNutrients as any)[key] = (totalNutrients as any)[key] * yieldFactor;
  });

  // Per serving calculation
  const safeServingSize = recipe.servingSize || 100;
  const servingsTotal = (safeFinalYield / safeServingSize) || 1;
  const perServing: NutrientValues = {} as any;
  Object.keys(adjustedNutrients).forEach(key => {
    (perServing as any)[key] = (adjustedNutrients as any)[key] / servingsTotal;
  });

  // %DV calculation
  const percentDV: Partial<NutrientValues> = {};
  Object.keys(perServing).forEach(key => {
    const dailyVal = (DAILY_VALUES_REFERENCE as any)[key];
    if (dailyVal && dailyVal > 0) {
      (percentDV as any)[key] = ((perServing as any)[key] / dailyVal) * 100;
    }
  });

  // Octagon Warnings (Ley 27.642)
  // These are calculated based on 100g of the adjusted final product
  const per100g = {} as any;
  Object.keys(adjustedNutrients).forEach(key => {
    per100g[key] = (adjustedNutrients as any)[key] * (100 / recipe.finalYield);
  });

  const warnings: string[] = [];
  const totalKcal = per100g.energy;

  // Sugars > 10% of total energy
  const kcalFromSugars = per100g.sugars * CONVERSION_FACTORS.CARBS_KCAL_PER_G;
  if (kcalFromSugars >= (totalKcal * LABELING_THRESHOLDS.SUGARS_ENERGY_PERCENT / 100)) {
    warnings.push('EXCESO EN AZÚCARES');
  }

  // Total Fats > 30% of total energy
  const kcalFromFats = per100g.totalFats * CONVERSION_FACTORS.FATS_KCAL_PER_G;
  if (kcalFromFats >= (totalKcal * LABELING_THRESHOLDS.TOTAL_FATS_ENERGY_PERCENT / 100)) {
    warnings.push('EXCESO EN GRASAS TOTALES');
  }

  // Saturated Fats > 10% of total energy
  const kcalFromSatFats = per100g.saturatedFats * CONVERSION_FACTORS.FATS_KCAL_PER_G;
  if (kcalFromSatFats >= (totalKcal * LABELING_THRESHOLDS.SAT_FATS_ENERGY_PERCENT / 100)) {
    warnings.push('EXCESO EN GRASAS SATURADAS');
  }

  // Sodium >= 1mg/kcal OR >= 300mg/100g
  if (per100g.sodium >= totalKcal * LABELING_THRESHOLDS.SODIUM_RATIO_MG_KCAL || per100g.sodium >= LABELING_THRESHOLDS.SODIUM_MAX_MG_100G) {
    warnings.push('EXCESO EN SODIO');
  }

  // Calories threshold depends on state
  const calorieThreshold = recipe.isLiquid 
    ? LABELING_THRESHOLDS.CALORIES_LIQUID_KCAL_100ML 
    : LABELING_THRESHOLDS.CALORIES_SOLID_KCAL_100G;

  if (totalKcal >= calorieThreshold) {
    // Only if it has excessive sugar/fat/sodium? Actually the law says if it exceeds ANY nutrient limit AND exceeds calories.
    if (warnings.length > 0) {
      warnings.push('EXCESO EN CALORÍAS');
    }
  }

  // Allergen Calculation
  const allergensMap: Record<AllergenType, Set<string>> = {
    contiene: new Set(),
    puede_contener: new Set(),
    derivado_de: new Set()
  };

  const traverseAllergens = (rec: Recipe, mult: number) => {
    rec.ingredients.forEach(ri => {
      if (ri.isRecipe) {
        const sub = allRecipes.find(r => r.id === ri.ingredientId);
        if (sub) traverseAllergens(sub, mult * (ri.amount / (rec.ingredients.reduce((a, b) => a + b.amount, 0) || 1)));
      } else {
        const ing = ingredientsDb.find(i => i.id === ri.ingredientId);
        if (ing?.allergens) {
          ing.allergens.forEach(ae => {
            allergensMap[ae.type].add(ae.allergen);
          });
        }
      }
    });
  };
  traverseAllergens(recipe, 1);

  const formatGroup = (title: string, set: Set<string>) => {
    if (set.size === 0) return '';
    return `${title}: ${Array.from(set).join(', ')}.`;
  };

  const allergenDeclaration = [
    formatGroup('CONTIENE', allergensMap.contiene),
    formatGroup('DERIVADOS DE', allergensMap.derivado_de),
    formatGroup('PUEDE CONTENER', allergensMap.puede_contener)
  ].filter(Boolean).join(' ');

  return {
    totalNutrients,
    adjustedNutrients,
    perServing,
    percentDV,
    warnings,
    ingredientBreakdown,
    ingredientList,
    allergenDeclaration
  };
}

export function roundValue(value: number, nutrient: keyof NutrientValues): string {
  const decimals = (ROUNDING_RULES as any)[nutrient] ?? 1;
  return value.toFixed(decimals).replace('.', ',');
}
