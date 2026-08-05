/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NutrientValues {
  energy: number; // kcal
  energyKJ?: number; // kJ
  carbs: number; // g
  sugars: number; // g - usually interpreted as total sugars, but we'll add explicit ones
  totalSugars?: number; // g
  addedSugars?: number; // g
  proteins: number; // g
  totalFats: number; // g
  saturatedFats: number; // g
  transFats: number; // g
  fiber: number; // g
  sodium: number; // mg
}

export type IngredientCategory = 'generico' | 'especifico';
export type FunctionalGroup = 'azucares' | 'lacteos' | 'chocolates' | 'neutros' | 'frutas' | 'pastas' | 'aceites' | 'frutos_secos' | 'aditivos' | 'miscelaneos' | 'otros';
export type RecipeType = 'base' | 'semielaborado' | 'final';
export type RecipeCategory = 'semielaborado' | 'pasteleria' | 'paletas' | 'chocolateria' | 'vitrina' | 'popolo' | 'helados' | 'final' | 'sin_definir';
export type DevelopmentStatus = 'formulacion' | 'informacion_nutricional' | 'creado_en_sistema' | 'finalizado';

export type AllergenType = 'contiene' | 'puede_contener' | 'derivado_de';

export interface AllergenEntry {
  allergen: string;
  type: AllergenType;
}

export interface Ingredient extends NutrientValues {
  id: string;
  name: string;
  brand?: string;
  rnpa?: string;
  technicalSheetUrl?: string;
  certificateUrl?: string;
  category: IngredientCategory;
  functionalGroup?: FunctionalGroup;
  source?: string;
  ingredientList?: string[];
  isSubRecipe?: boolean; // Flag to indicate if this is a calculation from another recipe
  subRecipeId?: string; // Reference to the original recipe if it's a sub-component
  allergens?: AllergenEntry[];
  isGlutenFree?: boolean; // SIN TACC
  isTrialOnly?: boolean; // New: indicates if it's only for a specific trial
  trialQuantity?: string;
  trialBatch?: string;
  trialExpiration?: string;
  confidenceNote?: string;
}

export interface RecipeIngredient {
  ingredientId: string;
  amount: number; // grams
  note?: string; // Optional info for unknown ingredients
  isRecipe?: boolean; // New: indicates the ingredientId is actually a Recipe.id
}

export interface Recipe {
  id: string;
  name: string;
  type: RecipeType;
  category?: RecipeCategory;
  ingredients: RecipeIngredient[];
  servingSize: number; // grams or ml
  servingMeasure?: string; // e.g. "1 pote", "2 bochas"
  totalYield: number; // grams or ml
  finalYield: number; // grams or ml
  portionsPerPackage: number;
  isLiquid?: boolean;
  status: DevelopmentStatus;
  estimatedDevTime?: string;
  sourceProjectId?: string;
  ownerId?: string;
  isTrialFormula?: boolean; // New: is it a trial formulation?
  isSatisfactory?: boolean; // New: was it satisfactory?
  trialCode?: string; // New: links to the specific trial code, e.g. DE-GI-HELA-001A
  projectId?: string; // New: link to DevelopmentProject.id
  isArchived?: boolean; // New: indicates if it's archived
  stock?: number; // Current physical stock
  priority?: 'baja' | 'media' | 'alta'; // Priority for auditing
  createdAt?: number;
  updatedAt?: number;
  // R&D / Trial fields
  isTrial?: boolean;
  trialVersion?: string; // A, B, C...
  procedure?: string;
  observations?: string;
  decoration?: string;
  trialQuantity?: number;
}

export interface TrialIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface CalculationResult {
  totalNutrients: NutrientValues;
  adjustedNutrients: NutrientValues; // adjusted by yield
  perServing: NutrientValues;
  percentDV: Partial<NutrientValues>;
  warnings: string[];
  ingredientBreakdown: {
    name: string;
    contribution: NutrientValues;
    percentageByWeight: number;
  }[];
  ingredientList: string[]; // sorted by weight
  allergenDeclaration: string;
}

export type KnowledgeCategory = 'helados' | 'semielaborados' | 'pasteleria' | 'paletas' | 'popolo' | 'chocolates' | 'vitrina' | 'terceros';
export type KnowledgeType = 'insight' | 'technical_sheet' | 'general';

export interface KnowledgeDocument {
  id: string;
  ownerId?: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  type?: KnowledgeType;
  metadata?: {
    ingredientName?: string;
    originalConversationId?: string;
    tags?: string[];
  };
  createdAt: number;
  updatedAt: number;
}

export type ProductArea = 'pasteleria' | 'paletas' | 'chocolates' | 'helados' | 'popolo' | 'semielaborados' | 'vitrina' | 'terceros';
export type ProjectPriority = 'alta' | 'media' | 'baja';
export type ProjectStatus = 'pendiente' | 'en_progreso' | 'pausado' | 'finalizado' | 'archivado';

export interface ProjectTask {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  deadline?: number;
}

export interface SensoryAnalysis {
  temperature?: string;
  texture?: string;
  flavor?: string;
  hardness?: string;
  decoration?: string;
}

export interface DevelopmentProject {
  id: string;
  code: string;
  productName: string;
  area: ProductArea;
  priority: ProjectPriority;
  status: ProjectStatus;
  trialLetter: string; // A, B, C...
  sequenceNumber: number; // 001-999
  recipeId?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  finishedAt?: number;
  trialExecutionDate?: number;
  testingDate?: number;
  estimatedTime?: string;
  notes?: string;
  prodTrialNotes?: string;
  prodTrialDate?: string;
  prodTrialEquipment?: string;
  prodTrialStartTime?: string;
  prodTrialEndTime?: string;
  tasks?: ProjectTask[];
  sensoryAnalysis?: SensoryAnalysis;
}

export type AuditStatus = 'ok' | 'desvio' | 'arreglado' | 'problema';
export type RNPAStatus = 'al_dia' | 'vencido' | 'pendiente' | 'no_aplica';
export type MPStatus = 'al_dia' | 'faltante_ficha' | 'faltante_cert' | 'no_aplica';
export type ProcedureStatus = 'ok' | 'siguen_hoja' | 'modificar' | 'faltante';

export interface RecipeAudit {
  id: string;
  recipeId: string;
  recipeName: string;
  recipeType: RecipeType;
  date: number;
  auditorId: string;
  status: AuditStatus;
  notes: string;
  isUpdated: boolean;
  rnpaStatus: RNPAStatus;
  mpStatus: MPStatus;
  procedureStatus: ProcedureStatus;
  improvements?: string;
  deviations?: string;
  findings?: string;
  nextReviewDate?: number;
  systemCount?: number;
  physicalCount?: number;
  adjustmentReason?: string;
}

export type WasteReason = 'proceso_calor' | 'proceso_fisico' | 'otro';
export type WastePriority = 'alta' | 'media' | 'baja';
export type WasteStatus = 'pendiente' | 'completado';

export interface ProductionStage {
  id: string;
  name: string;
  timeMinutes: number;
  observations?: string;
  improvement?: string;
}

export interface WasteEntry {
  id: string;
  date: number;
  productId: string;
  productName: string;
  amount: number; // Calculated: initial - final
  unit: string;
  reason: WasteReason;
  area: ProductArea;
  ownerId: string;
  status: WasteStatus;
  priority: WastePriority;
  notes?: string;
  productionTime?: number;
  initialWeight?: number;
  finalWeight?: number;
  stages?: ProductionStage[];
  categoryDetails?: {
    containerType?: string;
    batchNumber?: string;
    shift?: 'mañana' | 'tarde' | 'noche';
    inclusionAmount?: number;
  };
}
