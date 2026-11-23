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
export type DevelopmentStatus = 'formulacion' | 'informacion_nutricional' | 'creado_en_sistema' | 'en_cola' | 'finalizado';

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
  per100g?: NutrientValues; // concentration per 100g or 100ml
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
export type ProjectStatus = 'pendiente' | 'en_progreso' | 'en_cola' | 'pausado' | 'finalizado' | 'archivado';
export type AssignmentArea = 'compras' | 'desarrollo' | 'produccion' | 'sistema' | 'pcp' | 'mantenimiento' | 'logistica';

export interface AreaAssignment {
  area: AssignmentArea;
  date: number; // timestamp
}

export interface RescheduleEntry {
  previousDate: number;
  newDate: number;
  reason: string;
  timestamp: number;
}

export type TaskStatus = 'pendiente' | 'en_curso' | 'pausado' | 'finalizado';

export type TimeLossReason =
  | 'espera_insumo'
  | 'equipo_ocupado'
  | 'consulta_aprobacion'
  | 'reunion_imprevista'
  | 'urgencia_produccion'
  | 'corte_operativo'
  | 'otro';

export interface TaskTimeCut {
  id: string;
  pausedAt: number; // timestamp
  resumedAt?: number; // timestamp
  durationMinutes?: number;
  reason: TimeLossReason;
  customReason?: string;
  note?: string;
}

export interface ProjectTask {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  deadline?: number;
  area?: AssignmentArea;
  assignee?: string;
  dependencyId?: string; // ID of the task that must be completed first
  rescheduleHistory?: RescheduleEntry[];
  
  // Advanced time and interruption tracking
  status?: TaskStatus;
  startTime?: string; // HH:mm format
  endTime?: string;   // HH:mm format
  startedAt?: number; // timestamp
  completedAt?: number; // timestamp
  timeCuts?: TaskTimeCut[];
  totalWorkMinutes?: number;
  totalLostMinutes?: number;
  timeLossCategory?: TimeLossReason;
  timeLossNote?: string;
}

export interface MeetingTopic {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export interface SensoryAnalysis {
  temperature?: string;
  texture?: string;
  flavor?: string;
  hardness?: string;
  decoration?: string;
}

export type DevelopmentCategoryType =
  | 'nuevo_producto'
  | 'mejora_producto'
  | 'reemplazo_insumo'
  | 'optimizacion_costos'
  | 'escalado_industrial'
  | 'terceros'
  | 'otro';

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
  meetingTopics?: MeetingTopic[];
  sensoryAnalysis?: SensoryAnalysis;
  areaAssignments?: AreaAssignment[];
  rescheduleHistory?: RescheduleEntry[];
  isViewed?: boolean;
  // Structured dossier fields for standardized PDF development reports
  developmentType?: DevelopmentCategoryType;
  developmentTypeCustom?: string;
  dossierRequester?: string;
  dossierReason?: string;
  dossierProblem?: string;
  dossierSolution?: string;
  dossierConclusion?: string;
}

export type EventType = 'reunion' | 'tarea' | 'hito' | 'otro';

export interface EventParticipant {
  name: string;
  email?: string;
  role?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: number;
  endDate: number;
  type: EventType;
  color: string;
  participants: EventParticipant[];
  location?: string;
  relatedProjectId?: string;
  ownerId: string;
}
