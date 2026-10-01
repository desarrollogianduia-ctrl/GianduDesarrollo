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
import { INITIAL_INGREDIENTS } from '../utils/initialData.ts';

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
        // In food science, we need the density or total weight to calculate concentration.
        // We use finalYield if available, otherwise sum of ingredients.
        const subWeight = (subRecipe.finalYield && subRecipe.finalYield > 0)
          ? subRecipe.finalYield
          : (subRecipe.ingredients.reduce((a, b) => a + b.amount, 0) || 1);
        ingValues = {} as any;
        Object.keys(subResult.totalNutrients).forEach(key => {
          (ingValues as any)[key] = ((subResult.totalNutrients as any)[key] / subWeight) * 100;
        });
        name = subRecipe.name;
      }
    } else {
      // Normalize search query
      const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      
      const targetQuery = normalize(ri.note || (typeof ri.ingredientId === 'string' && !ri.ingredientId.startsWith('ing_') ? ri.ingredientId : ''));
      
      // 1. Direct match by ID in provided DB
      let ing = ingredientsDb.find(i => i.id === ri.ingredientId);

      // 2. Fallback: match by ID in built-in INITIAL_INGREDIENTS catalog
      if (!ing) {
        ing = INITIAL_INGREDIENTS.find(i => i.id === ri.ingredientId);
      }

      // 3. Fallback: match by normalized name
      if (!ing && targetQuery) {
        ing = ingredientsDb.find(i => normalize(i.name) === targetQuery) ||
              INITIAL_INGREDIENTS.find(i => normalize(i.name) === targetQuery) ||
              ingredientsDb.find(i => normalize(i.name).includes(targetQuery) || targetQuery.includes(normalize(i.name))) ||
              INITIAL_INGREDIENTS.find(i => normalize(i.name).includes(targetQuery) || targetQuery.includes(normalize(i.name)));
      }

      // 4. Fallback if ri.ingredientId is a catalog ID but DB has different ID
      if (!ing && ri.ingredientId) {
        const catalogItem = INITIAL_INGREDIENTS.find(i => i.id === ri.ingredientId);
        if (catalogItem) {
          ing = ingredientsDb.find(i => normalize(i.name) === normalize(catalogItem.name)) || catalogItem;
        }
      }

      if (ing) {
        ingValues = ing;
        name = ing.name;
      } else {
        name = ri.note || "INGREDIENTE DESCONOCIDO";
      }
    }

    if (!ingValues) {
      // If we can't find nutritional info, we return it with 0s but we must warn the user
      const unknownContribution: NutrientValues = {
        energy: 0, energyKJ: 0, carbs: 0, sugars: 0, totalSugars: 0, addedSugars: 0,
        proteins: 0, totalFats: 0, saturatedFats: 0, transFats: 0, fiber: 0, sodium: 0
      };
      ingredientBreakdown.push({
        name: `⚠️ ${name} (SIN DATOS)`,
        contribution: unknownContribution,
        percentageByWeight: (ri.amount / initialWeight) * 100
      });
      return;
    }

    const carbs = Number(ingValues.carbs) || 0;
    const proteins = Number(ingValues.proteins) || 0;
    const totalFats = Number(ingValues.totalFats) || 0;
    const satFats = Number(ingValues.saturatedFats) || 0;
    const transFats = Number(ingValues.transFats) || 0;
    const fiber = Number(ingValues.fiber) || 0;
    const sodium = Number(ingValues.sodium) || 0;

    // Atwater factor energy calculation if missing or 0
    const atwaterKcal = (carbs * CONVERSION_FACTORS.CARBS_KCAL_PER_G) + 
                        (proteins * CONVERSION_FACTORS.PROTEIN_KCAL_PER_G) + 
                        (totalFats * CONVERSION_FACTORS.FATS_KCAL_PER_G);
    const effectiveEnergy = (ingValues.energy && Number(ingValues.energy) > 0) ? Number(ingValues.energy) : atwaterKcal;
    const effectiveEnergyKJ = (ingValues.energyKJ && Number(ingValues.energyKJ) > 0) 
      ? Number(ingValues.energyKJ) 
      : Math.round(effectiveEnergy * CONVERSION_FACTORS.KCAL_TO_KJ);

    const effectiveTotalSugars = ingValues.totalSugars !== undefined 
      ? Number(ingValues.totalSugars) 
      : (Number(ingValues.sugars) || 0);
    const effectiveAddedSugars = ingValues.addedSugars !== undefined 
      ? Number(ingValues.addedSugars) 
      : ((ingValues as any).functionalGroup === 'azucares' ? effectiveTotalSugars : 0);

    const factor = ri.amount / 100;
    const contribution: NutrientValues = {
      energy: effectiveEnergy * factor,
      energyKJ: effectiveEnergyKJ * factor,
      carbs: carbs * factor,
      sugars: effectiveTotalSugars * factor,
      totalSugars: effectiveTotalSugars * factor,
      addedSugars: effectiveAddedSugars * factor,
      proteins: proteins * factor,
      totalFats: totalFats * factor,
      saturatedFats: satFats * factor,
      transFats: transFats * factor,
      fiber: fiber * factor,
      sodium: sodium * factor,
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
  // In food science (CAA / Codex), all nutrients added in the batch remain in the final batch (only water loss/evaporation occurs).
  // safeFinalYield is the total weight of the finished cooked/frozen batch.
  const safeFinalYield = (recipe.finalYield && Number(recipe.finalYield) > 0) ? Number(recipe.finalYield) : initialWeight;
  const safeServingSize = (recipe.servingSize && Number(recipe.servingSize) > 0) ? Number(recipe.servingSize) : 60; // 60g default for ice cream / pastry

  // Adjusted nutrients for the entire finished batch
  const adjustedNutrients: NutrientValues = { ...totalNutrients };

  // Per 100g of finished product concentration
  const per100g: NutrientValues = {} as any;
  Object.keys(totalNutrients).forEach(key => {
    (per100g as any)[key] = ((totalNutrients as any)[key] / safeFinalYield) * 100;
  });

  // Per serving calculation
  const perServing: NutrientValues = {} as any;
  Object.keys(per100g).forEach(key => {
    (perServing as any)[key] = ((per100g as any)[key] / 100) * safeServingSize;
  });

  // %DV calculation according to CAA (2000 kcal diet)
  const percentDV: Partial<NutrientValues> = {};
  Object.keys(perServing).forEach(key => {
    const dailyVal = (DAILY_VALUES_REFERENCE as any)[key];
    if (dailyVal && dailyVal > 0) {
      (percentDV as any)[key] = ((perServing as any)[key] / dailyVal) * 100;
    }
  });

  // Octagon Warnings (Ley 27.642) - based on 100g or 100ml of finished product
  const warnings: string[] = [];
  const totalKcal = per100g.energy;

  // Sugars > 10% of total energy (added / free sugars per Ley 27.642)
  const evaluatedSugars = (per100g.addedSugars && per100g.addedSugars > 0) ? per100g.addedSugars : (per100g.totalSugars || per100g.sugars);
  const kcalFromSugars = evaluatedSugars * CONVERSION_FACTORS.CARBS_KCAL_PER_G;
  if (totalKcal > 0 && kcalFromSugars >= (totalKcal * LABELING_THRESHOLDS.SUGARS_ENERGY_PERCENT / 100)) {
    warnings.push('EXCESO EN AZÚCARES');
  }

  // Total Fats > 30% of total energy
  const kcalFromFats = per100g.totalFats * CONVERSION_FACTORS.FATS_KCAL_PER_G;
  if (totalKcal > 0 && kcalFromFats >= (totalKcal * LABELING_THRESHOLDS.TOTAL_FATS_ENERGY_PERCENT / 100)) {
    warnings.push('EXCESO EN GRASAS TOTALES');
  }

  // Saturated Fats > 10% of total energy
  const kcalFromSatFats = per100g.saturatedFats * CONVERSION_FACTORS.FATS_KCAL_PER_G;
  if (totalKcal > 0 && kcalFromSatFats >= (totalKcal * LABELING_THRESHOLDS.SAT_FATS_ENERGY_PERCENT / 100)) {
    warnings.push('EXCESO EN GRASAS SATURADAS');
  }

  // Sodium >= 1mg/kcal OR >= 300mg/100g
  if (totalKcal > 0 && (per100g.sodium >= totalKcal * LABELING_THRESHOLDS.SODIUM_RATIO_MG_KCAL || per100g.sodium >= LABELING_THRESHOLDS.SODIUM_MAX_MG_100G)) {
    warnings.push('EXCESO EN SODIO');
  }

  // Calories threshold depends on state (Solid: 275 kcal/100g, Liquid: 25 kcal/100ml)
  const calorieThreshold = recipe.isLiquid 
    ? LABELING_THRESHOLDS.CALORIES_LIQUID_KCAL_100ML 
    : LABELING_THRESHOLDS.CALORIES_SOLID_KCAL_100G;

  if (totalKcal >= calorieThreshold) {
    if (warnings.length > 0) {
      warnings.push('EXCESO EN CALORÍAS');
    }
  }

  // Add warning for unknown ingredients
  const hasUnknownIngredients = ingredientBreakdown.some(ib => ib.name.includes('(SIN DATOS)'));
  if (hasUnknownIngredients) {
    warnings.push('CONTIENE INGREDIENTES SIN DATOS NUTRICIONALES (VALORES SUBESTIMADOS)');
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
    per100g,
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
