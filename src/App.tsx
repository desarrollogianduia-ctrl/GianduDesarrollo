/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  useState,
  useMemo,
  useRef,
  ChangeEvent,
  useEffect,
} from "react";
import {
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  FileText,
  Database,
  Scale,
  Copy,
  Check,
  Info,
  AlertTriangle,
  AlertCircle,
  History,
  Save,
  ChevronDown,
  LayoutDashboard,
  UploadCloud,
  Camera,
  Loader2,
  FolderOpen,
  Search,
  FlaskConical,
  Sparkles,
  LogIn,
  LogOut,
  RefreshCw,
  Globe,
  Edit3,
  X,
  Layers,
  Dna,
  Package,
  PlusCircle,
  ArrowRight,
  ChevronLeft as ChevronLeft2, // Prevent overlap if any
  ArrowUp,
  Upload,
  Paperclip,
  GitMerge,
  Combine,
  StickyNote,
  ClipboardCheck,
  ListTodo,
  Calendar,
  Undo2,
  Pause,
  Play,
  Milk,
  Candy,
  Cookie,
  Apple,
  Box,
  Flame,
  Wind,
  HelpCircle,
  Droplets,
  Sprout,
  FlaskRound,
  Wheat,
  Binary,
  Thermometer,
  Fingerprint,
  Utensils,
  Gauge,
  Palette,
  RotateCcw,
  Wrench,
  Clock,
  BookOpen,
  WifiOff,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import * as XLSX from "xlsx";
import { DataManagementModal } from "./components/DataManagementModal";
import { DashboardView } from "./components/DashboardView";
import { NormativasView } from "./components/NormativasView";
import { RecipeAuditView } from "./components/RecipeAuditView";
import { AIAssistant } from "./components/AIAssistant";
import { TrialManager } from "./components/TrialManager";
import { WasteManager } from "./components/WasteManager";
import {
  Ingredient,
  Recipe,
  RecipeCategory,
  RecipeType,
  CalculationResult,
  NutrientValues,
  AllergenEntry,
  AllergenType,
  DevelopmentProject,
  ProductArea,
  ProjectPriority,
  ProjectStatus,
  ProjectTask,
  KnowledgeDocument,
  RecipeAudit,
  WasteEntry,
  WasteReason,
} from "./types";
import { INITIAL_INGREDIENTS, INITIAL_RECIPE } from "./utils/initialData";
import { calculateNutrition, roundValue } from "./services/nutritionService";
import {
  extractRecipeFromMedia,
  matchIngredients,
  searchNutritionalInfo,
  ExtractedRecipe,
  analyzeTrialProgression,
  TrialAnalysisResult,
} from "./services/aiService";
import { auth, signInWithGoogle } from "./lib/firebase";
import {
  subscribeRecipes,
  subscribeIngredients,
  subscribeDevelopments,
  saveRecipe,
  getIngredients,
  saveIngredient,
  deleteRecipe,
  deleteIngredient,
  uploadFile,
  mergeIngredients,
  saveDevelopment,
  deleteDevelopment,
  archiveDevelopment,
  unarchiveDevelopment,
  reopenDevelopment,
  subscribeKnowledgeDocuments,
  saveKnowledgeDocument,
  deleteKnowledgeDocument,
  subscribeRecipeAudits,
  saveRecipeAudit,
  subscribeWastes,
  saveWasteEntry,
  deleteWasteEntry,
} from "./lib/dataService";
import { COMMON_ALLERGENS, CONVERSION_FACTORS } from "./constants";

const PROJECT_AREAS: { id: ProductArea; label: string }[] = [
  { id: "pasteleria", label: "Pastelería" },
  { id: "paletas", label: "Paletas" },
  { id: "chocolates", label: "Chocolatería/Chocolates" },
  { id: "helados", label: "Helados" },
  { id: "popolo", label: "Popolo" },
  { id: "semielaborados", label: "Semielaborados" },
  { id: "vitrina", label: "Vitrina" },
  { id: "terceros", label: "Terceros" },
];

const PROJECT_PRIORITIES = [
  {
    id: "alta",
    label: "Alta",
    color: "bg-red-500/20 text-red-400 border-red-500/20",
  },
  {
    id: "media",
    label: "Media",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/20",
  },
  {
    id: "baja",
    label: "Baja",
    color: "bg-rose-500/20 text-rose-400 border-rose-500/20",
  },
];

const ADMIN_PASSWORD = "gianduia";

type AppView =
  | "dashboard"
  | "recipes"
  | "ingredients"
  | "guide"
  | "developments"
  | "trial_formulas"
  | "asistente_formulacion"
  | "normativas"
  | "conteo_ciclico"
  | "trial_manager"
  | "gestion_costos";

interface ExpandableTextProps {
  text?: string;
  maxChars?: number;
  fallback?: string;
}

function ExpandableText({
  text,
  maxChars = 140,
  fallback = "Sin registros.",
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text || !text.trim()) {
    return <span className="text-white/20 italic font-light">{fallback}</span>;
  }

  const shouldTruncate = text.length > maxChars;
  const displayText = isExpanded
    ? text
    : shouldTruncate
      ? text.substring(0, maxChars) + "..."
      : text;

  return (
    <div className="space-y-1.5 text-left">
      <p className="whitespace-pre-wrap leading-relaxed">{displayText}</p>
      {shouldTruncate && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="text-[9px] text-[var(--accent)] hover:underline font-extrabold uppercase tracking-widest mt-1 bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded transition-all shrink-0 inline-flex items-center gap-1"
        >
          {isExpanded ? "Ver Menos" : "Ver Más"}
        </button>
      )}
    </div>
  );
}

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      console.error("Uncaught error:", e.error);
      setHasError(true);
      setError(e.error);
    };
    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center text-rose-500 mb-4 animate-pulse">
          <AlertTriangle size={40} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-light italic">Se ha producido un error</h1>
          <p className="text-[var(--text-s)] uppercase tracking-widest text-[10px] font-bold">
            Hub de Soluciones Tecnológicas en Alimentos
          </p>
        </div>
        <div className="max-w-md bg-white/5 p-6 rounded-2xl border border-white/10 text-left">
          <p className="text-xs font-mono text-rose-400/80 leading-relaxed overflow-auto max-h-40 custom-scrollbar">
            {error?.message || "Error desconocido en el renderizado."}
          </p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="btn-primary flex items-center gap-2"
        >
          <RefreshCw size={16} />
          <span>Reiniciar Aplicación</span>
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  console.log("App component rendering start...");
  useEffect(() => {
    console.log("App component initialized");
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [ingredients, setIngredients] =
    useState<Ingredient[]>(INITIAL_INGREDIENTS);
  const [recipes, setRecipes] = useState<Recipe[]>([INITIAL_RECIPE]);
  const [developments, setDevelopments] = useState<DevelopmentProject[]>([]);
  const [knowledgeDocuments, setKnowledgeDocuments] = useState<KnowledgeDocument[]>([]);
  const [recipeAudits, setRecipeAudits] = useState<RecipeAudit[]>([]);
  const [wastes, setWastes] = useState<WasteEntry[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(
    INITIAL_RECIPE.id,
  );
  const [view, setView] = useState<AppView>("dashboard");
  const [previousView, setPreviousView] = useState<AppView | null>(null);

  const navigateTo = (newView: AppView) => {
    if (newView !== view) {
      setPreviousView(view);
      setView(newView);
    }
  };

  const getProdTrialDuration = (startTime?: string, endTime?: string) => {
    if (!startTime || !endTime) return null;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;

    let diffMinutes = eh * 60 + em - (sh * 60 + sm);
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60; // crossover midnight
    }

    const h = Math.floor(diffMinutes / 60);
    const m = diffMinutes % 60;
    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m} min`;
  };
  const [isSeeding, setIsSeeding] = useState(false);
  const [isAddingSubRecipe, setIsAddingSubRecipe] = useState(false);
  const [subRecipeSearch, setSubRecipeSearch] = useState("");
  const [isUploading, setIsUploading] = useState<string | null>(null); // 'sheet' | 'cert' | null
  const [isMergeMode, setIsMergeMode] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
  const [mergeSourceIds, setMergeSourceIds] = useState<string[]>([]);

  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProject, setNewProject] = useState<Partial<DevelopmentProject>>({
    productName: "",
    area: "helados",
    priority: "media",
    status: "pendiente",
    estimatedTime: "",
  });
  const [resolvingTrialProject, setResolvingTrialProject] =
    useState<DevelopmentProject | null>(null);
  const [trialNotes, setTrialNotes] = useState("");
  const [sensoryTrialData, setSensoryTrialData] = useState({
    temperature: "",
    texture: "",
    flavor: "",
    hardness: "",
    decoration: "",
  });
  const [trialExecutionDate, setTrialExecutionDate] = useState<string>("");
  const [testingDate, setTestingDate] = useState<string>("");
  const [viewingNotesProject, setViewingNotesProject] =
    useState<DevelopmentProject | null>(null);
  const [expandedDevId, setExpandedDevId] = useState<string | null>(null);
  const [editingDevCodeId, setEditingDevCodeId] = useState<string | null>(null);
  const [codeEditRequest, setCodeEditRequest] = useState<string | null>(null);
  const [adminPassInput, setAdminPassInput] = useState("");
  const [tempDevCode, setTempDevCode] = useState("");
  const [showTaskDashboard, setShowTaskDashboard] = useState(false);
  const [devFilterName, setDevFilterName] = useState("");
  const [devFilterArea, setDevFilterArea] = useState<ProductArea | "todos">(
    "todos",
  );
  const [devFilterPriority, setDevFilterPriority] = useState<
    ProjectPriority | "todos"
  >("todos");
  const [devStatusFilter, setDevStatusFilter] = useState<
    "activos" | "archivados"
  >("activos");

  const [dashboardFilterArea, setDashboardFilterArea] = useState<
    ProductArea | "todos"
  >("todos");
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState("");
  const [recipesSearchQuery, setRecipesSearchQuery] = useState("");
  const [recipeStatusFilter, setRecipeStatusFilter] = useState<
    "activos" | "archivados"
  >("activos");
  const [recipeCategoryFilter, setRecipeCategoryFilter] = useState<
    RecipeCategory | "todos"
  >("todos");
  const [recipeTypeFilter, setRecipeTypeFilter] = useState<
    RecipeType | "todos"
  >("todos");

  const [analyzingDevId, setAnalyzingDevId] = useState<string | null>(null);
  const [trialAnalysis, setTrialAnalysis] =
    useState<TrialAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [ingTargetSearch, setIngTargetSearch] = useState("");

  // Auth Effect
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  // Sync Ingredients
  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeIngredients((data) => {
        // If data is empty but we want to provide a starting point,
        // we could show a prompt, but forcing INITIAL_INGREDIENTS
        // makes deleting the last item impossible or confusing.
        setIngredients(data);
      });
      return unsubscribe;
    } else {
      setIngredients(INITIAL_INGREDIENTS);
    }
  }, [user]);

  // Sync Recipes
  useEffect(() => {
    if (user) {
      const unsubRecipes = subscribeRecipes(user.uid, (data) => {
        setRecipes(data);
      });
      const unsubDevs = subscribeDevelopments(user.uid, (data) => {
        setDevelopments(data);
      });
      const unsubKnowledge = subscribeKnowledgeDocuments(user.uid, (data) => {
        setKnowledgeDocuments(data);
      });
      const unsubAudits = subscribeRecipeAudits((data) => {
        setRecipeAudits(data);
      });
      const unsubWastes = subscribeWastes((data) => {
        setWastes(data);
      });
      return () => {
        unsubRecipes();
        unsubDevs();
        unsubKnowledge();
        unsubAudits();
        unsubWastes();
      };
    }
  }, [user]);

  // Initial selection logic
  useEffect(() => {
    if (recipes.length > 0 && selectedRecipeId === INITIAL_RECIPE.id) {
      setSelectedRecipeId(recipes[0].id);
    }
  }, [recipes, selectedRecipeId]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);

  const handleImport = async (data: {
    ingredients?: Ingredient[];
    recipes?: Recipe[];
    developments?: DevelopmentProject[];
  }) => {
    setIsSeeding(true);
    try {
      if (user) {
        // Import to Firestore
        if (data.ingredients) {
          for (const ing of data.ingredients) {
            await saveIngredient(ing);
          }
        }
        if (data.recipes) {
          for (const recipe of data.recipes) {
            await saveRecipe(recipe, user.uid);
          }
        }
        if (data.developments) {
          for (const dev of data.developments) {
            await saveDevelopment(dev, user.uid);
          }
        }
      } else {
        // Import to local state
        if (data.ingredients) {
          setIngredients((prev) => {
            const newIngs = [...prev];
            data.ingredients!.forEach((ing: Ingredient) => {
              const idx = newIngs.findIndex((i) => i.id === ing.id);
              if (idx >= 0) newIngs[idx] = ing;
              else newIngs.push(ing);
            });
            return newIngs;
          });
        }
        if (data.recipes) {
          setRecipes((prev) => {
            const newRecipes = [...prev];
            data.recipes!.forEach((r: Recipe) => {
              const idx = newRecipes.findIndex((item) => item.id === r.id);
              if (idx >= 0) newRecipes[idx] = r;
              else newRecipes.push(r);
            });
            return newRecipes;
          });
        }
        if (data.developments) {
          setDevelopments((prev) => {
            const newDevs = [...prev];
            data.developments!.forEach((d: DevelopmentProject) => {
              const idx = newDevs.findIndex((item) => item.id === d.id);
              if (idx >= 0) newDevs[idx] = d;
              else newDevs.push(d);
            });
            return newDevs;
          });
        }
      }
      alert("Importación completada con éxito.");
    } catch (error) {
      console.error("Import Error:", error);
      alert("Error al importar: " + (error as Error).message);
    } finally {
      setIsSeeding(false);
    }
  };

  // Derived state
  const selectedRecipe = useMemo(
    () =>
      recipes.find((r) => r.id === selectedRecipeId) ||
      recipes[0] ||
      INITIAL_RECIPE,
    [recipes, selectedRecipeId],
  );

  const nutritionData = useMemo(
    () => calculateNutrition(selectedRecipe, ingredients, recipes),
    [selectedRecipe, ingredients, recipes],
  );

  const recipeTotalWeight = useMemo(
    () => selectedRecipe.ingredients.reduce((acc, i) => acc + i.amount, 0),
    [selectedRecipe.ingredients],
  );

  const filteredRecipesByView = useMemo(() => {
    return recipes.filter((recipe) => {
      const belongsToView =
        view === "trial_formulas"
          ? recipe.isTrialFormula === true
          : !recipe.isTrialFormula;
      if (!belongsToView) return false;

      const isArchived = recipe.isArchived === true;
      if (recipeStatusFilter === "archivados") {
        if (!isArchived) return false;
      } else {
        if (isArchived) return false;
      }

      if (recipeCategoryFilter !== "todos") {
        if (recipe.category !== recipeCategoryFilter) return false;
      }

      if (recipeTypeFilter !== "todos") {
        if (recipe.type !== recipeTypeFilter) return false;
      }

      if (recipesSearchQuery.trim()) {
        const query = recipesSearchQuery.toLowerCase();
        const matchesName = recipe.name.toLowerCase().includes(query);
        const matchesCode =
          recipe.trialCode?.toLowerCase().includes(query) || false;
        return matchesName || matchesCode;
      }
      return true;
    });
  }, [recipes, view, recipesSearchQuery, recipeStatusFilter, recipeCategoryFilter, recipeTypeFilter]);

  const filteredDevelopments = useMemo(() => {
    return developments
      .filter((d) =>
        devStatusFilter === "archivados"
          ? d.status === "archivado"
          : d.status !== "archivado",
      )
      .filter((d) => {
        const matchesName =
          d.productName.toLowerCase().includes(devFilterName.toLowerCase()) ||
          (d.code?.toLowerCase() || "").includes(devFilterName.toLowerCase());
        const matchesArea =
          devFilterArea === "todos" || d.area === devFilterArea;
        const matchesPriority =
          devFilterPriority === "todos" || d.priority === devFilterPriority;

        return matchesName && matchesArea && matchesPriority;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [
    developments,
    devFilterName,
    devFilterArea,
    devFilterPriority,
    devStatusFilter,
  ]);

  const allPendingTasks = useMemo(() => {
    return developments
      .filter((d) => d.status !== "archivado")
      .flatMap((dev) =>
        (dev.tasks || [])
          .filter((t) => !t.completed)
          .map((t) => ({
            ...t,
            projectName: dev.productName,
            projectPriority: dev.priority,
            projectArea: dev.area,
            projectId: dev.id,
          })),
      )
      .sort((a, b) => {
        // Primary: Deadline (sooner first, empty at end)
        if (a.deadline && b.deadline) {
          if (a.deadline !== b.deadline) return a.deadline - b.deadline;
        } else if (a.deadline) {
          return -1; // a comes first
        } else if (b.deadline) {
          return 1; // b comes first
        }

        // Secondary: Priority (High > Medium > Low)
        const priorityScore = { alta: 3, media: 2, baja: 1 };
        const scoreA =
          priorityScore[a.projectPriority as keyof typeof priorityScore] || 0;
        const scoreB =
          priorityScore[b.projectPriority as keyof typeof priorityScore] || 0;
        
        return scoreB - scoreA;
      });
  }, [developments]);

  const [copiedLabel, setCopiedLabel] = useState(false);
  const [ingSearch, setIngSearch] = useState("");
  const [ingCategory, setIngCategory] = useState<string>("all");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Custom Confirmation Dialog State
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    type?: "danger" | "info" | "warning";
  }>({
    show: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const triggerConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    type: "danger" | "info" | "warning" = "info",
    confirmText: string = "Confirmar",
  ) => {
    setConfirmModal({
      show: true,
      title,
      message,
      onConfirm,
      type,
      confirmText,
    });
  };
  const [resolvingIngredient, setResolvingIngredient] = useState<{
    index: number;
    name: string;
    isSearching: boolean;
    data?: Partial<Ingredient>;
  } | null>(null);
  const [isSearchingWeb, setIsSearchingWeb] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const filteredIngredients = useMemo(() => {
    return ingredients
      .filter((i) => {
        const searchLower = ingSearch.toLowerCase();
        const matchesSearch =
          i.name.toLowerCase().includes(searchLower) ||
          (i.brand?.toLowerCase() || "").includes(searchLower) ||
          (i.rnpa?.toLowerCase() || "").includes(searchLower) ||
          (i.ingredientList?.join(" ").toLowerCase() || "").includes(
            searchLower,
          );

        if (ingCategory === "generico")
          return matchesSearch && i.category === "generico";
        if (ingCategory === "especifico")
          return matchesSearch && i.category === "especifico";
        if (ingCategory === "critico") return matchesSearch && i.energy > 300;
        if (ingCategory === "bajo_sodio") return matchesSearch && i.sodium < 50;

        // Handle functional groups
        if (
          [
            "azucares",
            "lacteos",
            "chocolates",
            "neutros",
            "frutas",
            "pastas",
            "otros",
          ].includes(ingCategory)
        ) {
          return matchesSearch && i.functionalGroup === ingCategory;
        }

        return matchesSearch;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [ingredients, ingSearch, ingCategory]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const extracted = await extractRecipeFromMedia(file);
      const matchedIngredients = matchIngredients(extracted, ingredients);

      const newRecipe: Recipe = {
        id: `recipe_${Date.now()}`,
        name: extracted.name || "Receta AI",
        type: "base",
        ingredients: matchedIngredients,
        servingSize: 100,
        servingMeasure: "1 porción",
        totalYield: matchedIngredients.reduce(
          (acc, i) => acc + (i.amount || 0),
          0,
        ),
        finalYield: matchedIngredients.reduce(
          (acc, i) => acc + (i.amount || 0),
          0,
        ),
        portionsPerPackage: 1,
        isLiquid: false,
        status: "formulacion",
        estimatedDevTime: "1 semana",
      };

      if (user) {
        await saveRecipe(newRecipe, user.uid);
      } else {
        setRecipes((prev) => [...prev, newRecipe]);
      }
      setSelectedRecipeId(newRecipe.id);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Error al procesar el archivo",
      );
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExcelUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
      console.log("Starting Robust Excel Import for:", file.name);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      console.log("Sheet Names available:", workbook.SheetNames);

      // Helper for robust numeric parsing
      const parseAmount = (val: any) => {
        if (typeof val === "number") return val;
        if (val === null || val === undefined) return NaN;

        let str = val.toString().trim().replace(/\s/g, "");
        // Handle common unit noise and parentheses
        str = str.replace(/\(.*?\)/g, "");
        str = str.replace(
          /(gramos|grs|gr|g|kg|kilogramos|unidades|uni|u|ml|litros|l|cc)$/i,
          "",
        );

        // Keep only numbers, dots, commas and minus
        str = str.replace(/[^\d.,-]/g, "");

        if (!str) return NaN;

        // Check if it's a fraction like 1/2
        if (str.includes("/")) {
          const parts = str.split("/");
          if (parts.length === 2 && parts[1] !== "0") {
            const num = parseFloat(parts[0].replace(",", "."));
            const den = parseFloat(parts[1].replace(",", "."));
            return num / den;
          }
        }

        // Handle regional formats (comma as decimal vs dot as thousand etc)
        if (str.includes(",") && str.includes(".")) {
          const lastComma = str.lastIndexOf(",");
          const lastDot = str.lastIndexOf(".");
          if (lastComma > lastDot)
            return parseFloat(str.replace(/\./g, "").replace(",", "."));
          return parseFloat(str.replace(/,/g, ""));
        }
        if (str.includes(",")) {
          // If only one comma, it's likely a decimal
          return parseFloat(str.replace(",", "."));
        }
        return parseFloat(str);
      };

      let bestSheetResult: {
        name: string;
        ingredients: { name: string; amount: number }[];
      } | null = null;

      // Try sheets in order of probability
      const sortedSheetNames = [...workbook.SheetNames].sort((a, b) => {
        const aLow = a.toLowerCase();
        const bLow = b.toLowerCase();
        const aScore =
          (aLow.includes("receta") ? 2 : 0) +
          (aLow.includes("formula") ? 2 : 0);
        const bScore =
          (bLow.includes("receta") ? 2 : 0) +
          (bLow.includes("formula") ? 2 : 0);
        return bScore - aScore;
      });

      for (const sheetName of sortedSheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const matrix = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
        if (matrix.length < 1) continue;

        console.log(`Analyzing sheet: ${sheetName} (${matrix.length} rows)`);

        // Scoring system: for each pair of columns (n, a), count valid [Name, Amount] rows
        // We only scan the first 100 rows for scoring to stay fast
        let bestPair = { n: 0, a: 1, score: 0 };
        const sampleRows = matrix.slice(0, 100);
        const maxCols = Math.min(
          20,
          Math.max(...sampleRows.map((r) => (Array.isArray(r) ? r.length : 0))),
        );

        for (let n = 0; n < maxCols; n++) {
          for (let a = 0; a < maxCols; a++) {
            if (n === a) continue;
            let currentScore = 0;
            for (const row of sampleRows) {
              if (!row || !Array.isArray(row)) continue;
              const nameVal = row[n]?.toString().trim();
              const amtVal = parseAmount(row[a]);

              // A valid row has a text column (>2 chars, not a number) and a numeric column (>0)
              if (
                nameVal &&
                nameVal.length > 2 &&
                isNaN(parseFloat(nameVal)) &&
                !isNaN(amtVal) &&
                amtVal > 0
              ) {
                currentScore++;
              }
            }
            if (currentScore > bestPair.score) {
              bestPair = { n, a, score: currentScore };
            }
          }
        }

        if (bestPair.score > 0) {
          const sheetIngredients: { name: string; amount: number }[] = [];
          for (const row of matrix) {
            if (!row || !Array.isArray(row)) continue;
            const name = row[bestPair.n]?.toString().trim();
            const amount = parseAmount(row[bestPair.a]);

            if (
              name &&
              name.length > 2 &&
              isNaN(parseFloat(name)) &&
              !isNaN(amount) &&
              amount > 0
            ) {
              const lowerName = name.toLowerCase();
              if (
                lowerName.includes("total") ||
                lowerName.includes("dosificación") ||
                lowerName.includes("ingredientes") ||
                lowerName.includes("fórmula") ||
                lowerName.includes("subtotal") ||
                lowerName.includes("resumen") ||
                lowerName === "gramos" ||
                lowerName === "cantidad"
              )
                continue;
              sheetIngredients.push({ name, amount });
            }
          }

          if (sheetIngredients.length > 0) {
            if (
              !bestSheetResult ||
              sheetIngredients.length > bestSheetResult.ingredients.length
            ) {
              // Deduce recipe name
              let deducedName = sheetName;
              for (let i = 0; i < Math.min(matrix.length, 10); i++) {
                const row = matrix[i];
                if (!row || !Array.isArray(row)) continue;
                const potTitle = row.find(
                  (c) =>
                    c &&
                    c.toString().length > 3 &&
                    isNaN(parseFloat(c.toString())) &&
                    !c.toString().toLowerCase().includes("ingrediente"),
                );
                if (potTitle) {
                  deducedName = potTitle
                    .toString()
                    .replace(/receta:?\s*/i, "")
                    .trim();
                  break;
                }
              }
              bestSheetResult = {
                name: deducedName,
                ingredients: sheetIngredients,
              };
            }
            // If it's a high-confidence match on a explicitly named sheet, stop searching
            if (
              sheetIngredients.length > 5 &&
              sheetName.toLowerCase().includes("receta")
            )
              break;
          }
        }
      }

      if (!bestSheetResult || bestSheetResult.ingredients.length === 0) {
        throw new Error(
          "No se detectó una estructura de receta (Ingrediente -> Cantidad). Verificá que el Excel tenga los nombres de los insumos y sus pesos en una misma hoja.",
        );
      }

      console.log("Extracted items:", bestSheetResult.ingredients);

      const extracted: ExtractedRecipe = {
        name: bestSheetResult.name,
        ingredients: bestSheetResult.ingredients.map((ei) => ({
          name: ei.name,
          amount: ei.amount,
          unit: "g",
        })),
      };

      const matchedIngredients = matchIngredients(extracted, ingredients);

      const newRecipe: Recipe = {
        id: `recipe_${Date.now()}`,
        name: extracted.name || "Nueva Receta",
        type: "base",
        ingredients: matchedIngredients,
        servingSize: 100,
        servingMeasure: "1 porción",
        totalYield:
          matchedIngredients.reduce((acc, i) => acc + (i.amount || 0), 0) || 1,
        finalYield:
          matchedIngredients.reduce((acc, i) => acc + (i.amount || 0), 0) || 1,
        portionsPerPackage: 1,
        isLiquid: false,
        status: "formulacion",
        estimatedDevTime: "1 semana",
      };

      if (user) {
        console.log("Saving recipe to Firestore...");
        try {
          await saveRecipe(newRecipe, user.uid);
          alert(
            `Receta "${newRecipe.name}" importada exitosamente con ${extracted.ingredients.length} ingredientes.`,
          );
        } catch (saveErr) {
          console.error("Error saving recipe:", saveErr);
          throw new Error(
            "No se pudo guardar la receta en el servidor. Verificá tu conexión.",
          );
        }
      } else {
        setRecipes((prev) => [...prev, newRecipe]);
        alert(
          `Receta "${newRecipe.name}" importada exitosamente (Modo Invitado).`,
        );
      }

      setSelectedRecipeId(newRecipe.id);
    } catch (error) {
      console.error("Excel Import Error:", error);
      alert(
        error instanceof Error
          ? `ERROR: ${error.message}`
          : "Error desconocido al procesar el Excel",
      );
    } finally {
      setIsAnalyzing(false);
      if (excelInputRef.current) excelInputRef.current.value = "";
    }
  };

  const handleWebSync = async (ing: Ingredient) => {
    setIsSearchingWeb(ing.id);
    try {
      const info = await searchNutritionalInfo(ing.name);
      const updatedIng = { ...ing, ...info };
      await saveIngredient(updatedIng);
      setIngredients((prev) =>
        prev.map((i) => (i.id === ing.id ? updatedIng : i)),
      );
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Error al buscar en la web",
      );
    } finally {
      setIsSearchingWeb(null);
    }
  };

  const copyToClipboard = () => {
    const text = generateLabelText(selectedRecipe, nutritionData);
    navigator.clipboard.writeText(text);
    setCopiedLabel(true);
    setTimeout(() => setCopiedLabel(false), 2000);
  };

  const handleIngredientWebSearch = async () => {
    if (!resolvingIngredient?.data?.name) {
      alert("Por favor, ingresa un nombre para buscar.");
      return;
    }

    setResolvingIngredient((prev) =>
      prev ? { ...prev, isSearching: true } : null,
    );
    try {
      const result = await searchNutritionalInfo(
        resolvingIngredient.data.name,
      );
      setResolvingIngredient((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          isSearching: false,
          data: {
            ...prev.data,
            energy: result.energy || prev.data.energy || 0,
            energyKJ: result.energy ? Math.round(result.energy * 4.184) : (prev.data.energyKJ || 0),
            carbs: result.carbs || prev.data.carbs || 0,
            sugars: result.sugars || prev.data.sugars || 0,
            totalSugars: result.sugars || prev.data.totalSugars || 0,
            proteins: result.proteins || prev.data.proteins || 0,
            totalFats: result.totalFats || prev.data.totalFats || 0,
            saturatedFats:
              result.saturatedFats || prev.data.saturatedFats || 0,
            transFats: result.transFats || prev.data.transFats || 0,
            fiber: result.fiber || prev.data.fiber || 0,
            sodium: result.sodium || prev.data.sodium || 0,
            source: result.sourcesUsed,
            confidenceNote: result.confidenceNote,
          },
        };
      });
    } catch (error) {
      console.error(error);
      setResolvingIngredient((prev) =>
        prev ? { ...prev, isSearching: false } : null,
      );
      alert(
        "No se pudo obtener la información nutricional automáticamente. Intenta ingresar los valores manualmente.",
      );
    }
  };

  const handleUpdateRecipe = async (updated: Recipe) => {
    // Optimistic local update
    setRecipes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));

    if (user) {
      try {
        await saveRecipe(updated, user.uid);
      } catch (error) {
        console.error("Error saving recipe:", error);
      }
    }
  };

  // State for confirm deletion
  const [deletingRecipeId, setDeletingRecipeId] = useState<string | null>(null);
  const [deletingDevelopmentId, setDeletingDevelopmentId] = useState<
    string | null
  >(null);

  const handleDeleteRecipe = async (id: string) => {
    try {
      if (user) {
        await deleteRecipe(id);
      } else {
        setRecipes((prev) => prev.filter((r) => r.id !== id));
      }

      // Select another recipe if we deleted the current one
      if (selectedRecipeId === id) {
        const remaining = recipes.filter((r) => r.id !== id);
        if (remaining.length > 0) {
          setSelectedRecipeId(remaining[0].id);
        } else {
          setSelectedRecipeId("");
        }
      }
      setDeletingRecipeId(null);
    } catch (error) {
      console.error("Error deleting recipe:", error);
      alert("Error al eliminar la receta. Verificá tu conexión.");
    }
  };

  const handleDeleteIngredient = async (id: string) => {
    triggerConfirm(
      "Eliminar Insumo",
      "¿Estás seguro de que deseas eliminar este insumo? Esta acción es irreversible y podría afectar recetas existentes.",
      async () => {
        try {
          if (user) {
            await deleteIngredient(id).catch((err) =>
              console.log("Local delete note:", err),
            );
          }
          setIngredients((prev) => prev.filter((i) => i.id !== id));
        } catch (error) {
          console.error("Error deleting ingredient:", error);
          alert("Error al eliminar el insumo.");
        }
      },
      "danger",
      "Eliminar Definitivamente",
    );
  };

  const handleIngredientFileUpload = async (
    e: ChangeEvent<HTMLInputElement>,
    type: "sheet" | "cert",
  ) => {
    const file = e.target.files?.[0];
    if (!file || !resolvingIngredient) return;

    setIsUploading(type);
    try {
      const url = await uploadFile(
        file,
        type === "sheet" ? "technical_sheets" : "certificates",
      );
      setResolvingIngredient({
        ...resolvingIngredient,
        data: {
          ...resolvingIngredient.data,
          [type === "sheet" ? "technicalSheetUrl" : "certificateUrl"]: url,
        },
      });
    } catch (error: any) {
      console.error("Error uploading file:", error);
      let errorMsg = "Error al subir el archivo.";
      if (error.message && error.message.includes("retry-limit-exceeded")) {
        errorMsg =
          "No se pudo conectar con Firebase Storage. Si es la primera vez que usás esta función, asegurate de que Storage esté activado en tu consola de Firebase.";
      }
      alert(errorMsg);
    } finally {
      setIsUploading(null);
    }
  };

  const handleMergeIngredients = async () => {
    if (!mergeTargetId || mergeSourceIds.length === 0) return;
    const targetIng = ingredients.find((i) => i.id === mergeTargetId);
    if (!targetIng) return;

    triggerConfirm(
      "Unificar Insumos",
      `¿Estás seguro de que deseas unificar estos ${mergeSourceIds.length} ingredientes en "${targetIng.name}"? Esto actualizará todas las recetas existentes y eliminará los duplicados.`,
      async () => {
        setIsSeeding(true);
        try {
          if (user) {
            await mergeIngredients(
              targetIng.id,
              mergeSourceIds,
              recipes,
              user.uid,
            );
          } else {
            // Local merge only
            setIngredients((prev) =>
              prev.filter((p) => !mergeSourceIds.includes(p.id)),
            );
          }

          setIsMergeMode(false);
          setMergeTargetId(null);
          setMergeSourceIds([]);
          alert("Unificación completada con éxito.");
        } catch (error) {
          console.error("Error merging:", error);
          alert("Error al unificar ingredientes.");
        } finally {
          setIsSeeding(false);
        }
      },
      "warning",
      "Unificar Ahora",
    );
  };

  const handleSearchWeb = async (index: number, name: string) => {
    setResolvingIngredient({ index, name, isSearching: true });
    try {
      const searchResult = await searchNutritionalInfo(name);
      setResolvingIngredient({
        index,
        name,
        isSearching: false,
        data: {
          name,
          category: "especifico",
          energy: searchResult.energy,
          carbs: searchResult.carbs,
          sugars: searchResult.sugars,
          proteins: searchResult.proteins,
          totalFats: searchResult.totalFats,
          saturatedFats: searchResult.saturatedFats,
          transFats: searchResult.transFats,
          fiber: searchResult.fiber,
          sodium: searchResult.sodium,
          source: searchResult.sourcesUsed,
        },
      });
    } catch (error) {
      console.error(error);
      setResolvingIngredient({
        index,
        name,
        isSearching: false,
        data: { name, category: "especifico" },
      });
    }
  };

  const handleResolveManual = (index: number, name: string) => {
    setResolvingIngredient({
      index,
      name,
      isSearching: false,
      data: { name, category: "especifico" },
    });
  };

  const handleSaveKnowledgeDoc = async (docObj: KnowledgeDocument) => {
    if (!user) return;
    try {
      await saveKnowledgeDocument(docObj, user.uid);
      setKnowledgeDocuments(prev => {
        const exists = prev.findIndex(d => d.id === docObj.id);
        if (exists >= 0) {
          const next = [...prev];
          next[exists] = docObj;
          return next;
        }
        return [...prev, docObj];
      });
    } catch (error) {
      console.error(error);
      alert("Error al guardar documento normativo.");
    }
  };

  const handleDeleteKnowledgeDoc = async (id: string) => {
    try {
      await deleteKnowledgeDocument(id);
      setKnowledgeDocuments(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      console.error(error);
      alert("Error al eliminar documento.");
    }
  };

  const finalizeResolution = async (newIngData: Partial<Ingredient>) => {
    if (!resolvingIngredient) return;

    try {
      // Check for existing ingredient with same name and brand to avoid duplicates
      const existing = ingredients.find(
        (i) =>
          i.name.toLowerCase() === (newIngData.name || "").toLowerCase() &&
          (i.brand || "").toLowerCase() ===
            (newIngData.brand || "").toLowerCase(),
      );

      if (
        existing &&
        !confirm(
          `Ya existe un insumo llamado "${existing.name}"${existing.brand ? ` de marca ${existing.brand}` : ""}. ¿Deseas usar el existente en lugar de crear uno nuevo?`,
        )
      ) {
        // User wants a new one anyway (maybe different nutrition?)
      } else if (existing) {
        // Use existing
        if (selectedRecipe && resolvingIngredient.index !== -1) {
          const newRecipeIngredients = [...selectedRecipe.ingredients];
          if (resolvingIngredient.index < newRecipeIngredients.length) {
            newRecipeIngredients[resolvingIngredient.index] = {
              ...newRecipeIngredients[resolvingIngredient.index],
              ingredientId: existing.id,
            };
          } else {
            newRecipeIngredients.push({
              ingredientId: existing.id,
              amount: 0,
            });
          }
          const updatedRecipe = {
            ...selectedRecipe,
            ingredients: newRecipeIngredients,
          };
          handleUpdateRecipe(updatedRecipe);
        }
        setResolvingIngredient(null);
        return;
      }

      const newIng: Ingredient = {
        ...newIngData,
        id: newIngData.id || `ing_${Date.now()}`,
        name: newIngData.name || "Nuevo Ingrediente",
        category:
          (newIngData.category as "generico" | "especifico") || "especifico",
        functionalGroup: newIngData.functionalGroup || "otros",
        energy: newIngData.energy || 0,
        energyKJ: newIngData.energyKJ || 0,
        carbs: newIngData.carbs || 0,
        sugars: newIngData.sugars || 0,
        totalSugars: newIngData.totalSugars || 0,
        addedSugars: newIngData.addedSugars || 0,
        proteins: newIngData.proteins || 0,
        totalFats: newIngData.totalFats || 0,
        saturatedFats: newIngData.saturatedFats || 0,
        transFats: newIngData.transFats || 0,
        fiber: newIngData.fiber || 0,
        sodium: newIngData.sodium || 0,
        brand: newIngData.brand || "",
        rnpa: newIngData.rnpa || "",
        technicalSheetUrl: newIngData.technicalSheetUrl || "",
        certificateUrl: newIngData.certificateUrl || "",
        source: newIngData.source || "",
        allergens: newIngData.allergens || [],
        isGlutenFree: newIngData.isGlutenFree || false,
        isTrialOnly: newIngData.isTrialOnly || false,
        trialQuantity: newIngData.trialQuantity || "",
        trialBatch: newIngData.trialBatch || "",
        trialExpiration: newIngData.trialExpiration || "",
      } as Ingredient;

      // Save globally
      await saveIngredient(newIng);
      setIngredients((prev) => {
        const exists = prev.findIndex((i) => i.id === newIng.id);
        if (exists >= 0) {
          const copy = [...prev];
          copy[exists] = newIng;
          return copy;
        }
        return [...prev, newIng];
      });

      // Update recipe if index is valid and recipe selected
      if (selectedRecipe && resolvingIngredient.index !== -1) {
        const newRecipeIngredients = [...selectedRecipe.ingredients];
        if (resolvingIngredient.index < newRecipeIngredients.length) {
          newRecipeIngredients[resolvingIngredient.index] = {
            ...newRecipeIngredients[resolvingIngredient.index],
            ingredientId: newIng.id,
          };
        } else {
          newRecipeIngredients.push({
            ingredientId: newIng.id,
            amount: 0,
          });
        }

        const updatedRecipe = {
          ...selectedRecipe,
          ingredients: newRecipeIngredients,
        };
        handleUpdateRecipe(updatedRecipe);
      }

      setResolvingIngredient(null);
    } catch (error) {
      console.error("Error finalizing resolution:", error);
      alert("Error al guardar el nuevo ingrediente.");
    }
  };

  const consolidateIngredients = async () => {
    if (isSeeding) return;

    triggerConfirm(
      "Limpieza Automática",
      "Esta acción buscará insumos con el mismo nombre y marca para fusionarlos. ¿Deseas comenzar la limpieza del almacén?",
      async () => {
        setIsSeeding(true);
        try {
          const groups: Record<string, Ingredient[]> = {};
          ingredients.forEach((i) => {
            const name = i.name.toLowerCase().trim();
            const brand = (i.brand || "").toLowerCase().trim();
            const key = `${name}|${brand}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(i);
          });

          let mergedCount = 0;
          for (const key in groups) {
            const list = groups[key];
            if (list.length > 1) {
              const target = list[0];
              const sources = list.slice(1).map((s) => s.id);
              if (user) {
                await mergeIngredients(target.id, sources, recipes, user.uid);
              } else {
                setIngredients((prev) =>
                  prev.filter((p) => !sources.includes(p.id)),
                );
              }
              mergedCount += sources.length;
            }
          }

          if (mergedCount > 0) {
            alert(
              `Se han consolidado ${mergedCount} duplicados exactos con éxito.`,
            );
          } else {
            const suspects: Record<string, Ingredient[]> = {};
            ingredients.forEach((i) => {
              const root = i.name
                .split(" ")[0]
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]/g, "");
              if (root.length > 2) {
                if (!suspects[root]) suspects[root] = [];
                suspects[root].push(i);
              }
            });

            const suspectsGroups = Object.entries(suspects).filter(
              ([_, list]) => list.length > 1,
            );
            if (suspectsGroups.length > 0) {
              triggerConfirm(
                "Posibles Duplicados",
                `No hallamos nombres idénticos, pero hay ${suspectsGroups.length} grupos con nombres similares (ej: "${suspectsGroups[0][0]}"). ¿Deseas entrar al modo manual para unificarlos?`,
                () => {
                  setIsMergeMode(true);
                  setIngSearch(suspectsGroups[0][0]);
                },
              );
            } else {
              alert("No se encontraron posibles duplicados.");
            }
          }
        } catch (error) {
          console.error("Error consolidating:", error);
          alert("Error al consolidar insumos.");
        } finally {
          setIsSeeding(false);
        }
      },
      "info",
      "Comenzar",
    );
  };

  const handleCreateProject = async () => {
    if (!newProject.productName || !user) return;

    const area = (newProject.area as ProductArea) || "helados";
    const areaCode = area.substring(0, 3).toUpperCase();

    // Sequence number per area
    const areaDevelopments = developments.filter((d) => d.area === area);
    const lastSequence =
      areaDevelopments.length > 0
        ? Math.max(...areaDevelopments.map((d) => d.sequenceNumber || 0))
        : 0;
    const sequenceNum = lastSequence + 1;
    const sequence = sequenceNum.toString().padStart(3, "0");
    const trial = "A";
    const code = `DE-GI-${areaCode}-${sequence}${trial}`;

    const project: DevelopmentProject = {
      id: `dev_${Date.now()}`,
      code,
      productName: newProject.productName,
      area: area,
      priority: (newProject.priority as ProjectPriority) || "media",
      status: "pendiente",
      trialLetter: trial,
      sequenceNumber: sequenceNum,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      startedAt: Date.now(),
      estimatedTime: newProject.estimatedTime,
      createdBy: user.uid,
    };
    try {
      await saveDevelopment(project, user.uid);
      setIsAddingProject(false);
      setNewProject({
        productName: "",
        area: "helados",
        priority: "media",
        status: "pendiente",
        estimatedTime: "",
      });
    } catch (err) {
      console.error(err);
      alert("Error al crear el proyecto.");
    }
  };

  const handleStartProjectFormulation = async (project: DevelopmentProject) => {
    if (!user) return;
    if (project.recipeId) {
      setSelectedRecipeId(project.recipeId);
      navigateTo("trial_formulas");
    } else {
      // Create new recipe
      const newRecipe: Recipe = {
        ...INITIAL_RECIPE,
        id: `recipe_${Date.now()}`,
        name: `${project.productName} (${project.code})`,
        status: "formulacion",
        sourceProjectId: project.id,
        isTrialFormula: true,
        trialCode: project.code,
        ownerId: user.uid,
      };
      await saveRecipe(newRecipe, user.uid);
      const updatedProject = {
        ...project,
        recipeId: newRecipe.id,
        status: "en_progreso" as ProjectStatus,
        updatedAt: Date.now(),
      };
      await saveDevelopment(updatedProject, user.uid);
      setSelectedRecipeId(newRecipe.id);
      navigateTo("trial_formulas");
    }
  };

  const handleCompleteRecipeInTechnicalFormulation = async (
    project: DevelopmentProject,
  ) => {
    if (!user) return;

    let targetRecipeId = project.recipeId;
    if (targetRecipeId) {
      // Buscar receta existente
      const existingRecipe = recipes.find((r) => r.id === targetRecipeId);
      if (existingRecipe) {
        // Si estaba como ensayo, la habilitamos/pasamos a técnica (oficial)
        if (existingRecipe.isTrialFormula) {
          await saveRecipe(
            {
              ...existingRecipe,
              isTrialFormula: false,
              status: "formulacion", // Asegurar que sea editable
            },
            user.uid,
          );
        }
      } else {
        // En caso que el ID exista pero no el registro en local (caso extremo de desincronización)
        const newRecipe: Recipe = {
          ...INITIAL_RECIPE,
          id: targetRecipeId,
          name: project.productName,
          status: "formulacion",
          isTrialFormula: false,
          sourceProjectId: project.id,
          trialCode: project.code,
          ownerId: user.uid,
        };
        await saveRecipe(newRecipe, user.uid);
      }
    } else {
      // Crear nueva receta técnica oficial asociada al proyecto
      const newRecipeId = `recipe_${Date.now()}`;
      const newRecipe: Recipe = {
        ...INITIAL_RECIPE,
        id: newRecipeId,
        name: project.productName,
        status: "formulacion",
        isTrialFormula: false,
        sourceProjectId: project.id,
        trialCode: project.code,
        ownerId: user.uid,
      };
      await saveRecipe(newRecipe, user.uid);

      // Actualizar el proyecto de desarrollo con el link de la receta
      const updatedProject = {
        ...project,
        recipeId: newRecipeId,
        updatedAt: Date.now(),
      };
      await saveDevelopment(updatedProject, user.uid);
      targetRecipeId = newRecipeId;
    }

    // Seleccionar receta e ir al Módulo de Formulación Técnica
    setSelectedRecipeId(targetRecipeId);
    navigateTo("recipes");
  };

  const handleArchiveProject = async (id: string) => {
    triggerConfirm(
      "Archivar Proyecto",
      "¿Deseas archivar este proyecto? Se enviará al histórico y podrás reactivarlo en cualquier momento.",
      async () => {
        try {
          await archiveDevelopment(id);
        } catch (err) {
          console.error(err);
          alert("Error al archivar el proyecto.");
        }
      },
      "warning",
      "Archivar",
    );
  };

  const handleUnarchiveProject = async (id: string) => {
    triggerConfirm(
      "Desarchivar Proyecto",
      "¿Seguro que deseas desarchivar este proyecto? Se moverá de vuelta a la lista de proyectos activos/finalizados.",
      async () => {
        try {
          await unarchiveDevelopment(id);
        } catch (err) {
          console.error(err);
          alert("Error al desarchivar el proyecto.");
        }
      },
      "info",
      "Desarchivar",
    );
  };

  const handleAnalyzeTrials = async (
    dev: DevelopmentProject,
    siblingTrials: DevelopmentProject[],
  ) => {
    setAnalyzingDevId(dev.id);
    setTrialAnalysis(null);
    setAnalysisError(null);
    try {
      const response = await analyzeTrialProgression(
        dev.productName,
        dev.area,
        siblingTrials.map((t) => ({
          trialLetter: t.trialLetter,
          notes: t.notes,
          sensoryAnalysis: t.sensoryAnalysis,
          createdAt: t.createdAt,
          finishedAt: t.finishedAt,
          trialExecutionDate: t.trialExecutionDate,
          testingDate: t.testingDate,
        })),
      );
      setTrialAnalysis(response);
    } catch (err: any) {
      console.error("AI trial progression analysis error:", err);
      setAnalysisError(
        err.message ||
          "No se pudo generar el análisis. Reintenta en unos instantes.",
      );
    }
  };

  const handleReopenProject = async (
    dev: DevelopmentProject,
    onSuccess?: () => void,
  ) => {
    if (!user) return;
    triggerConfirm(
      "Reabrir Proyecto",
      `¿Seguro que deseas reabrir el proyecto "${dev.productName}"? Se moverá de 'Finalizado' a 'En curso' para que puedas seguir editándolo.`,
      async () => {
        try {
          await reopenDevelopment(dev.id, user.uid);

          // Si hay una receta asociada que también está finalizada, la reabrimos para permitir edición
          const associatedRecipe = recipes.find(
            (r) => r.id === dev.recipeId || r.sourceProjectId === dev.id,
          );
          if (associatedRecipe && associatedRecipe.status === "finalizado") {
            await handleUpdateRecipe({
              ...associatedRecipe,
              status: "formulacion",
            });
          }

          if (onSuccess) {
            onSuccess();
          }
        } catch (err) {
          console.error(err);
          alert("Error al reabrir el proyecto.");
        }
      },
      "info",
      "Reabrir",
    );
  };

  const handleUpdateDevelopmentStatus = async (
    dev: DevelopmentProject,
    newStatus: ProjectStatus,
  ) => {
    if (!user) return;
    try {
      if (newStatus === "finalizado") {
        await saveDevelopment(
          {
            ...dev,
            status: "finalizado",
            finishedAt: Date.now(),
            updatedAt: Date.now(),
          },
          user.uid,
        );
      } else if (newStatus === "en_progreso") {
        await saveDevelopment(
          {
            ...dev,
            status: "en_progreso",
            finishedAt: null,
            updatedAt: Date.now(),
          },
          user.uid,
        );
      } else {
        await saveDevelopment(
          { ...dev, status: newStatus, updatedAt: Date.now() },
          user.uid,
        );
      }
    } catch (err) {
      console.error(err);
      alert("Error al actualizar el estado.");
    }
  };

  const handleToggleTask = async (dev: DevelopmentProject, taskId: string) => {
    if (!user) return;
    const updatedTasks = (dev.tasks || []).map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t,
    );
    await saveDevelopment(
      { ...dev, tasks: updatedTasks, updatedAt: Date.now() },
      user.uid,
    );
  };

  const handleAddTask = async (dev: DevelopmentProject) => {
    if (!newTaskText.trim() || !user) return;
    const parsedDeadline = newTaskDeadline
      ? new Date(newTaskDeadline).getTime()
      : undefined;
    const newTask: ProjectTask = {
      id: `task_${Date.now()}`,
      text: newTaskText.trim(),
      completed: false,
      createdAt: Date.now(),
      deadline:
        parsedDeadline && !isNaN(parsedDeadline) ? parsedDeadline : undefined,
    };
    const updatedTasks = [...(dev.tasks || []), newTask];
    await saveDevelopment(
      { ...dev, tasks: updatedTasks, updatedAt: Date.now() },
      user.uid,
    );
    setNewTaskText("");
    setNewTaskDeadline("");
  };

  const handleDeleteTask = async (dev: DevelopmentProject, taskId: string) => {
    if (!user) return;
    const updatedTasks = (dev.tasks || []).filter((t) => t.id !== taskId);
    await saveDevelopment(
      { ...dev, tasks: updatedTasks, updatedAt: Date.now() },
      user.uid,
    );
  };

  const hasPendingTasks = (dev: DevelopmentProject) => {
    return (dev.tasks || []).some((t) => !t.completed);
  };

  const handleDeleteDevelopment = async (id: string, skipConfirm = false) => {
    if (!id || !user) return;

    // Si no pedimos saltar la confirmación, mostramos el modal (o confirm)
    if (!skipConfirm) {
      setDeletingDevelopmentId(id);
      return;
    }

    try {
      await deleteDevelopment(id);
      setDeletingDevelopmentId(null);
    } catch (error) {
      console.error("Error deleting development:", error);
      alert("Error al eliminar el proyecto.");
    }
  };

  const handleResolveTrial = async (result: "formulation" | "new_trial") => {
    if (!resolvingTrialProject || !user) {
      alert("No se pudo identificar el proyecto o el usuario.");
      return;
    }

    try {
      const parsedExecDate = trialExecutionDate
        ? new Date(trialExecutionDate).getTime()
        : undefined;
      const parsedTestDate = testingDate
        ? new Date(testingDate).getTime()
        : undefined;
      const finalTrialExecutionDate =
        parsedExecDate && !isNaN(parsedExecDate) ? parsedExecDate : undefined;
      const finalTestingDate =
        parsedTestDate && !isNaN(parsedTestDate) ? parsedTestDate : undefined;

      if (result === "formulation") {
        triggerConfirm(
          "Finalizar y Formular",
          "¿Seguro que deseas dar por aprobada esta versión? El proyecto se cerrará y se enviará permanentemente al catálogo de recetas de I+D.",
          async () => {
            try {
              const updated: DevelopmentProject = {
                ...resolvingTrialProject,
                status: "finalizado",
                finishedAt: Date.now(),
                trialExecutionDate: finalTrialExecutionDate,
                testingDate: finalTestingDate,
                notes:
                  (resolvingTrialProject.notes
                    ? resolvingTrialProject.notes + "\n"
                    : "") +
                  `Prueba ${resolvingTrialProject.trialLetter || "A"} (OK): ` +
                  trialNotes,
                sensoryAnalysis: sensoryTrialData,
                updatedAt: Date.now(),
                trialLetter: resolvingTrialProject.trialLetter || "A",
                sequenceNumber: resolvingTrialProject.sequenceNumber || 1,
                code: resolvingTrialProject.code || "DE-GI-GEN-000",
              };

              let recipeId = updated.recipeId;
              if (!recipeId) {
                const newRecipe: Recipe = {
                  ...INITIAL_RECIPE,
                  id: `recipe_${Date.now()}`,
                  name: updated.productName,
                  status: "formulacion",
                  sourceProjectId: updated.id,
                  isTrialFormula: false,
                  isSatisfactory: true,
                  trialCode: updated.code,
                  ownerId: user.uid,
                };
                await saveRecipe(newRecipe, user.uid);
                recipeId = newRecipe.id;
                updated.recipeId = recipeId;
              } else {
                // Si ya existe la receta, nos aseguramos de que tenga el ID del proyecto de origen y pase a oficial
                const existingRecipe = recipes.find((r) => r.id === recipeId);
                if (existingRecipe) {
                  await saveRecipe(
                    {
                      ...existingRecipe,
                      sourceProjectId: updated.id,
                      isTrialFormula: false,
                      isSatisfactory: true,
                      trialCode: updated.code,
                    },
                    user.uid,
                  );
                } else {
                  // Si por alguna razón el recipeId estaba seteado pero el registro no existe, lo creamos
                  const newRecipe: Recipe = {
                    ...INITIAL_RECIPE,
                    id: recipeId,
                    name: updated.productName,
                    status: "formulacion",
                    sourceProjectId: updated.id,
                    isTrialFormula: false,
                    isSatisfactory: true,
                    trialCode: updated.code,
                    ownerId: user.uid,
                  };
                  await saveRecipe(newRecipe, user.uid);
                }
              }

              await saveDevelopment(updated, user.uid);
              setSelectedRecipeId(recipeId!);
              navigateTo("recipes");

              // Limpiar estado
              setResolvingTrialProject(null);
              setTrialNotes("");
              setTrialExecutionDate("");
              setTestingDate("");
              setSensoryTrialData({
                temperature: "",
                texture: "",
                flavor: "",
                hardness: "",
                decoration: "",
              });
            } catch (err) {
              console.error(
                "Error in handler of formulation confirmation:",
                err,
              );
              alert(
                "Error al procesar el desarrollo en el catálogo: " +
                  (err instanceof Error ? err.message : String(err)),
              );
            }
          },
          "info",
          "Finalizar y Formular",
        );
      } else {
        const currentLetter = resolvingTrialProject.trialLetter || "A";
        const nextLetter = String.fromCharCode(currentLetter.charCodeAt(0) + 1);
        if (nextLetter > "Z") {
          alert("Se alcanzó el límite de pruebas (Z)");
          return;
        }

        const area = resolvingTrialProject.area || "helados";
        const areaCode = area.substring(0, 3).toUpperCase();
        const sequenceNum = resolvingTrialProject.sequenceNumber || 1;
        const sequence = sequenceNum.toString().padStart(3, "0");
        const newCode = `DE-GI-${areaCode}-${sequence}${nextLetter}`;

        // 1. Mark current version as 'finalizado' (as a completed trial)
        const updatedCurrent: DevelopmentProject = {
          ...resolvingTrialProject,
          status: "finalizado",
          finishedAt: Date.now(),
          trialExecutionDate: finalTrialExecutionDate,
          testingDate: finalTestingDate,
          notes:
            (resolvingTrialProject.notes
              ? resolvingTrialProject.notes + "\n"
              : "") +
            `Prueba ${currentLetter}: ` +
            trialNotes,
          sensoryAnalysis: sensoryTrialData,
          updatedAt: Date.now(),
        };
        await saveDevelopment(updatedCurrent, user.uid);

        // Cloned recipe logic for trial formulation archiving & continuation
        let newRecipeId = resolvingTrialProject.recipeId;
        if (resolvingTrialProject.recipeId) {
          const prevRecipe = recipes.find(
            (r) => r.id === resolvingTrialProject.recipeId,
          );
          if (prevRecipe) {
            // Mark prev formulation as unsatisfactory/cancelled for this specific trial code
            await saveRecipe(
              {
                ...prevRecipe,
                isTrialFormula: true,
                isSatisfactory: false,
                trialCode: resolvingTrialProject.code,
              },
              user.uid,
            );

            // Clone previous formulation for the new trial
            newRecipeId = `recipe_${Date.now()}`;
            const clonedRecipe: Recipe = {
              ...prevRecipe,
              id: newRecipeId,
              name: `${resolvingTrialProject.productName} (${newCode})`,
              sourceProjectId: `dev_${Date.now()}_${nextLetter}`,
              isTrialFormula: true,
              isSatisfactory: undefined,
              trialCode: newCode,
            };
            await saveRecipe(clonedRecipe, user.uid);
          }
        }

        // 2. Create a NEW record for the next trial
        const newTrial: DevelopmentProject = {
          ...resolvingTrialProject,
          id: `dev_${Date.now()}_${nextLetter}`,
          trialLetter: nextLetter,
          code: newCode,
          status: "pendiente",
          notes: updatedCurrent.notes, // Inherit notes history
          createdAt: Date.now(),
          updatedAt: Date.now(),
          startedAt: Date.now(),
          recipeId: newRecipeId,
          trialExecutionDate: undefined,
          testingDate: undefined,
          sensoryAnalysis: undefined,
          finishedAt: undefined,
          prodTrialNotes: undefined,
          prodTrialDate: undefined,
          prodTrialEquipment: undefined,
          prodTrialStartTime: undefined,
          prodTrialEndTime: undefined,
          tasks: resolvingTrialProject.tasks?.map((t) => ({
            ...t,
            completed: false,
          })),
        };
        await saveDevelopment(newTrial, user.uid);

        alert(`Prueba registrada. Nueva versión: ${newCode}`);

        // Limpiar estado
        setResolvingTrialProject(null);
        setTrialNotes("");
        setTrialExecutionDate("");
        setTestingDate("");
        setSensoryTrialData({
          temperature: "",
          texture: "",
          flavor: "",
          hardness: "",
          decoration: "",
        });
      }
    } catch (err) {
      console.error("Error in handleResolveTrial:", err);
      alert(
        "Error al procesar el resultado de la prueba: " +
          (err instanceof Error ? err.message : "Error desconocido"),
      );
    }
  };

  const handleCreateNextTrialInline = (dev: DevelopmentProject) => {
    if (!user) return;
    const currentLetter = dev.trialLetter || "A";
    const nextLetter = String.fromCharCode(currentLetter.charCodeAt(0) + 1);
    if (nextLetter > "Z") {
      alert("Se alcanzó el límite de versiones (Z).");
      return;
    }

    const areaCode = dev.area.substring(0, 3).toUpperCase();
    const sequence = dev.sequenceNumber.toString().padStart(3, "0");
    const newCode = `DE-GI-${areaCode}-${sequence}${nextLetter}`;

    triggerConfirm(
      "Generar Nueva Versión",
      `¿Seguro que deseas cerrar la versión actual (${currentLetter}) y generar una nueva versión de prueba (${nextLetter})? Se creará una fila de desarrollo inicializada en 'Pendiente' con la versión consecutiva con campos limpios.`,
      async () => {
        try {
          // Cloned recipe logic for trial formulation archiving & continuation
          let newRecipeId = dev.recipeId;
          if (dev.recipeId) {
            const prevRecipe = recipes.find((r) => r.id === dev.recipeId);
            if (prevRecipe) {
              // Mark prev formulation as unsatisfactory/cancelled for this specific trial code
              await saveRecipe(
                {
                  ...prevRecipe,
                  isTrialFormula: true,
                  isSatisfactory: false,
                  trialCode: dev.code,
                },
                user.uid,
              );

              // Clone previous formulation for the new trial
              newRecipeId = `recipe_${Date.now()}`;
              const clonedRecipe: Recipe = {
                ...prevRecipe,
                id: newRecipeId,
                name: `${dev.productName} (${newCode})`,
                sourceProjectId: `dev_${Date.now()}_${nextLetter}`,
                isTrialFormula: true,
                isSatisfactory: undefined,
                trialCode: newCode,
              };
              await saveRecipe(clonedRecipe, user.uid);
            }
          }

          await saveDevelopment(
            {
              ...dev,
              status: "finalizado",
              finishedAt: Date.now(),
              updatedAt: Date.now(),
            },
            user.uid,
          );
          await saveDevelopment(
            {
              ...dev,
              id: `dev_${Date.now()}_${nextLetter}`,
              trialLetter: nextLetter,
              code: newCode,
              status: "pendiente",
              createdAt: Date.now(),
              updatedAt: Date.now(),
              startedAt: Date.now(),
              recipeId: newRecipeId,
              trialExecutionDate: undefined,
              testingDate: undefined,
              sensoryAnalysis: undefined,
              finishedAt: undefined,
              prodTrialNotes: undefined,
              prodTrialDate: undefined,
              prodTrialEquipment: undefined,
              prodTrialStartTime: undefined,
              prodTrialEndTime: undefined,
              tasks: dev.tasks?.map((t) => ({ ...t, completed: false })),
            },
            user.uid,
          );
        } catch (err) {
          console.error("Error creating inline trial version:", err);
          alert("Error al generar nueva prueba.");
        }
      },
      "info",
      "Generar Versión",
    );
  };

  const seedDatabase = async () => {
    setIsSeeding(true);
    try {
      for (const ing of INITIAL_INGREDIENTS) {
        await saveIngredient(ing);
      }
      const updatedIngs = await getIngredients();
      setIngredients(updatedIngs);
      alert("Base de datos inicializada con éxito.");
    } catch (error) {
      alert("Error al inicializar la base de datos.");
    } finally {
      setIsSeeding(false);
    }
  };

  const addIngredientToRecipe = (ingId: string) => {
    const updated = {
      ...selectedRecipe,
      ingredients: [
        ...selectedRecipe.ingredients,
        { ingredientId: ingId, amount: 0 },
      ],
    };
    handleUpdateRecipe(updated);
  };

  const removeIngredientFromRecipe = (index: number) => {
    if (!selectedRecipe) return;

    triggerConfirm(
      "Quitar Componente",
      "¿Seguro que deseas quitar este componente de la fórmula?",
      () => {
        const updated = {
          ...selectedRecipe,
          ingredients: selectedRecipe.ingredients.filter((_, i) => i !== index),
        };
        handleUpdateRecipe(updated);
      },
      "danger",
      "Quitar",
    );
  };

  return (
    <div className="fixed inset-0 flex bg-[var(--bg)] text-[var(--text-p)] font-sans selection:bg-[var(--accent)] selection:text-white overflow-hidden">
      <ErrorBoundary>
        {/* Global Sidebar Navigation */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarCollapsed ? 80 : 240 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="border-r border-[var(--border)] bg-[var(--surface)] flex flex-col py-6 z-40 shrink-0 relative overflow-hidden"
      >
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-10 w-6 h-6 bg-[var(--accent)] text-white rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(255,107,129,0.3)] hover:scale-110 active:scale-95 transition-all z-50 border-2 border-[var(--surface)]"
        >
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className={`px-6 mb-10 flex items-center gap-3 overflow-hidden transition-all ${isSidebarCollapsed ? "justify-center px-2" : ""}`}>
          <div className="w-10 h-10 bg-[var(--accent)] rounded-xl flex items-center justify-center font-bold text-white shrink-0 shadow-lg shadow-[var(--accent)]/10">
            GL
          </div>
          {!isSidebarCollapsed && (
            <motion.h1 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm font-black tracking-[3px] text-[var(--accent)] uppercase whitespace-nowrap"
            >
              GIANDUIA<span className="text-white">LAB</span>
            </motion.h1>
          )}
        </div>

        <nav className="flex-1 px-3 space-y-2 overflow-hidden">
          {[
            { id: "dashboard", icon: LayoutDashboard, label: "Panel General" },
            { id: "developments", icon: GitMerge, label: "Tabla de Desarrollo" },
            { id: "recipes", icon: FlaskConical, label: "Formulación Técnica" },
            { id: "ingredients", icon: Database, label: "Almacén I+D" },
            { id: "trial_manager", icon: FlaskRound, label: "Laboratorio I+D" },
            { id: "guide", icon: FileText, label: "Normativas" },
            { id: "conteo_ciclico", icon: ClipboardCheck, label: "Conteo Cíclico" },
            { id: "gestion_costos", icon: Trash2, label: "Gestión de Costos" },
            { id: "asistente_formulacion", icon: Sparkles, label: "Asistente Formulación" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => navigateTo(item.id as any)}
              className={`w-full flex items-center transition-all group relative overflow-hidden rounded-xl ${isSidebarCollapsed ? "justify-center py-4" : "gap-4 px-4 py-3"} ${view === item.id ? "bg-[var(--accent)] text-white shadow-xl shadow-[var(--accent)]/30 scale-[1.02]" : "text-[var(--text-s)] hover:text-white hover:bg-white/5 active:scale-95"}`}
              title={isSidebarCollapsed ? item.label : ""}
            >
              <div className="relative shrink-0">
                <item.icon
                  size={22}
                  className={
                    view === item.id ? "text-white" : "group-hover:text-[var(--accent)]"
                  }
                />
                {item.id === "developments" &&
                  developments.some(hasPendingTasks) && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[var(--surface)] animate-pulse" />
                  )}
              </div>
              {!isSidebarCollapsed && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-[11px] uppercase tracking-[1.5px] font-bold whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-3 mt-auto space-y-4">
          {/* Data Management Section */}
          <div className={`space-y-1 ${isSidebarCollapsed ? "flex flex-col items-center" : "px-3"}`}>
            {!isSidebarCollapsed && (
              <p className="text-[9px] uppercase tracking-[3px] font-black text-white/10 mb-3 px-1">
                Sincronización
              </p>
            )}
            
            <button
              onClick={() => setIsDataModalOpen(true)}
              className={`flex items-center rounded-lg text-[var(--text-s)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all group ${isSidebarCollapsed ? "w-12 h-12 justify-center" : "w-full gap-4 px-3 py-2"}`}
              title="Gestión de Datos"
            >
              <div className="shrink-0"><Database size={20} /></div>
              {!isSidebarCollapsed && <span className="text-[10px] font-bold uppercase tracking-widest">Sincronizar</span>}
            </button>
          </div>

          <div className={`flex items-center gap-4 ${isSidebarCollapsed ? "flex-col" : "px-3"}`}>
            <div
              className={`w-10 h-10 bg-[#333] rounded-full border-2 border-[var(--border)] overflow-hidden cursor-pointer shrink-0 hover:border-[var(--accent)] transition-colors ${isSidebarCollapsed ? "" : ""}`}
              onClick={() => user && signOut(auth)}
            >
              {user ? (
                <img
                  src={user.photoURL || ""}
                  alt="User"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-rose-500/20 to-transparent flex items-center justify-center">
                  <LogIn size={20} className="opacity-40" />
                </div>
              )}
            </div>
            
            {!isSidebarCollapsed && user && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 min-w-0"
              >
                <p className="text-[10px] font-bold text-white truncate">
                  {user.displayName}
                </p>
                <p className="text-[9px] text-[var(--text-s)] truncate opacity-60">
                  I+D Manager
                </p>
              </motion.div>
            )}
            
            {user && (
               <button
                onClick={() => signOut(auth)}
                className={`text-[var(--text-s)] hover:text-red-400 transition-all flex items-center gap-2 ${isSidebarCollapsed ? "w-12 h-12 justify-center" : "px-1"}`}
                title="Cerrar Sesión"
              >
                <LogOut size={isSidebarCollapsed ? 20 : 14} />
                {!isSidebarCollapsed && (
                  <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
                    Salir
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      {/* Date Formatter Helper */}
      {(() => {
        (window as any).formatTinyDate = (ts?: number) => {
          if (!ts) return "-";
          return new Date(ts).toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
          });
        };
        return null;
      })()}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {/* Top Header Barra de Estado */}
        <header className="h-[60px] px-8 flex items-center justify-between bg-[var(--bg)] border-b border-[var(--border)] shrink-0 z-30">
          <div className="flex items-center gap-4">
            {view !== "dashboard" && (
              <button
                onClick={() => {
                  if (
                    window.confirm("¿Estás seguro de que quieres volver atrás?")
                  ) {
                    if (previousView) {
                      setView(previousView);
                      setPreviousView(null);
                    } else {
                      setView("dashboard");
                    }
                    setSelectedRecipeId(null);
                  }
                }}
                className="p-3 text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-xl transition-all mr-2 group"
                title="Volver"
              >
                <ChevronLeft
                  size={24}
                  className="group-hover:-translate-x-1 transition-transform"
                />
              </button>
            )}
            <h2 className="text-xl font-light italic">
              {view === "dashboard" && "Panel General"}
              {view === "developments" && "Tabla de Desarrollo"}
              {view === "trial_formulas" && "Módulo de Formulación de Pruebas"}
              {view === "recipes" && "Formulación Técnica"}
              {view === "ingredients" && "Almacén I+D"}
              {view === "trial_manager" && "Laboratorio I+D (Pruebas)"}
              {view === "guide" && "Normativas"}
              {view === "asistente_formulacion" && "Asistente de Formulación AI"}
              {view === "gestion_costos" && "Gestión de Costos"}
            </h2>
            <div className="badge">LAB Hub v3.0</div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest text-[var(--text-s)] font-bold">
                Ultima Sincronización
              </span>
              <span className="text-[10px] font-mono opacity-40">
                HOY - 14:15:32
              </span>
            </div>
            <button className="p-2 text-[var(--text-s)] hover:text-white transition-all bg-[var(--surface)] rounded-lg border border-[var(--border)]">
              <RefreshCw size={16} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col">
          {authLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="animate-spin text-[var(--accent)]" size={48} />
                  <span className="text-[10px] font-black uppercase tracking-[4px] text-white/20 animate-pulse">
                    Iniciando Sistema...
                  </span>
                </div>
              </div>
            ) : !user ? (
            <div className="flex h-full flex-col items-center justify-center gap-6">
              <div className="text-center space-y-2">
                <h2 className="text-4xl font-light italic">Gianduia Lab</h2>
                <p className="text-[var(--text-s)] uppercase tracking-widest text-xs font-bold">
                  Hub de Soluciones Tecnológicas en Alimentos
                </p>
              </div>
              
              {loginError && (
                <div className="max-w-md bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg text-sm text-center animate-in fade-in zoom-in duration-300">
                  {loginError}
                </div>
              )}

              <button
                onClick={async () => {
                  setLoginError(null);
                  try {
                    await signInWithGoogle();
                  } catch (err: any) {
                    setLoginError(err.message || "Error al iniciar sesión");
                  }
                }}
                className="btn-primary flex items-center gap-3 px-8 transform hover:scale-105 active:scale-95 duration-200"
              >
                <LogIn size={20} />
                <span>Ingresar con Google</span>
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {view === "dashboard" && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="p-8 custom-scrollbar overflow-y-auto h-full"
                >
                  <DashboardView 
                    developments={developments}
                    recipes={recipes}
                  />
                </motion.div>
              )}

              {view === "normativas" && (
                <motion.div
                  key="normativas"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full overflow-hidden"
                >
                  <NormativasView />
                </motion.div>
              )}

              {view === "asistente_formulacion" && (
                <motion.div
                  key="asistente_formulacion"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full overflow-hidden"
                >
                  <AIAssistant 
                    developments={developments}
                    recipes={recipes}
                    ingredients={ingredients}
                    knowledge={knowledgeDocuments}
                    onSaveKnowledge={handleSaveKnowledgeDoc}
                    onDeleteKnowledge={handleDeleteKnowledgeDoc}
                  />
                </motion.div>
              )}

              {view === "conteo_ciclico" && user && (
                <motion.div
                  key="conteo_ciclico"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full overflow-y-auto custom-scrollbar p-8"
                >
                  <RecipeAuditView
                    recipes={recipes}
                    ingredients={ingredients}
                    audits={recipeAudits}
                    onSaveAudit={async (audit) => {
                      await saveRecipeAudit(audit);
                    }}
                    onUpdateRecipe={async (recipe) => {
                      await saveRecipe(recipe, user.uid);
                    }}
                    userId={user.uid}
                  />
                </motion.div>
              )}

              {view === "guide" && (
                <motion.div
                  key="normativas_legacy"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full overflow-hidden"
                >
                  <NormativasView />
                </motion.div>
              )}

              {view === "gestion_costos" && user && (
                <motion.div
                  key="gestion_costos"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full overflow-y-auto custom-scrollbar"
                >
                  <WasteManager 
                    wastes={wastes}
                    recipes={recipes}
                    ingredients={ingredients}
                    onSaveWaste={async (w) => {
                      await saveWasteEntry(w);
                    }}
                    onDeleteWaste={async (id) => {
                      await deleteWasteEntry(id);
                    }}
                    userId={user.uid}
                  />
                </motion.div>
              )}

              {view === "developments" && (
                <motion.div
                  key="developments"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 h-full overflow-y-auto custom-scrollbar flex flex-col p-8 space-y-8 min-w-0 w-full max-w-full overflow-x-hidden"
                >
                  <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                    <div className="space-y-1">
                      <div className="pane-title">Dashboard Operativo</div>
                      <h2 className="text-3xl font-light italic font-serif">
                        Tabla de Desarrollos
                      </h2>
                    </div>
                    <div className="flex items-center gap-4">
                      {developments.some(hasPendingTasks) && (
                        <div className="hidden lg:flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 px-5 py-2.5 rounded-full animate-pulse">
                          <AlertCircle size={16} className="text-rose-500" />
                          <span className="text-[10px] font-bold uppercase text-rose-500 tracking-wider">
                            Pendientes de Acción Directa
                          </span>
                        </div>
                      )}
                      <button
                        onClick={() => setIsAddingProject(true)}
                        className="btn-primary flex items-center gap-2"
                      >
                        <Plus size={18} />
                        <span>Nuevo Proyecto</span>
                      </button>
                    </div>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                      {
                        l: "Pendientes",
                        v: developments.filter((d) => d.status === "pendiente")
                          .length,
                        c: "text-white/40",
                      },
                      {
                        l: "En Progreso",
                        v: developments.filter(
                          (d) => d.status === "en_progreso",
                        ).length,
                        c: "text-rose-400",
                      },
                      {
                        l: "Testeo Hoy/Prox",
                        v: developments.filter(
                          (d) => d.testingDate && d.status !== "finalizado",
                        ).length,
                        c: "text-purple-400",
                      },
                      {
                        l: "Tareas Totales",
                        v: developments.reduce(
                          (acc, d) =>
                            acc +
                            (d.tasks || []).filter((t) => !t.completed).length,
                          0,
                        ),
                        c: "text-amber-400",
                      },
                    ].map((s, i) => (
                      <div
                        key={i}
                        className="bg-white/5 border border-white/5 p-5 rounded-[24px]"
                      >
                        <p className="text-[9px] uppercase font-bold text-white/40 tracking-[0.2em] mb-1">
                          {s.l}
                        </p>
                        <p className={`text-2xl font-light ${s.c}`}>{s.v}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 items-center bg-white/5 border border-white/10 p-6 rounded-[32px] shrink-0">
                    <div className="relative flex-1 w-full">
                      <Search
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
                        size={18}
                      />
                      <input
                        type="text"
                        placeholder="Buscar por nombre o código..."
                        value={devFilterName}
                        onChange={(e) => setDevFilterName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-[var(--accent)] transition-all text-white"
                      />
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                      <select
                        value={devStatusFilter}
                        onChange={(e) =>
                          setDevStatusFilter(
                            e.target.value as "activos" | "archivados",
                          )
                        }
                        className="bg-[#1e1e1e] border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-[var(--accent)] transition-all cursor-pointer text-white font-semibold text-rose-400"
                      >
                        <option value="activos">Proyectos Activos</option>
                        <option value="archivados">Proyectos Archivados</option>
                      </select>
                      <select
                        value={devFilterArea}
                        onChange={(e) =>
                          setDevFilterArea(
                            e.target.value as ProductArea | "todos",
                          )
                        }
                        className="bg-[#1e1e1e] border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-[var(--accent)] transition-all cursor-pointer text-white"
                      >
                        <option value="todos">Todas las Áreas</option>
                        {PROJECT_AREAS.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={devFilterPriority}
                        onChange={(e) =>
                          setDevFilterPriority(
                            e.target.value as ProjectPriority | "todos",
                          )
                        }
                        className="bg-[#1e1e1e] border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-[var(--accent)] transition-all cursor-pointer text-white"
                      >
                        <option value="todos">Prioridades</option>
                        <option value="alta">Alta</option>
                        <option value="media">Media</option>
                        <option value="low">Baja</option>
                      </select>
                      <button
                        onClick={() => setShowTaskDashboard(!showTaskDashboard)}
                        className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 border ${
                          showTaskDashboard
                            ? "bg-amber-500/20 border-amber-500/50 text-amber-500 hover:bg-amber-500/30"
                            : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <ListTodo size={18} />
                        {showTaskDashboard
                          ? "Ocultar Tareas"
                          : "Panel de Tareas"}
                        {allPendingTasks.length > 0 && !showTaskDashboard && (
                          <span className="bg-amber-500 text-black text-[10px] px-1.5 py-0.5 rounded-full">
                            {allPendingTasks.length}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Task Dashboard - New Feature */}
                  {showTaskDashboard && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-amber-500/5 border border-amber-500/20 rounded-[32px] p-8 shrink-0 mb-8"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-500">
                            <Calendar size={24} />
                          </div>
                          <div>
                            <h2 className="text-2xl font-light text-white tracking-tight">
                              Tareas Semanales{" "}
                              <span className="text-amber-500/60 font-mono ml-2 text-sm italic">
                                Organizador Global
                              </span>
                            </h2>
                            <p className="text-white/40 text-xs mt-1">
                              Todas las tareas pendientes de tus proyectos en
                              curso.
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-display font-light text-amber-500 leading-none">
                            {allPendingTasks.length}
                          </div>
                          <div className="text-[10px] text-white/30 uppercase tracking-widest mt-1">
                            Pendientes
                          </div>
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-2xl border border-white/5 bg-black/20">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-white/5">
                              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold border-b border-white/5">
                                Producto Asociado
                              </th>
                              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold border-b border-white/5">
                                Tarea
                              </th>
                              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold border-b border-white/5">
                                Prioridad
                              </th>
                              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold border-b border-white/5">
                                Vencimiento
                              </th>
                              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold border-b border-white/5">
                                Acción
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {allPendingTasks.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="px-6 py-12 text-center text-white/30 italic text-sm"
                                >
                                  No hay tareas pendientes en proyectos activos.
                                </td>
                              </tr>
                            ) : (
                              allPendingTasks.map((task) => (
                                <tr
                                  key={task.id}
                                  className="hover:bg-white/[0.02] transition-colors group"
                                >
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      <span className="text-white font-medium">
                                        {task.projectName}
                                      </span>
                                      <span
                                        className={`text-[8px] px-1.5 py-0.5 rounded border border-white/10 text-white/40 uppercase`}
                                      >
                                        {task.projectArea}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="text-white/70 text-sm">
                                      {task.text}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span
                                      className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${
                                        task.projectPriority === "alta"
                                          ? "bg-rose-500/20 text-rose-400"
                                          : task.projectPriority === "media"
                                            ? "bg-amber-500/20 text-amber-400"
                                            : "bg-emerald-500/20 text-emerald-400"
                                      }`}
                                    >
                                      {task.projectPriority}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    {task.deadline ? (
                                      <div className="flex items-center gap-1.5">
                                        <Calendar
                                          size={12}
                                          className={
                                            !task.completed &&
                                            task.deadline < Date.now()
                                              ? "text-rose-500"
                                              : "text-white/20"
                                          }
                                        />
                                        <span
                                          className={`text-[10px] font-bold uppercase tracking-wider ${
                                            !task.completed &&
                                            task.deadline < Date.now()
                                              ? "text-rose-500"
                                              : "text-white/40"
                                          }`}
                                        >
                                          {new Date(
                                            task.deadline,
                                          ).toLocaleDateString("es-AR", {
                                            day: "2-digit",
                                            month: "2-digit",
                                          })}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-white/10 text-[10px] uppercase font-bold tracking-widest">
                                        ---
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    <button
                                      onClick={async () => {
                                        if (!user) return;
                                        const dev = developments.find(
                                          (d) => d.id === task.projectId,
                                        );
                                        if (dev) {
                                          const updatedTasks = (
                                            dev.tasks || []
                                          ).map((t) =>
                                            t.id === task.id
                                              ? { ...t, completed: true }
                                              : t,
                                          );
                                          try {
                                            await saveDevelopment(
                                              {
                                                ...dev,
                                                tasks: updatedTasks,
                                                updatedAt: Date.now(),
                                              },
                                              user.uid,
                                            );
                                          } catch (err) {
                                            console.error(
                                              "Error updating task from dashboard:",
                                              err,
                                            );
                                          }
                                        }
                                      }}
                                      className="p-2 bg-white/5 hover:bg-emerald-500/20 text-white/20 hover:text-emerald-500 rounded-lg transition-all"
                                      title="Marcar como completada"
                                    >
                                      <Check size={16} />
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}

                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[32px] overflow-hidden shadow-2xl shrink-0 w-full max-w-full min-w-0">
                    <div className="overflow-x-auto custom-scrollbar w-full">
                      <table className="w-full text-left border-collapse min-w-[1360px]">
                        <thead>
                          <tr className="bg-white/5 border-b border-[var(--border)]">
                            <th className="px-6 py-5 text-[9px] uppercase font-bold text-[var(--accent)] tracking-[0.2em] whitespace-nowrap">
                              Código
                            </th>
                            <th className="px-6 py-5 text-[9px] uppercase font-bold text-[var(--accent)] tracking-[0.2em]">
                              Producto
                            </th>
                            <th className="px-6 py-5 text-[9px] uppercase font-bold text-[var(--accent)] tracking-[0.2em] whitespace-nowrap">
                              Ingreso / Fin
                            </th>
                            <th className="px-6 py-5 text-[9px] uppercase font-bold text-[var(--accent)] tracking-[0.2em] whitespace-nowrap">
                              Realización / Testeo
                            </th>
                            <th className="px-6 py-5 text-[9px] uppercase font-bold text-[var(--accent)] tracking-[0.2em] whitespace-nowrap">
                              Receta Técnica
                            </th>
                            <th className="px-10 py-5 text-[9px] uppercase font-bold text-[var(--accent)] tracking-[0.2em] text-center">
                              Prioridad
                            </th>
                            <th className="px-6 py-5 text-[9px] uppercase font-bold text-[var(--accent)] tracking-[0.2em] text-center">
                              Estado
                            </th>
                            <th className="px-6 py-5 text-[9px] uppercase font-bold text-[var(--accent)] tracking-[0.2em] text-right">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {filteredDevelopments.length === 0 ? (
                            <tr>
                              <td
                                colSpan={8}
                                className="p-20 text-center text-[var(--text-s)] font-light italic text-xl"
                              >
                                No hay proyectos que coincidan con los filtros.
                              </td>
                            </tr>
                          ) : (
                            filteredDevelopments.map((dev) => (
                              <React.Fragment key={dev.id}>
                                <tr
                                  onClick={(e) => {
                                    // Only expand if we are not clicking an action button
                                    if (
                                      (e.target as HTMLElement).closest(
                                        "button",
                                      )
                                    )
                                      return;
                                    setExpandedDevId(
                                      expandedDevId === dev.id ? null : dev.id,
                                    );
                                  }}
                                  className={`hover:bg-white/[0.03] group/row transition-all cursor-pointer ${expandedDevId === dev.id ? "bg-white/[0.02]" : ""}`}
                                >
                                  <td className="px-6 py-6">
                                    <div className="flex flex-col gap-2">
                                      <div className="flex items-center gap-2 group/code">
                                        {editingDevCodeId === dev.id ? (
                                          <div
                                            className="flex items-center gap-2"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <input
                                              autoFocus
                                              value={tempDevCode}
                                              onChange={(e) =>
                                                setTempDevCode(e.target.value)
                                              }
                                              onKeyDown={async (e) => {
                                                if (e.key === "Enter") {
                                                  await saveDevelopment(
                                                    {
                                                      ...dev,
                                                      code: tempDevCode,
                                                      updatedAt: Date.now(),
                                                    },
                                                    user?.uid || "",
                                                  );
                                                  setEditingDevCodeId(null);
                                                } else if (e.key === "Escape") {
                                                  setEditingDevCodeId(null);
                                                }
                                              }}
                                              className="bg-white/10 border border-[var(--accent)] text-[11px] px-3 py-1 rounded-lg outline-none text-[var(--accent)] font-mono w-40"
                                            />
                                            <button
                                              onClick={async () => {
                                                await saveDevelopment(
                                                  {
                                                    ...dev,
                                                    code: tempDevCode,
                                                    updatedAt: Date.now(),
                                                  },
                                                  user?.uid || "",
                                                );
                                                setEditingDevCodeId(null);
                                              }}
                                              className="p-1.5 bg-emerald-500/20 text-emerald-500 rounded-md hover:bg-emerald-500 hover:text-white transition-all"
                                            >
                                              <Check size={12} />
                                            </button>
                                            <button
                                              onClick={() =>
                                                setEditingDevCodeId(null)
                                              }
                                              className="p-1.5 bg-white/5 text-white/40 rounded-md hover:bg-white/10 transition-all"
                                            >
                                              <X size={12} />
                                            </button>
                                          </div>
                                        ) : codeEditRequest === dev.id ? (
                                          <div
                                            className="flex items-center gap-2"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <input
                                              autoFocus
                                              type="password"
                                              placeholder="Contraseña..."
                                              value={adminPassInput}
                                              onChange={(e) =>
                                                setAdminPassInput(
                                                  e.target.value,
                                                )
                                              }
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                  if (
                                                    adminPassInput ===
                                                    ADMIN_PASSWORD
                                                  ) {
                                                    setEditingDevCodeId(dev.id);
                                                    setTempDevCode(dev.code);
                                                    setCodeEditRequest(null);
                                                    setAdminPassInput("");
                                                  } else {
                                                    alert(
                                                      "Contraseña incorrecta.",
                                                    );
                                                  }
                                                } else if (e.key === "Escape") {
                                                  setCodeEditRequest(null);
                                                  setAdminPassInput("");
                                                }
                                              }}
                                              className="bg-white/10 border border-rose-500 text-[9px] px-3 py-1 rounded-lg outline-none text-rose-500 font-mono w-32"
                                            />
                                            <button
                                              onClick={() => {
                                                if (
                                                  adminPassInput ===
                                                  ADMIN_PASSWORD
                                                ) {
                                                  setEditingDevCodeId(dev.id);
                                                  setTempDevCode(dev.code);
                                                  setCodeEditRequest(null);
                                                  setAdminPassInput("");
                                                } else {
                                                  alert("Incorrecta");
                                                }
                                              }}
                                              className="p-1.5 bg-rose-500/20 text-rose-500 rounded-md hover:bg-rose-500 hover:text-white transition-all"
                                            >
                                              <Check size={12} />
                                            </button>
                                            <button
                                              onClick={() => {
                                                setCodeEditRequest(null);
                                                setAdminPassInput("");
                                              }}
                                              className="p-1.5 bg-white/5 text-white/40 rounded-md hover:bg-white/10 transition-all"
                                            >
                                              <X size={12} />
                                            </button>
                                          </div>
                                        ) : (
                                          <>
                                            <div className="font-mono text-[11px] text-[var(--accent)] font-bold flex items-center gap-1.5">
                                              {dev.code}
                                              {hasPendingTasks(dev) && (
                                                <span
                                                  className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                                                  title="Tareas pendientes"
                                                />
                                              )}
                                            </div>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setCodeEditRequest(dev.id);
                                                setAdminPassInput("");
                                              }}
                                              className="p-2 opacity-40 hover:opacity-100 hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-[var(--accent)]"
                                              title="Editar Código (Admin)"
                                            >
                                              <Edit3 size={16} />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[8px] uppercase font-bold px-1.5 py-0.5 bg-white/5 text-white/40 rounded border border-white/5">
                                          v.{dev.trialLetter || "A"}
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCreateNextTrialInline(dev);
                                          }}
                                          className="p-1 px-2 text-[8px] font-bold uppercase bg-[var(--accent)]/10 text-[var(--accent)] rounded hover:bg-[var(--accent)] hover:text-white transition-all flex items-center gap-1"
                                          title="Generar nueva versión de prueba"
                                        >
                                          <Plus size={8} /> New Trial
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-6">
                                    <div className="font-medium text-base text-white group-hover/row:text-[var(--accent)] transition-colors font-serif">
                                      {dev.productName}
                                    </div>
                                    <select
                                      value={dev.area}
                                      onChange={async (e) => {
                                        if (!user) return;
                                        await saveDevelopment(
                                          {
                                            ...dev,
                                            area: e.target.value as ProductArea,
                                            updatedAt: Date.now(),
                                          },
                                          user.uid,
                                        );
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-[9px] text-white/30 uppercase tracking-[0.3em] font-bold mt-1 bg-transparent border-none outline-none cursor-pointer hover:text-[var(--accent)] transition-colors appearance-none"
                                    >
                                      {PROJECT_AREAS.map((a) => (
                                        <option
                                          key={a.id}
                                          value={a.id}
                                          className="bg-[#0a0a0a] text-white"
                                        >
                                          {a.label}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-6 py-6">
                                    <div className="flex flex-col gap-1">
                                      <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
                                        {(window as any).formatTinyDate(
                                          dev.startedAt || dev.createdAt,
                                        )}
                                      </div>
                                      {dev.finishedAt && (
                                        <div className="text-[10px] text-amber-400 font-mono flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500/40" />
                                          {(window as any).formatTinyDate(
                                            dev.finishedAt,
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-6 font-mono">
                                    <div className="flex flex-col gap-1">
                                      {dev.trialExecutionDate && (
                                        <div className="text-[10px] text-rose-400 flex items-center gap-2">
                                          <FlaskConical
                                            size={10}
                                            className="opacity-50"
                                          />
                                          {(window as any).formatTinyDate(
                                            dev.trialExecutionDate,
                                          )}
                                        </div>
                                      )}
                                      {dev.testingDate && (
                                        <div className="text-[10px] text-purple-400 flex items-center gap-2">
                                          <ClipboardCheck
                                            size={10}
                                            className="opacity-50"
                                          />
                                          {(window as any).formatTinyDate(
                                            dev.testingDate,
                                          )}
                                        </div>
                                      )}
                                      {!dev.trialExecutionDate &&
                                        !dev.testingDate && (
                                          <span className="text-white/10 text-[10px] tracking-tighter">
                                            Sin fechas registradas
                                          </span>
                                        )}
                                    </div>
                                  </td>
                                  <td
                                    className="px-6 py-6"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex flex-col items-start gap-1">
                                      {dev.recipeId ? (
                                        (() => {
                                          const associatedRecipe = recipes.find(
                                            (r) => r.id === dev.recipeId,
                                          );
                                          const isTech = associatedRecipe
                                            ? !associatedRecipe.isTrialFormula
                                            : false;
                                          return (
                                            <button
                                              onClick={() =>
                                                handleCompleteRecipeInTechnicalFormulation(
                                                  dev,
                                                )
                                              }
                                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer ${
                                                isTech
                                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                                                  : "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white"
                                              }`}
                                              title={
                                                isTech
                                                  ? "Ver esta receta en el Módulo de Formulación Técnica"
                                                  : "Completar y habilitar como Receta Técnica"
                                              }
                                            >
                                              <BookOpen size={12} />
                                              <span>
                                                {isTech
                                                  ? "Receta Técnica"
                                                  : "Habilitar Técnica"}
                                              </span>
                                            </button>
                                          );
                                        })()
                                      ) : (
                                        <button
                                          onClick={() =>
                                            handleCompleteRecipeInTechnicalFormulation(
                                              dev,
                                            )
                                          }
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-white text-[11px] font-bold uppercase tracking-wider transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                                          title="Crear y armar receta en Módulo de Formulación Técnica"
                                        >
                                          <Plus size={12} />
                                          <span>Armar Receta</span>
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                  <td
                                    className="px-10 py-6 text-center whitespace-nowrap"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <select
                                      value={dev.priority}
                                      onChange={async (e) => {
                                        if (!user) return;
                                        await saveDevelopment(
                                          {
                                            ...dev,
                                            priority: e.target
                                              .value as ProjectPriority,
                                            updatedAt: Date.now(),
                                          },
                                          user.uid,
                                        );
                                      }}
                                      className={`inline-block px-4 py-1.5 rounded-full text-[9px] font-bold uppercase border bg-transparent outline-none cursor-pointer appearance-none text-center ${PROJECT_PRIORITIES.find((p) => p.id === dev.priority)?.color || ""}`}
                                    >
                                      {PROJECT_PRIORITIES.map((p) => (
                                        <option
                                          key={p.id}
                                          value={p.id}
                                          className="bg-[#0a0a0a] text-white"
                                        >
                                          {p.label}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td
                                    className="px-6 py-6 text-center whitespace-nowrap"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex flex-col items-center gap-2">
                                      <select
                                        value={dev.status}
                                        onChange={(e) =>
                                          handleUpdateDevelopmentStatus(
                                            dev,
                                            e.target.value as ProjectStatus,
                                          )
                                        }
                                        className={`text-[9px] font-bold uppercase px-4 py-1.5 rounded-full border bg-transparent outline-none cursor-pointer appearance-none text-center ${
                                          dev.status === "pendiente"
                                            ? "text-white/40 border-white/10"
                                            : dev.status === "en_progreso"
                                              ? "text-rose-400 border-rose-400/20 bg-rose-400/5"
                                              : dev.status === "pausado"
                                                ? "text-amber-500 border-amber-500/20 bg-amber-500/5"
                                                : "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                                        }`}
                                      >
                                        <option
                                          value="pendiente"
                                          className="bg-[#0a0a0a] text-white"
                                        >
                                          Pendiente
                                        </option>
                                        <option
                                          value="en_progreso"
                                          className="bg-[#0a0a0a] text-white"
                                        >
                                          En Progreso
                                        </option>
                                        <option
                                          value="pausado"
                                          className="bg-[#0a0a0a] text-white"
                                        >
                                          Pausado
                                        </option>
                                        <option
                                          value="finalizado"
                                          className="bg-[#0a0a0a] text-white"
                                        >
                                          Finalizado
                                        </option>
                                      </select>
                                    </div>
                                  </td>
                                  <td className="px-6 py-6">
                                    <div className="flex items-center justify-end gap-3">
                                      {dev.status === "archivado" ? (
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={(e) =>
                                              handleUnarchiveProject(dev.id)
                                            }
                                            className="px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all hover:-translate-y-1 flex items-center gap-2 shadow-md"
                                            title="Desarchivar Proyecto"
                                          >
                                            <RotateCcw size={16} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                              Restaurar
                                            </span>
                                          </button>
                                        </div>
                                      ) : dev.status !== "finalizado" ? (
                                        <>
                                          <button
                                            onClick={(e) =>
                                              handleStartProjectFormulation(dev)
                                            }
                                            className="p-3 bg-white/5 border border-white/10 text-white/60 rounded-2xl hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-white transition-all hover:-translate-y-1"
                                            title="Ir a Formulación"
                                          >
                                            <FlaskConical size={16} />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              setResolvingTrialProject(dev);
                                              setTrialNotes("");
                                              setTrialExecutionDate("");
                                              setTestingDate("");
                                              setSensoryTrialData({
                                                temperature:
                                                  dev.sensoryAnalysis
                                                    ?.temperature || "",
                                                texture:
                                                  dev.sensoryAnalysis
                                                    ?.texture || "",
                                                flavor:
                                                  dev.sensoryAnalysis?.flavor ||
                                                  "",
                                                hardness:
                                                  dev.sensoryAnalysis
                                                    ?.hardness || "",
                                                decoration:
                                                  dev.sensoryAnalysis
                                                    ?.decoration || "",
                                              });
                                            }}
                                            className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all hover:-translate-y-1 flex items-center gap-2"
                                            title="Resolver Prueba"
                                          >
                                            <Check size={16} />
                                            <span className="text-[10px] font-bold uppercase">
                                              OK
                                            </span>
                                          </button>
                                        </>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={(e) =>
                                              handleReopenProject(dev)
                                            }
                                            className="px-4 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all hover:-translate-y-1 flex items-center gap-2 shadow-sm"
                                            title="Reabrir Proyecto"
                                          >
                                            <Undo2 size={16} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                              Reabrir
                                            </span>
                                          </button>
                                          <button
                                            onClick={(e) =>
                                              handleArchiveProject(dev.id)
                                            }
                                            className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl hover:bg-amber-500 hover:text-white transition-all hover:-translate-y-1 flex items-center gap-2"
                                            title="Archivar"
                                          >
                                            <History size={16} />
                                            <span className="text-[10px] font-bold uppercase">
                                              Archiv.
                                            </span>
                                          </button>
                                        </div>
                                      )}

                                      <button
                                        onClick={(e) =>
                                          handleDeleteDevelopment(dev.id)
                                        }
                                        className="p-3 text-white/10 hover:text-rose-500 transition-all hover:bg-rose-500/10 rounded-2xl"
                                        title="Eliminar Desarrollo"
                                      >
                                        <Trash2 size={16} />
                                      </button>

                                      <button
                                        onClick={(e) =>
                                          setExpandedDevId(
                                            expandedDevId === dev.id
                                              ? null
                                              : dev.id,
                                          )
                                        }
                                        className={`p-2 transition-transform ${expandedDevId === dev.id ? "rotate-180 text-[var(--accent)]" : "text-white/20"}`}
                                      >
                                        <ChevronDown size={20} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {expandedDevId === dev.id && (
                                  <tr className="bg-white/[0.01]">
                                    <td
                                      colSpan={8}
                                      className="px-12 py-10 border-b border-[var(--border)]"
                                    >
                                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                                        <div className="space-y-6">
                                          <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-bold uppercase tracking-widest text-[var(--accent)] flex items-center gap-2">
                                              <ListTodo size={16} /> Pendientes
                                              por Prueba
                                            </h4>
                                            <span className="text-[10px] text-white/30 uppercase font-mono">
                                              {
                                                (dev.tasks || []).filter(
                                                  (t) => !t.completed,
                                                ).length
                                              }{" "}
                                              pendientes
                                            </span>
                                          </div>

                                          <div className="space-y-3">
                                            {(dev.tasks || []).length === 0 ? (
                                              <p className="text-xs text-white/20 italic p-4 border border-dashed border-white/10 rounded-2xl">
                                                No hay tareas pendientes
                                                registradas.
                                              </p>
                                            ) : (
                                              (dev.tasks || [])
                                                .sort((a, b) => {
                                                  // Primary: Deadline (sooner first)
                                                  if (a.deadline && b.deadline) {
                                                    if (a.deadline !== b.deadline) return a.deadline - b.deadline;
                                                  } else if (a.deadline) {
                                                    return -1;
                                                  } else if (b.deadline) {
                                                    return 1;
                                                  }
                                                  // Secondary: Creation date (newer first)
                                                  return b.createdAt - a.createdAt;
                                                })
                                                .map((task) => {
                                                  const isOverdue =
                                                    !task.completed &&
                                                    task.deadline &&
                                                    task.deadline < Date.now();
                                                  return (
                                                    <div
                                                      key={task.id}
                                                      className="flex flex-col gap-1 group/task"
                                                    >
                                                      <div className="flex items-center gap-3">
                                                        <button
                                                          onClick={() =>
                                                            handleToggleTask(
                                                              dev,
                                                              task.id,
                                                            )
                                                          }
                                                          className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center shrink-0 ${
                                                            task.completed
                                                              ? "bg-emerald-500 border-emerald-500 text-white"
                                                              : "border-white/10 hover:border-[var(--accent)]"
                                                          }`}
                                                        >
                                                          {task.completed && (
                                                            <Check size={12} />
                                                          )}
                                                        </button>
                                                        <span
                                                          className={`text-sm transition-all flex-1 ${task.completed ? "text-white/20 line-through" : "text-white/80"}`}
                                                        >
                                                          {task.text}
                                                        </span>
                                                        <button
                                                          onClick={() =>
                                                            handleDeleteTask(
                                                              dev,
                                                              task.id,
                                                            )
                                                          }
                                                          className="p-1 opacity-0 group-hover/task:opacity-100 text-white/20 hover:text-rose-500 transition-all"
                                                        >
                                                          <Trash2 size={12} />
                                                        </button>
                                                      </div>
                                                      {task.deadline && (
                                                        <div className="flex items-center gap-1.5 ml-8">
                                                          <Calendar
                                                            size={10}
                                                            className={
                                                              isOverdue
                                                                ? "text-rose-500"
                                                                : "text-white/20"
                                                            }
                                                          />
                                                          <span
                                                            className={`text-[10px] font-bold uppercase tracking-wider ${isOverdue ? "text-rose-500" : "text-white/30"}`}
                                                          >
                                                            {isOverdue
                                                              ? "Atrasado: "
                                                              : "Límite: "}
                                                            {new Date(
                                                              task.deadline,
                                                            ).toLocaleDateString(
                                                              "es-AR",
                                                              {
                                                                day: "2-digit",
                                                                month:
                                                                  "2-digit",
                                                              },
                                                            )}
                                                          </span>
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                })
                                            )}
                                          </div>

                                          <div className="flex flex-col gap-2 pt-4">
                                            <div className="flex gap-2">
                                              <input
                                                type="text"
                                                placeholder="Añadir pendiente..."
                                                value={newTaskText}
                                                onChange={(e) =>
                                                  setNewTaskText(e.target.value)
                                                }
                                                onKeyDown={(e) =>
                                                  e.key === "Enter" &&
                                                  handleAddTask(dev)
                                                }
                                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-[var(--accent)] transition-all"
                                              />
                                              <button
                                                onClick={() =>
                                                  handleAddTask(dev)
                                                }
                                                className="p-2 bg-[var(--accent)] text-white rounded-xl hover:scale-105 transition-all shadow-lg shadow-[var(--accent)]/20"
                                              >
                                                <Plus size={18} />
                                              </button>
                                            </div>
                                            <div className="flex items-center gap-2 px-1">
                                              <Calendar
                                                size={12}
                                                className="text-white/20"
                                              />
                                              <span className="text-[10px] uppercase font-bold text-white/20 tracking-widest mr-2">
                                                Fecha Límite:
                                              </span>
                                              <input
                                                type="date"
                                                value={newTaskDeadline}
                                                onChange={(e) =>
                                                  setNewTaskDeadline(
                                                    e.target.value,
                                                  )
                                                }
                                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-[10px] text-white/60 outline-none focus:border-[var(--accent)] transition-all"
                                              />
                                              {newTaskDeadline && (
                                                <button
                                                  onClick={() =>
                                                    setNewTaskDeadline("")
                                                  }
                                                  className="text-[10px] text-white/20 hover:text-rose-500 underline"
                                                >
                                                  Quitar
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="space-y-6">
                                          <h4 className="text-sm font-bold uppercase tracking-widest text-[var(--accent)] flex items-center gap-2">
                                            <Fingerprint size={16} /> Análisis
                                            Sensorial
                                          </h4>
                                          <div className="grid grid-cols-1 gap-3">
                                            {[
                                              {
                                                label: "Temperatura",
                                                value:
                                                  dev.sensoryAnalysis
                                                    ?.temperature,
                                                icon: Thermometer,
                                                color: "text-blue-400",
                                              },
                                              {
                                                label: "Textura",
                                                value:
                                                  dev.sensoryAnalysis?.texture,
                                                icon: Fingerprint,
                                                color: "text-amber-400",
                                              },
                                              {
                                                label: "Sabor",
                                                value:
                                                  dev.sensoryAnalysis?.flavor,
                                                icon: Utensils,
                                                color: "text-rose-400",
                                              },
                                              {
                                                label: "Dureza",
                                                value:
                                                  dev.sensoryAnalysis?.hardness,
                                                icon: Gauge,
                                                color: "text-purple-400",
                                              },
                                              {
                                                label: "Decoración",
                                                value:
                                                  dev.sensoryAnalysis
                                                    ?.decoration,
                                                icon: Palette,
                                                color: "text-emerald-400",
                                              },
                                            ].map((item, idx) => (
                                              <div
                                                key={idx}
                                                className="flex items-center gap-3 bg-white/5 border border-white/5 p-3 rounded-2xl"
                                              >
                                                <div
                                                  className={`p-2 bg-white/5 rounded-lg ${item.color}`}
                                                >
                                                  <item.icon size={14} />
                                                </div>
                                                <div className="flex-1">
                                                  <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">
                                                    {item.label}
                                                  </p>
                                                  <p className="text-sm text-white/80">
                                                    {item.value || "-"}
                                                  </p>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>

                                        <div className="space-y-6">
                                          <h4 className="text-sm font-bold uppercase tracking-widest text-[var(--accent)] flex items-center gap-2">
                                            <Wrench size={16} /> Prueba
                                            Productiva
                                          </h4>
                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3 text-left">
                                            {[
                                              {
                                                label: "Fecha Prueba Prod.",
                                                value: dev.prodTrialDate,
                                                icon: Calendar,
                                                color: "text-rose-450",
                                              },
                                              {
                                                label: "Equipos Utilizados",
                                                value: dev.prodTrialEquipment,
                                                icon: Wrench,
                                                color: "text-amber-450",
                                              },
                                              {
                                                label: "Hora de Inicio",
                                                value: dev.prodTrialStartTime,
                                                icon: Clock,
                                                color: "text-sky-400",
                                              },
                                              {
                                                label: "Hora de Fin",
                                                value: dev.prodTrialEndTime,
                                                icon: Clock,
                                                color: "text-emerald-400",
                                              },
                                              ...(dev.prodTrialStartTime &&
                                              dev.prodTrialEndTime
                                                ? [
                                                    {
                                                      label:
                                                        "Duración Calculada",
                                                      value:
                                                        getProdTrialDuration(
                                                          dev.prodTrialStartTime,
                                                          dev.prodTrialEndTime,
                                                        ) || "",
                                                      icon: Clock,
                                                      color:
                                                        "text-purple-400 font-bold",
                                                    },
                                                  ]
                                                : []),
                                            ].map((item, idx) => (
                                              <div
                                                key={idx}
                                                className="flex items-center gap-3 bg-white/5 border border-white/5 p-3 rounded-2xl"
                                              >
                                                <div
                                                  className={`p-2 bg-white/5 rounded-lg ${item.color || "text-white/40"}`}
                                                >
                                                  <item.icon size={14} />
                                                </div>
                                                <div className="flex-1">
                                                  <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">
                                                    {item.label}
                                                  </p>
                                                  <p className="text-sm text-white/80">
                                                    {item.value
                                                      ? item.value.includes(
                                                          "-",
                                                        ) &&
                                                        item.value.split("-")
                                                          .length === 3
                                                        ? item.value
                                                            .split("-")
                                                            .reverse()
                                                            .join("/")
                                                        : item.value
                                                      : "-"}
                                                  </p>
                                                </div>
                                              </div>
                                            ))}

                                            <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-1 md:col-span-2 lg:col-span-1">
                                              <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">
                                                Observaciones Prueba Prod.
                                              </p>
                                              <div className="text-xs text-white/80 whitespace-pre-wrap font-light italic leading-relaxed">
                                                <ExpandableText
                                                  text={dev.prodTrialNotes}
                                                  fallback="Sin observaciones industriales registradas."
                                                  maxChars={120}
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="space-y-6">
                                          <h4 className="text-sm font-bold uppercase tracking-widest text-[var(--accent)] flex items-center gap-2">
                                            <StickyNote size={16} /> Notas y
                                            Seguimiento
                                          </h4>
                                          <div className="bg-white/5 border border-white/10 rounded-[28px] p-6 text-sm text-white/70 line-height-[1.8] whitespace-pre-wrap max-h-[300px] overflow-y-auto custom-scrollbar font-light italic">
                                            <ExpandableText
                                              text={dev.notes}
                                              fallback="No hay notas adicionales."
                                              maxChars={180}
                                            />
                                          </div>
                                          <div className="flex items-center gap-4 justify-between pt-4">
                                            <button
                                              onClick={() =>
                                                setViewingNotesProject(dev)
                                              }
                                              className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1.5 bg-[var(--accent)]/10 px-4 py-2 rounded-xl"
                                            >
                                              <Edit3 size={12} /> Editar Informe
                                              de Seguimiento
                                            </button>
                                          </div>
                                        </div>
                                      </div>

                                      {(() => {
                                        const siblingTrials = developments
                                          .filter(
                                            (d) =>
                                              d.area === dev.area &&
                                              d.sequenceNumber ===
                                                dev.sequenceNumber,
                                          )
                                          .sort((a, b) =>
                                            (
                                              a.trialLetter || "A"
                                            ).localeCompare(
                                              b.trialLetter || "A",
                                            ),
                                          );

                                        return (
                                          <div className="mt-12 pt-10 border-t border-white/5 space-y-8">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                              <div className="space-y-1">
                                                <h4 className="text-sm font-bold uppercase tracking-widest text-[var(--accent)] flex items-center gap-2">
                                                  <History size={16} />{" "}
                                                  Historial y Seguimiento de
                                                  Pruebas
                                                </h4>
                                                <p className="text-xs text-[var(--text-s)]">
                                                  Estás en la versión del
                                                  producto con código {dev.code}
                                                  . Todas las pruebas vinculadas
                                                  se muestran en la línea de
                                                  tiempo.
                                                </p>
                                              </div>

                                              {siblingTrials.length > 0 && (
                                                <button
                                                  onClick={() =>
                                                    handleAnalyzeTrials(
                                                      dev,
                                                      siblingTrials,
                                                    )
                                                  }
                                                  disabled={
                                                    analyzingDevId === dev.id
                                                  }
                                                  className="px-6 py-3 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500 hover:to-indigo-500 hover:text-white text-purple-400 border border-purple-500/30 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
                                                >
                                                  <Sparkles size={16} />
                                                  {analyzingDevId === dev.id
                                                    ? "Analizando con IA..."
                                                    : "Analizar Evolución de Pruebas con IA"}
                                                </button>
                                              )}
                                            </div>

                                            {/* Sibling Trials Interactive Timeline */}
                                            <div className="bg-white/5 border border-white/5 p-6 rounded-3xl relative overflow-hidden">
                                              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/5 -translate-y-1/2 z-0 hidden md:block" />
                                              <div className="grid grid-cols-1 md:grid-cols-6 gap-6 relative z-10">
                                                {siblingTrials.map((t) => {
                                                  const isCurrent =
                                                    t.id === dev.id;
                                                  const statusColors =
                                                    t.status === "finalizado"
                                                      ? "border-emerald-500 bg-emerald-500/25 text-emerald-400"
                                                      : t.status === "archivado"
                                                        ? "border-neutral-500 bg-neutral-500/25 text-neutral-400"
                                                        : t.status ===
                                                            "en_progreso"
                                                          ? "border-rose-500 bg-rose-500/25 text-rose-400 animate-pulse"
                                                          : "border-white/20 bg-white/5 text-white/40";

                                                  return (
                                                    <div
                                                      key={t.id}
                                                      className={`p-4 rounded-2xl border transition-all ${
                                                        isCurrent
                                                          ? "bg-[var(--accent)]/10 border-[var(--accent)] text-white shadow-lg"
                                                          : "bg-black/20 border-white/10 hover:border-white/35 text-white/60"
                                                      }`}
                                                    >
                                                      <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent)] flex items-center gap-1">
                                                          <PlusCircle
                                                            size={10}
                                                          />
                                                          Prueba {t.trialLetter}
                                                        </span>
                                                        <span
                                                          className={`text-[8px] uppercase px-1.5 py-0.5 rounded-full border ${statusColors}`}
                                                        >
                                                          {t.status ===
                                                          "pendiente"
                                                            ? "Pendiente"
                                                            : t.status ===
                                                                "en_progreso"
                                                              ? "En Curso"
                                                              : t.status ===
                                                                  "finalizado"
                                                                ? "Hecha"
                                                                : "Archivada"}
                                                        </span>
                                                      </div>
                                                      <p className="text-xs font-semibold uppercase tracking-wider mb-2 line-clamp-1">
                                                        {t.productName}
                                                      </p>

                                                      <div className="space-y-1 text-[10px] text-white/40">
                                                        <p>
                                                          Código:{" "}
                                                          <span className="font-mono text-white/60">
                                                            {t.code}
                                                          </span>
                                                        </p>
                                                        <p>
                                                          Fecha:{" "}
                                                          <span className="text-white/60">
                                                            {new Date(
                                                              t.createdAt,
                                                            ).toLocaleDateString(
                                                              "es-AR",
                                                            )}
                                                          </span>
                                                        </p>
                                                      </div>

                                                      {t.notes && (
                                                        <div className="mt-3 pt-3 border-t border-white/5">
                                                          <p className="text-[10px] leading-relaxed text-white/50 italic line-clamp-2">
                                                            "{t.notes}"
                                                          </p>
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>

                                            {/* AI Analysis Display */}
                                            {analyzingDevId === dev.id && (
                                              <div className="bg-gradient-to-br from-purple-950/20 to-indigo-950/20 border border-purple-500/20 p-8 rounded-3xl space-y-6">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-purple-500/10 pb-4 gap-4">
                                                  <div className="flex items-center gap-3">
                                                    <Sparkles
                                                      className="text-purple-400 animate-bounce"
                                                      size={24}
                                                    />
                                                    <div>
                                                      <h5 className="text-md font-semibold text-purple-300">
                                                        Análisis Inteligente de
                                                        I+D (Gemini AI)
                                                      </h5>
                                                      <p className="text-[10px] text-purple-400/70 uppercase font-mono tracking-widest">
                                                        Modelo de optimización y
                                                        evolución formulativa
                                                      </p>
                                                    </div>
                                                  </div>
                                                  <button
                                                    onClick={() =>
                                                      setAnalyzingDevId(null)
                                                    }
                                                    className="text-[10px] text-white/40 hover:text-white uppercase tracking-widest border border-white/10 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all font-bold"
                                                  >
                                                    Cerrar Devolución
                                                  </button>
                                                </div>

                                                {analysisError ? (
                                                  <p className="text-sm text-rose-400">
                                                    {analysisError}
                                                  </p>
                                                ) : !trialAnalysis ? (
                                                  <div className="flex items-center gap-3 py-6">
                                                    <Loader2
                                                      className="animate-spin text-purple-400 z-10 shrink-0"
                                                      size={18}
                                                    />
                                                    <p className="text-xs text-white/50 italic font-medium">
                                                      La IA está compilando los
                                                      cambios sensoriales de las
                                                      pruebas, analizando qué
                                                      falló y sugiriendo mejoras
                                                      de I+D corporativas...
                                                    </p>
                                                  </div>
                                                ) : (
                                                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
                                                    <div className="lg:col-span-2 space-y-6">
                                                      <div className="space-y-2">
                                                        <h6 className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                                                          Evolución Formulativa
                                                        </h6>
                                                        <div className="bg-white/5 p-5 rounded-2xl text-xs text-white/80 whitespace-pre-wrap leading-relaxed border border-white/5 font-light">
                                                          {
                                                            trialAnalysis.summary
                                                          }
                                                        </div>
                                                      </div>

                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="space-y-2">
                                                          <h6 className="text-[10px] uppercase font-bold text-rose-450 tracking-wider text-rose-400">
                                                            ¿Qué falló o se debe
                                                            corregir?
                                                          </h6>
                                                          <div className="bg-white/5 p-5 rounded-2xl text-xs text-rose-300/80 whitespace-pre-wrap leading-relaxed border border-rose-500/10 font-light italic">
                                                            {
                                                              trialAnalysis.whatWentWrong
                                                            }
                                                          </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                          <h6 className="text-[10px] uppercase font-bold text-emerald-450 tracking-wider text-emerald-400">
                                                            Puntos clave para la
                                                            próxima prueba
                                                          </h6>
                                                          <div className="bg-white/5 p-5 rounded-2xl text-xs text-emerald-300/80 whitespace-pre-wrap leading-relaxed border border-emerald-500/10 font-light">
                                                            {
                                                              trialAnalysis.keyPointsForNextTrial
                                                            }
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </div>

                                                    <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex flex-col items-center justify-center space-y-4 h-full self-start">
                                                      <div className="relative w-32 h-32 flex items-center justify-center">
                                                        <svg className="w-full h-full transform -rotate-90">
                                                          <circle
                                                            cx="64"
                                                            cy="64"
                                                            r="54"
                                                            stroke="rgba(255,255,255,0.05)"
                                                            strokeWidth="6"
                                                            fill="transparent"
                                                          />
                                                          <circle
                                                            cx="64"
                                                            cy="64"
                                                            r="54"
                                                            stroke="#a855f7"
                                                            strokeWidth="8"
                                                            fill="transparent"
                                                            strokeDasharray={
                                                              339.29
                                                            }
                                                            strokeDashoffset={
                                                              339.29 -
                                                              (339.29 *
                                                                trialAnalysis.progressPercentage) /
                                                                100
                                                            }
                                                            strokeLinecap="round"
                                                            className="transition-all duration-1000"
                                                          />
                                                        </svg>
                                                        <div className="absolute text-center">
                                                          <span className="text-3xl font-light text-white">
                                                            {
                                                              trialAnalysis.progressPercentage
                                                            }
                                                            %
                                                          </span>
                                                          <p className="text-[8px] uppercase text-purple-400 font-bold tracking-widest mt-1">
                                                            Avance I+D
                                                          </p>
                                                        </div>
                                                      </div>
                                                      <div className="text-center space-y-1">
                                                        <h6 className="text-xs uppercase font-bold text-white tracking-widest">
                                                          Alineación Formulativa
                                                        </h6>
                                                        <p className="text-[10px] text-white/40 max-w-[200px] leading-relaxed mx-auto">
                                                          Estimación de la IA
                                                          sobre cuán cerca está
                                                          el producto de la
                                                          receta ideal
                                                          definitiva.
                                                        </p>
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {isAddingProject && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[var(--surface)] border border-[var(--border)] w-full max-w-md rounded-3xl p-0 flex flex-col flex-col overflow-hidden shadow-2xl max-h-[90vh]"
                  >
                    <div className="p-8 pb-4 flex items-center justify-between shrink-0">
                      <h3 className="text-xl font-light italic">
                        Nuevo Desarrollo
                      </h3>
                      <button onClick={() => setIsAddingProject(false)}>
                        <X size={20} />
                      </button>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleCreateProject();
                      }}
                      className="p-8 pt-0 space-y-4 overflow-y-auto custom-scrollbar"
                    >
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-[var(--text-s)] tracking-widest">
                          Nombre del Producto
                        </label>
                        <input
                          type="text"
                          required
                          value={newProject.productName}
                          onChange={(e) =>
                            setNewProject({
                              ...newProject,
                              productName: e.target.value,
                            })
                          }
                          placeholder="Ej: Helado de Pistacho Premium"
                          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4 text-sm outline-none focus:border-[var(--accent)] transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-[var(--text-s)] tracking-widest">
                            Área
                          </label>
                          <select
                            value={newProject.area}
                            onChange={(e) =>
                              setNewProject({
                                ...newProject,
                                area: e.target.value as ProductArea,
                              })
                            }
                            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4 text-sm outline-none focus:border-[var(--accent)] transition-all appearance-none"
                          >
                            {PROJECT_AREAS.map((area) => (
                              <option key={area.id} value={area.id}>
                                {area.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-[var(--text-s)] tracking-widest">
                            Prioridad
                          </label>
                          <select
                            value={newProject.priority}
                            onChange={(e) =>
                              setNewProject({
                                ...newProject,
                                priority: e.target.value as ProjectPriority,
                              })
                            }
                            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4 text-sm outline-none focus:border-[var(--accent)] transition-all appearance-none"
                          >
                            {PROJECT_PRIORITIES.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-[var(--text-s)] tracking-widest">
                          Tiempo Estimado
                        </label>
                        <input
                          type="text"
                          value={newProject.estimatedTime}
                          onChange={(e) =>
                            setNewProject({
                              ...newProject,
                              estimatedTime: e.target.value,
                            })
                          }
                          placeholder="Ej: 2 semanas"
                          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4 text-sm outline-none focus:border-[var(--accent)] transition-all"
                        />
                      </div>

                      <div className="pt-4">
                        <button
                          type="submit"
                          disabled={!newProject.productName}
                          className="w-full btn-primary py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <PlusCircle size={20} />
                          <span>Crear Proyecto</span>
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}

              {resolvingTrialProject && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[var(--surface)] border border-[var(--border)] w-full max-w-lg rounded-3xl p-0 flex flex-col overflow-hidden shadow-2xl max-h-[95vh]"
                  >
                    <div className="p-8 pb-4 flex items-center justify-between shrink-0">
                      <h3 className="text-xl font-light italic">
                        Resultado de la Prueba:{" "}
                        {resolvingTrialProject.productName}
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setResolvingTrialProject(null)}
                          className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-s)] px-3 py-1 hover:bg-white/5 rounded-lg transition-all"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => setResolvingTrialProject(null)}
                          className="text-white/40 hover:text-white transition-all"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>

                    <div className="p-8 pt-0 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-[var(--text-s)] tracking-widest px-1">
                            Observaciones de la Prueba{" "}
                            {resolvingTrialProject.trialLetter || "A"}
                          </label>
                          <textarea
                            value={trialNotes}
                            onChange={(e) => setTrialNotes(e.target.value)}
                            placeholder="Escribe los resultados, ajustes necesarios, etc."
                            className="w-full h-24 bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4 text-sm outline-none focus:border-[var(--accent)] transition-all resize-none"
                          />
                        </div>

                        <div className="space-y-4">
                          <label className="text-[10px] uppercase font-bold text-[var(--text-s)] tracking-widest px-1 flex items-center gap-2">
                            <Fingerprint size={12} /> Análisis Sensorial de esta
                            Prueba
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                              {
                                label: "Temperatura",
                                key: "temperature",
                                icon: Thermometer,
                              },
                              {
                                label: "Textura",
                                key: "texture",
                                icon: Fingerprint,
                              },
                              { label: "Sabor", key: "flavor", icon: Utensils },
                              { label: "Dureza", key: "hardness", icon: Gauge },
                              {
                                label: "Decoración",
                                key: "decoration",
                                icon: Palette,
                              },
                            ].map((field) => (
                              <div key={field.key} className="space-y-1.5">
                                <div className="flex items-center gap-2 text-[var(--text-s)] px-1">
                                  <field.icon size={10} />
                                  <span className="text-[9px] uppercase font-bold tracking-wider">
                                    {field.label}
                                  </span>
                                </div>
                                <input
                                  type="text"
                                  value={
                                    (sensoryTrialData as any)?.[field.key] || ""
                                  }
                                  onChange={(e) =>
                                    setSensoryTrialData((prev) => ({
                                      ...prev,
                                      [field.key]: e.target.value,
                                    }))
                                  }
                                  placeholder="Completar..."
                                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-2.5 px-4 text-xs outline-none focus:border-[var(--accent)] transition-all text-white/80"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-[var(--text-s)] tracking-widest">
                              Fecha Realización
                            </label>
                            <input
                              type="date"
                              value={trialExecutionDate}
                              onChange={(e) =>
                                setTrialExecutionDate(e.target.value)
                              }
                              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl p-3 text-sm outline-none focus:border-[var(--accent)] transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-[var(--text-s)] tracking-widest">
                              Fecha Testeo
                            </label>
                            <input
                              type="date"
                              value={testingDate}
                              onChange={(e) => setTestingDate(e.target.value)}
                              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl p-3 text-sm outline-none focus:border-[var(--accent)] transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5">
                        <button
                          onClick={() => handleResolveTrial("new_trial")}
                          className="bg-amber-500/10 border border-amber-500/30 text-amber-500 p-6 rounded-2xl hover:bg-amber-500/20 transition-all flex flex-col items-center gap-3 text-center"
                        >
                          <ArrowUp size={24} />
                          <div className="space-y-1">
                            <p className="text-xs font-bold uppercase tracking-widest">
                              Nueva Prueba
                            </p>
                            <p className="text-[10px] opacity-60">
                              Crear nuevo renglón para versión{" "}
                              {String.fromCharCode(
                                (
                                  resolvingTrialProject.trialLetter || "A"
                                ).charCodeAt(0) + 1,
                              )}
                              .
                            </p>
                          </div>
                        </button>

                        <button
                          onClick={() => handleResolveTrial("formulation")}
                          className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 p-6 rounded-2xl hover:bg-emerald-500/20 transition-all flex flex-col items-center gap-3 text-center"
                        >
                          <Check size={24} />
                          <div className="space-y-1">
                            <p className="text-xs font-bold uppercase tracking-widest">
                              Finalizar y Formular
                            </p>
                            <p className="text-[10px] opacity-60">
                              Prueba exitosa. Pasar a etapa de formulación
                              técnica.
                            </p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}

              {viewingNotesProject && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[var(--surface)] border border-[var(--border)] w-full max-w-4xl rounded-3xl p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                  >
                    <div className="p-8 border-b border-white/5 flex items-center justify-between shrink-0">
                      <div>
                        <h3 className="text-xl font-light italic">
                          Informe de Seguimiento:{" "}
                          {viewingNotesProject.productName}
                        </h3>
                        <p className="text-[10px] uppercase tracking-widest text-[var(--accent)] mt-1">
                          Código: {viewingNotesProject.code}
                        </p>
                      </div>
                      <button
                        onClick={() => setViewingNotesProject(null)}
                        className="text-white/40 hover:text-white transition-all"
                      >
                        <X size={24} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Column 1: Notes */}
                        <div className="space-y-4">
                          <label className="text-[10px] uppercase font-bold text-[var(--text-s)] tracking-widest px-1">
                            Historial y Observaciones Generales
                          </label>
                          <textarea
                            value={viewingNotesProject.notes || ""}
                            onChange={(e) =>
                              setViewingNotesProject({
                                ...viewingNotesProject,
                                notes: e.target.value,
                              })
                            }
                            className="w-full h-[400px] bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-6 text-sm leading-relaxed text-white/80 font-light resize-none outline-none focus:border-[var(--accent)] transition-all"
                            placeholder="Escribe aquí el historial detallado, cambios en la fórmula, resultados de catas, etc."
                          />
                        </div>

                        {/* Column 2: Sensory Analysis */}
                        <div className="space-y-6">
                          <label className="text-[10px] uppercase font-bold text-[var(--text-s)] tracking-widest px-1 flex items-center gap-2">
                            <Fingerprint size={12} /> Análisis Sensorial
                            Específico
                          </label>

                          <div className="grid grid-cols-1 gap-4">
                            {[
                              {
                                label: "Temperatura",
                                key: "temperature",
                                icon: Thermometer,
                                placeholder: "Ej: -12°C servido",
                              },
                              {
                                label: "Textura",
                                key: "texture",
                                icon: Fingerprint,
                                placeholder: "Ej: Cremosa, sin cristales",
                              },
                              {
                                label: "Sabor",
                                key: "flavor",
                                icon: Utensils,
                                placeholder: "Ej: Intenso a pistacho tostado",
                              },
                              {
                                label: "Dureza",
                                key: "hardness",
                                icon: Gauge,
                                placeholder:
                                  "Ej: Firmeza media, buena estructura",
                              },
                              {
                                label: "Decoración",
                                key: "decoration",
                                icon: Palette,
                                placeholder: "Ej: Pistacho picado y veteado",
                              },
                            ].map((field) => (
                              <div key={field.key} className="space-y-1.5">
                                <div className="flex items-center gap-2 text-[var(--text-s)]">
                                  <field.icon size={10} />
                                  <span className="text-[9px] uppercase font-bold tracking-wider">
                                    {field.label}
                                  </span>
                                </div>
                                <input
                                  type="text"
                                  value={
                                    (
                                      viewingNotesProject.sensoryAnalysis as any
                                    )?.[field.key] || ""
                                  }
                                  onChange={(e) =>
                                    setViewingNotesProject({
                                      ...viewingNotesProject,
                                      sensoryAnalysis: {
                                        ...(viewingNotesProject.sensoryAnalysis ||
                                          {}),
                                        [field.key]: e.target.value,
                                      },
                                    })
                                  }
                                  placeholder={field.placeholder}
                                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-3 px-4 text-sm outline-none focus:border-[var(--accent)] transition-all text-white/80"
                                />
                              </div>
                            ))}
                          </div>

                          {/* Sección: Prueba Productiva / Escala Industrial */}
                          <div className="pt-6 border-t border-white/5 space-y-4 text-left">
                            <label className="text-[10px] uppercase font-bold text-[var(--text-s)] tracking-widest px-1 flex items-center gap-2">
                              <Wrench size={12} /> Prueba / Ensayo Productivo
                            </label>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-[var(--text-s)]">
                                  <Calendar size={10} />
                                  <span className="text-[9px] uppercase font-bold tracking-wider">
                                    Fecha Prueba Prod.
                                  </span>
                                </div>
                                <input
                                  type="date"
                                  value={
                                    viewingNotesProject.prodTrialDate || ""
                                  }
                                  onChange={(e) =>
                                    setViewingNotesProject({
                                      ...viewingNotesProject,
                                      prodTrialDate: e.target.value,
                                    })
                                  }
                                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-3 px-4 text-xs outline-none focus:border-[var(--accent)] transition-all text-white/80"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-[var(--text-s)]">
                                  <Wrench size={10} />
                                  <span className="text-[9px] uppercase font-bold tracking-wider">
                                    Equipos Utilizados
                                  </span>
                                </div>
                                <input
                                  type="text"
                                  value={
                                    viewingNotesProject.prodTrialEquipment || ""
                                  }
                                  onChange={(e) =>
                                    setViewingNotesProject({
                                      ...viewingNotesProject,
                                      prodTrialEquipment: e.target.value,
                                    })
                                  }
                                  placeholder="Ej: Pasteurizadora, Templadora..."
                                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-3 px-4 text-xs outline-none focus:border-[var(--accent)] transition-all text-white/80"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-[var(--text-s)]">
                                  <Clock size={10} />
                                  <span className="text-[9px] uppercase font-bold tracking-wider">
                                    Hora Inicio
                                  </span>
                                </div>
                                <input
                                  type="time"
                                  value={
                                    viewingNotesProject.prodTrialStartTime || ""
                                  }
                                  onChange={(e) =>
                                    setViewingNotesProject({
                                      ...viewingNotesProject,
                                      prodTrialStartTime: e.target.value,
                                    })
                                  }
                                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-3 px-4 text-xs outline-none focus:border-[var(--accent)] transition-all text-white/80 animate-fade-in"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-[var(--text-s)]">
                                  <Clock size={10} />
                                  <span className="text-[9px] uppercase font-bold tracking-wider">
                                    Hora Fin
                                  </span>
                                </div>
                                <input
                                  type="time"
                                  value={
                                    viewingNotesProject.prodTrialEndTime || ""
                                  }
                                  onChange={(e) =>
                                    setViewingNotesProject({
                                      ...viewingNotesProject,
                                      prodTrialEndTime: e.target.value,
                                    })
                                  }
                                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-3 px-4 text-xs outline-none focus:border-[var(--accent)] transition-all text-white/80 animate-fade-in"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-[var(--text-s)]">
                                <StickyNote size={10} />
                                <span className="text-[9px] uppercase font-bold tracking-wider">
                                  Observaciones Prueba Prod.
                                </span>
                              </div>
                              <textarea
                                value={viewingNotesProject.prodTrialNotes || ""}
                                onChange={(e) =>
                                  setViewingNotesProject({
                                    ...viewingNotesProject,
                                    prodTrialNotes: e.target.value,
                                  })
                                }
                                placeholder="Escribe resultados del escalado industrial, mermas, rendimientos, etc."
                                className="w-full h-24 bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4 text-xs leading-relaxed text-white/80 font-light resize-none outline-none focus:border-[var(--accent)] transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-8 border-t border-white/5 flex justify-between items-center bg-white/[0.02] shrink-0">
                      <button
                        onClick={async () => {
                          if (!user) return;
                          if (
                            !window.confirm(
                              "¿Seguro que deseas eliminar permanentemente este proyecto? Esta acción no se puede deshacer.",
                            )
                          )
                            return;
                          await deleteDevelopment(viewingNotesProject.id);
                          setViewingNotesProject(null);
                        }}
                        className="px-4 py-2 text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                      >
                        <Trash2 size={14} /> Eliminar Proyecto
                      </button>
                      <div className="flex gap-4">
                        <button
                          onClick={() => setViewingNotesProject(null)}
                          className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={async () => {
                            if (!user) return;
                            try {
                              await saveDevelopment(
                                {
                                  ...viewingNotesProject,
                                  updatedAt: Date.now(),
                                },
                                user.uid,
                              );
                              setViewingNotesProject(null);
                            } catch (err) {
                              alert("Error al guardar los cambios.");
                            }
                          }}
                          className="px-10 py-3 bg-[var(--accent)] hover:brightness-110 text-white rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-[var(--accent)]/20"
                        >
                          Guardar Informe
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}

              {(view === "recipes" || view === "trial_formulas") && (
                <motion.div
                  key={view}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid h-full grid-cols-1 lg:grid-cols-[280px_1fr] bg-[var(--border)] gap-[1px]"
                >
                  {/* Pane 0: List focused on recipes */}
                  <aside className="pane bg-[var(--bg)] custom-scrollbar overflow-y-auto shrink-0 flex flex-col">
                    <div className="pane-title flex items-center justify-between mb-6">
                      <span>
                        {view === "trial_formulas"
                          ? "Formulaciones de Pruebas"
                          : "Catálogo de Recetas"}
                      </span>
                      {view === "recipes" && (
                        <button
                          onClick={() => {
                            const newId = `recipe_${Date.now()}`;
                            const newRecipe: Recipe = {
                              id: newId,
                              name: "Nueva Receta",
                              type: "base",
                              ingredients: [],
                              servingSize: 100,
                              servingMeasure: "1 porción",
                              totalYield: 0,
                              finalYield: 0,
                              portionsPerPackage: 1,
                              isLiquid: false,
                              status: "formulacion",
                              estimatedDevTime: "1 semana",
                            };
                            saveRecipe(newRecipe, user.uid);
                            setSelectedRecipeId(newId);
                          }}
                          className="p-1.5 bg-[var(--accent)] rounded hover:brightness-110 transition-all text-white"
                        >
                          <Plus size={14} />
                        </button>
                      )}
                    </div>

                    {/* Segmented Control for active vs archived recipes */}
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 gap-1 mb-6 select-none shrink-0">
                      <button
                        onClick={() => setRecipeStatusFilter("activos")}
                        className={`flex-1 text-center py-2.5 rounded-xl text-[9px] font-extrabold uppercase tracking-widest transition-all ${recipeStatusFilter === "activos" ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20" : "text-white/40 hover:text-white/70"}`}
                      >
                        Activos
                      </button>
                      <button
                        onClick={() => setRecipeStatusFilter("archivados")}
                        className={`flex-1 text-center py-2.5 rounded-xl text-[9px] font-extrabold uppercase tracking-widest transition-all ${recipeStatusFilter === "archivados" ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/35" : "text-white/40 hover:text-white/70"}`}
                      >
                        Archivados
                      </button>
                    </div>

                    {/* Type & Category Filters */}
                    <div className="mb-6 space-y-4">
                      {/* Type Filter */}
                      <div className="overflow-x-auto custom-scrollbar">
                        <div className="flex gap-1.5 pb-1">
                          {["todos", "base", "semielaborado", "final"].map((t) => (
                            <button
                              key={t}
                              onClick={() => setRecipeTypeFilter(t as any)}
                              className={`whitespace-nowrap px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all border ${
                                recipeTypeFilter === t 
                                  ? "bg-white text-black border-white" 
                                  : "bg-white/5 border-white/5 text-white/40 hover:text-white/60"
                              }`}
                            >
                              {t === "todos" ? "Todos Tipos" : t}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Category Filter */}
                      <div className="overflow-x-auto custom-scrollbar">
                        <div className="flex gap-1.5 pb-1">
                          {["todos", "helados", "popolo", "vitrina", "paletas", "chocolateria", "pasteleria", "semielaborado"].map((cat) => (
                            <button
                              key={cat}
                              onClick={() => setRecipeCategoryFilter(cat as any)}
                              className={`whitespace-nowrap px-2.5 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all border ${
                                recipeCategoryFilter === cat 
                                  ? "bg-[var(--accent)]/20 border-[var(--accent)] text-[var(--accent)]" 
                                  : "bg-white/5 border-white/5 text-white/40 hover:text-white/60"
                              }`}
                            >
                              {cat === "todos" ? "Todas Categorías" : cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 mb-6">
                      <div className="relative">
                        <Search
                          className="absolute left-3 top-1/2 -translate-y-1/2 opacity-20"
                          size={12}
                        />
                        <input
                          type="text"
                          value={recipesSearchQuery}
                          onChange={(e) =>
                            setRecipesSearchQuery(e.target.value)
                          }
                          placeholder={
                            view === "trial_formulas"
                              ? "Buscar ensayo o prueba..."
                              : "Buscar receta..."
                          }
                          className="w-full bg-[var(--surface)] text-[10px] border border-[var(--border)] rounded-lg py-2 pl-9 pr-3 focus:outline-none focus:border-[var(--accent)] transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2">
                      {filteredRecipesByView.map((recipe) => (
                        <div
                          key={recipe.id}
                          onClick={() => setSelectedRecipeId(recipe.id)}
                          className={`group w-full text-left p-4 rounded-2xl transition-all border cursor-pointer relative overflow-hidden ${selectedRecipeId === recipe.id ? "bg-[var(--accent)] border-[var(--accent)] shadow-xl shadow-[var(--accent)]/20" : "bg-[var(--surface)] border-[var(--border)] hover:border-white/20"}`}
                        >
                          {selectedRecipeId === recipe.id && (
                            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-bl-full -mr-8 -mt-8" />
                          )}
                          <div className="flex justify-between items-start mb-3 relative z-10">
                            <span
                              className={`text-[12px] font-bold uppercase tracking-tight truncate flex-1 leading-tight ${selectedRecipeId === recipe.id ? "text-white" : "text-white/80"}`}
                            >
                              {recipe.name}
                            </span>
                            <div
                              className={`w-2 h-2 rounded-full shrink-0 ml-2 shadow-[0_0_8px_rgba(0,0,0,0.3)] ${recipe.status === "finalizado" ? "bg-emerald-400" : "bg-amber-400"}`}
                              title={recipe.status}
                            />
                          </div>

                          <div className="flex justify-between items-end relative z-10">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[8px] uppercase tracking-[0.2em] font-black ${selectedRecipeId === recipe.id ? "text-white/60" : "text-[var(--accent)]"}`}
                                >
                                  {recipe.type}
                                </span>
                                {recipe.category && (
                                  <span className={`text-[7px] uppercase font-bold px-1.5 py-0.5 rounded ${selectedRecipeId === recipe.id ? "bg-white/20 text-white" : "bg-[var(--accent)]/10 text-[var(--accent)]"}`}>
                                    {recipe.category}
                                  </span>
                                )}
                              </div>
                              <span
                                className={`text-[10px] font-mono ${selectedRecipeId === recipe.id ? "text-white/40" : "text-white/20"}`}
                              >
                                ID: {recipe.id.split("_")[1]?.substring(0, 6)}
                              </span>
                              {recipe.trialCode && (
                                <span
                                  className={`text-[9px] font-mono font-bold block mt-1 ${selectedRecipeId === recipe.id ? "text-white/80" : "text-amber-400"}`}
                                >
                                  Ensay: {recipe.trialCode}
                                </span>
                              )}

                              {recipe.isTrialFormula && (
                                <div className="mt-1.5 flex items-center gap-1.5">
                                  {recipe.isSatisfactory === false ? (
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
                                      Rechazada
                                    </span>
                                  ) : recipe.isSatisfactory === true ? (
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      Promovido
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30 animate-pulse">
                                      En Progreso
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <div
                                className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${selectedRecipeId === recipe.id ? "bg-white/20 text-white" : "bg-black/20 text-[var(--text-s)]"}`}
                              >
                                {recipe.status === "informacion_nutricional"
                                  ? "PASO 2"
                                  : recipe.status === "formulacion"
                                    ? "PASO 1"
                                    : "LISTO"}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingRecipeId(recipe.id);
                                }}
                                className={`p-1.5 rounded-lg transition-all ${selectedRecipeId === recipe.id ? "hover:bg-white/20 text-white" : "hover:bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100"}`}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-6 border-t border-[var(--border)] space-y-3">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-3 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-xl text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-all flex items-center justify-center gap-2"
                      >
                        <Sparkles size={14} />
                        Importar con IA (Imagen)
                      </button>
                      <button
                        onClick={() => excelInputRef.current?.click()}
                        className="w-full py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                      >
                        <UploadCloud
                          size={14}
                          className="text-[var(--accent)]"
                        />
                        Importar Excel
                      </button>
                    </div>
                  </aside>

                  {/* Main Interaction Pane */}
                  <div className="flex flex-col h-full bg-[var(--bg)] overflow-hidden">
                    {!selectedRecipe ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6">
                        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center text-white/20 border border-white/5">
                          <FlaskConical size={48} />
                        </div>
                        <div className="space-y-2">
                          <h2 className="text-2xl font-light italic text-white/40">
                            Fórmula no seleccionada
                          </h2>
                          <p className="text-[var(--text-s)] text-sm max-w-sm mx-auto">
                            Seleccioná una receta del catálogo lateral para
                            comenzar la formulación o el análisis nutricional.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="px-8 py-6 bg-[var(--bg)] border-b border-[var(--border)]">
                          <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                              <button
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "¿Estás seguro de que quieres volver atrás?",
                                    )
                                  ) {
                                    if (previousView) {
                                      setView(previousView);
                                      setPreviousView(null);
                                    } else {
                                      setView("dashboard");
                                    }
                                    setSelectedRecipeId(null);
                                  }
                                }}
                                className="p-3 text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-xl transition-all flex items-center gap-2 group"
                                title="Volver"
                              >
                                <ChevronLeft
                                  size={24}
                                  className="group-hover:-translate-x-1 transition-transform"
                                />
                                <span className="text-[10px] uppercase font-bold tracking-widest hidden sm:inline">
                                  Volver
                                </span>
                              </button>
                              <div
                                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                  selectedRecipe.isTrialFormula
                                    ? "bg-amber-400/20 text-amber-400 border border-amber-400/20"
                                    : selectedRecipe.type === "base"
                                      ? "bg-slate-400/20 text-slate-400"
                                      : selectedRecipe.type === "semielaborado"
                                        ? "bg-rose-400/20 text-rose-400"
                                        : "bg-emerald-400/20 text-emerald-400"
                                }`}
                              >
                                {selectedRecipe.isTrialFormula ? (
                                  <FlaskConical size={24} />
                                ) : selectedRecipe.type === "base" ? (
                                  <Layers size={24} />
                                ) : selectedRecipe.type === "semielaborado" ? (
                                  <Dna size={24} />
                                ) : (
                                  <Package size={24} />
                                )}
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={selectedRecipe.name}
                                    onChange={(e) =>
                                      handleUpdateRecipe({
                                        ...selectedRecipe,
                                        name: e.target.value,
                                      })
                                    }
                                    className="bg-transparent text-2xl font-light italic border-b border-transparent w-full focus:outline-none focus:border-[var(--accent)] transition-all truncate"
                                    placeholder="Nombre de la receta..."
                                  />
                                  <select
                                    value={selectedRecipe.category || ""}
                                    onChange={(e) =>
                                      handleUpdateRecipe({
                                        ...selectedRecipe,
                                        category: e.target.value as any,
                                      })
                                    }
                                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] uppercase font-bold text-white/60 focus:border-[var(--accent)] outline-none cursor-pointer hover:bg-white/10 transition-all shrink-0"
                                  >
                                    <option value="" disabled className="bg-[var(--surface)]">
                                      Tipo de Receta
                                    </option>
                                    {[
                                      "semielaborado",
                                      "pasteleria",
                                      "paletas",
                                      "chocolateria",
                                      "vitrina",
                                      "popolo",
                                      "helados",
                                    ].map((cat) => (
                                      <option
                                        key={cat}
                                        value={cat}
                                        className="bg-[var(--surface)]"
                                      >
                                        {cat.toUpperCase()}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 shrink-0">
                                    <span className="text-[10px] uppercase font-bold text-white/40">Porción:</span>
                                    <input
                                      type="number"
                                      value={selectedRecipe.servingSize}
                                      onChange={(e) => 
                                        handleUpdateRecipe({
                                          ...selectedRecipe,
                                          servingSize: Number(e.target.value)
                                        })
                                      }
                                      className="bg-transparent text-[10px] font-mono font-bold text-white w-12 focus:outline-none"
                                    />
                                    <span className="text-[10px] font-bold text-white/40">g</span>
                                  </div>
                                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 shrink-0">
                                    <span className="text-[10px] uppercase font-bold text-white/40">Medida:</span>
                                    <input
                                      type="text"
                                      placeholder="Ej: 2 bochas"
                                      value={selectedRecipe.servingMeasure || ""}
                                      onChange={(e) => 
                                        handleUpdateRecipe({
                                          ...selectedRecipe,
                                          servingMeasure: e.target.value
                                        })
                                      }
                                      className="bg-transparent text-[10px] font-sans font-bold text-white w-20 focus:outline-none placeholder:text-white/10"
                                    />
                                  </div>
                                  {selectedRecipe.isTrialFormula && (
                                    <span className="bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter whitespace-nowrap">
                                      Trial Module
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 mt-1">
                                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--accent)] opacity-60">
                                    ID: {selectedRecipe.id.substring(0, 10)}
                                  </p>
                                  {selectedRecipe.trialCode && (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 border border-white/5 rounded-lg">
                                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
                                        CÓDIGO DE PRUEBA:
                                      </span>
                                      <span className="text-[10px] font-mono font-bold text-amber-400">
                                        {selectedRecipe.trialCode}
                                      </span>
                                    </div>
                                  )}
                                  {selectedRecipe.sourceProjectId &&
                                    developments.find(
                                      (d) =>
                                        d.id === selectedRecipe.sourceProjectId,
                                    )?.status === "finalizado" && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const dev = developments.find(
                                            (d) =>
                                              d.id ===
                                              selectedRecipe.sourceProjectId,
                                          );
                                          if (dev) {
                                            handleReopenProject(dev, () => {
                                              setSelectedRecipeId(null);
                                              navigateTo("developments");
                                            });
                                          }
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all text-[10px] font-bold uppercase tracking-wider border border-rose-500/20"
                                      >
                                        <Undo2 size={12} />
                                        Revertir Aprobación
                                      </button>
                                    )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2 flex items-center gap-3">
                                <History
                                  size={14}
                                  className="text-[var(--text-s)]"
                                />
                                <div className="flex flex-col">
                                  <span className="text-[8px] uppercase font-bold text-[var(--text-s)] tracking-tighter">
                                    Tiempo Estimado
                                  </span>
                                  <input
                                    value={
                                      selectedRecipe.estimatedDevTime || ""
                                    }
                                    onChange={(e) =>
                                      handleUpdateRecipe({
                                        ...selectedRecipe,
                                        estimatedDevTime: e.target.value,
                                      })
                                    }
                                    className="bg-transparent text-[11px] text-white outline-none border-none w-20"
                                    placeholder="2 semanas..."
                                  />
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  setDeletingRecipeId(selectedRecipe.id)
                                }
                                className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                              >
                                <Trash2 size={20} />
                              </button>
                            </div>
                          </div>

                          {selectedRecipe.isTrialFormula && (
                            <div className="px-8 py-5 bg-amber-500/5 border-y border-amber-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                              <div className="flex items-start gap-3.5">
                                <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 shrink-0 mt-0.5">
                                  <Info size={18} />
                                </div>
                                <div className="flex flex-col text-left">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-[0.2em]">
                                      Formulación de Ensayo de I+D
                                    </span>
                                    {selectedRecipe.isArchived && (
                                      <span className="text-[9px] bg-rose-500/25 text-rose-400 border border-rose-500/30 font-extrabold uppercase px-2 py-0.5 rounded-full tracking-widest">
                                        Archivado
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-white/60 mt-1.5 leading-relaxed max-w-xl">
                                    {selectedRecipe.isArchived
                                      ? "Esta fórmula de prueba está archivada. Puedes restaurarla si deseas seguir ajustando sus ingredientes y composición."
                                      : "Esta es la formulación de prueba activa. Ajusta las materias primas y cantidades; luego, decide si la apruebas para el catálogo técnico o la archivas."}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 shrink-0">
                                {selectedRecipe.trialCode && (
                                  <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] font-mono text-amber-400 font-bold">
                                    CÓDIGO: {selectedRecipe.trialCode}
                                  </div>
                                )}

                                {selectedRecipe.isArchived ? (
                                  <button
                                    onClick={async () => {
                                      if (
                                        window.confirm(
                                          "¿Deseas restaurar este ensayo para volver a editarlo?",
                                        )
                                      ) {
                                        await handleUpdateRecipe({
                                          ...selectedRecipe,
                                          isArchived: false,
                                          isSatisfactory: undefined,
                                        });
                                      }
                                    }}
                                    className="px-4 py-2 bg-[var(--accent)] text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-[var(--accent)]/20"
                                  >
                                    <FolderOpen size={12} />
                                    Restaurar Ensayo
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      onClick={async () => {
                                        if (
                                          window.confirm(
                                            "¿Aprobar receta y promoverla al módulo de Formulación Técnica oficial?",
                                          )
                                        ) {
                                          await handleUpdateRecipe({
                                            ...selectedRecipe,
                                            isTrialFormula: false,
                                            isSatisfactory: true,
                                            status: "formulacion",
                                          });
                                          alert(
                                            "¡Excelente! La receta de ensayo ha sido aprobada y se encuentra ahora en el Catálogo de Recetas Técnicas.",
                                          );
                                        }
                                      }}
                                      className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/25"
                                    >
                                      <Check size={12} />
                                      Aprobar y Promover
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (
                                          window.confirm(
                                            "¿Seguro que deseas archivar este ensayo? Se guardará en el histórico.",
                                          )
                                        ) {
                                          await handleUpdateRecipe({
                                            ...selectedRecipe,
                                            isArchived: true,
                                            isSatisfactory: false,
                                          });
                                        }
                                      }}
                                      className="px-4 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-rose-500 hover:text-white transition-all"
                                    >
                                      <Trash2 size={12} />
                                      Archivar Ensayo
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {!selectedRecipe.isTrialFormula && (
                            <div className="flex items-center justify-between px-10 relative">
                              {/* Connecting Line */}
                              <div className="absolute left-[10%] right-[10%] top-5 h-[1px] bg-[var(--border)] z-0" />

                              {[
                                {
                                  id: "formulacion",
                                  label: "Formulación",
                                  icon: FlaskConical,
                                },
                                {
                                  id: "informacion_nutricional",
                                  label: "Información Nutricional",
                                  icon: Scale,
                                },
                                {
                                  id: "creado_en_sistema",
                                  label: "Creado en Sistema",
                                  icon: UploadCloud,
                                },
                                {
                                  id: "finalizado",
                                  label: "Finalizado",
                                  icon: Check,
                                },
                              ].map((step, idx, arr) => {
                                const stepIdx = arr.findIndex(
                                  (s) => s.id === selectedRecipe.status,
                                );
                                const isActive = idx <= stepIdx;
                                const isCurrent = idx === stepIdx;

                                return (
                                  <button
                                    key={step.id}
                                    onClick={() =>
                                      handleUpdateRecipe({
                                        ...selectedRecipe,
                                        status: step.id as any,
                                      })
                                    }
                                    className="relative flex flex-col items-center gap-3 z-10 group"
                                  >
                                    <div
                                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                                        isCurrent
                                          ? "bg-[var(--accent)] border-[var(--accent)] text-white shadow-xl shadow-[var(--accent)]/40 scale-110"
                                          : isActive
                                            ? "bg-[var(--accent)]/10 border-[var(--accent)]/40 text-[var(--accent)]"
                                            : "bg-[var(--bg)] border-[var(--border)] text-[var(--text-s)]"
                                      }`}
                                    >
                                      <step.icon size={16} />
                                      {isActive && !isCurrent && (
                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[var(--bg)]">
                                          <Check
                                            size={8}
                                            className="text-white"
                                          />
                                        </div>
                                      )}
                                    </div>
                                    <span
                                      className={`text-[10px] uppercase font-bold tracking-widest ${isActive ? "text-white" : "text-[var(--text-s)] opacity-40"}`}
                                    >
                                      {step.label}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Dynamic Pane Content based on Step or Module Type */}
                        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 bg-[var(--border)] gap-[1px]">
                          {/* Left Side: Inputs / Formulation */}
                          <div className="flex flex-col overflow-hidden bg-[var(--bg)]">
                            {(selectedRecipe.isTrialFormula === true ||
                              selectedRecipe.status === "formulacion" ||
                              selectedRecipe.status === "creado_en_sistema" ||
                              selectedRecipe.status === "finalizado") && (
                              <div className="flex-1 p-8 custom-scrollbar overflow-y-auto space-y-8">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                                    <Layers
                                      size={14}
                                      className="text-[var(--accent)]"
                                    />
                                    {selectedRecipe.isTrialFormula
                                      ? `Formulación Experimental (Trial: ${selectedRecipe.trialCode || "A"})`
                                      : "Protocolo de Ingredientes TÉCNICO"}
                                  </h3>
                                  <span className="text-[10px] font-mono text-[var(--text-s)] opacity-50">
                                    {selectedRecipe.ingredients.length}{" "}
                                    COMPONENTES
                                  </span>
                                </div>

                                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-x-auto custom-scrollbar w-full">
                                  <table className="w-full text-left border-collapse min-w-[650px]">
                                    <thead>
                                      <tr className="bg-white/5 border-b border-[var(--border)]">
                                        <th className="px-6 py-4 text-[10px] uppercase font-bold text-[var(--text-s)] tracking-widest">
                                          Ingrediente / Insumo
                                        </th>
                                        <th className="px-6 py-4 text-[10px] uppercase font-bold text-[var(--text-s)] tracking-widest text-right">
                                          Cantidad (g)
                                        </th>
                                        <th className="px-6 py-4 text-[10px] uppercase font-bold text-[var(--text-s)] tracking-widest text-right">
                                          Aporte (%)
                                        </th>
                                        <th className="px-4 py-4"></th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border)]">
                                      {selectedRecipe.ingredients.map(
                                        (ri, idx) => {
                                          const subRecipe = ri.isRecipe
                                            ? recipes.find(
                                                (r) => r.id === ri.ingredientId,
                                              )
                                            : null;
                                          const ingredient = !ri.isRecipe
                                            ? ingredients.find(
                                                (i) => i.id === ri.ingredientId,
                                              )
                                            : null;
                                          const percentage =
                                            recipeTotalWeight > 0
                                              ? (ri.amount /
                                                  recipeTotalWeight) *
                                                100
                                              : 0;

                                          return (
                                            <tr
                                              key={idx}
                                              className="hover:bg-white/[0.02] group transition-all"
                                            >
                                              <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-white/90 truncate max-w-[250px]">
                                                      {ri.isRecipe
                                                        ? subRecipe?.name ||
                                                          "Sub-Receta No Encontrada"
                                                        : ingredient?.name ||
                                                          ri.note ||
                                                          "Ingrediente No Encontrado"}
                                                    </span>
                                                    {!ri.isRecipe &&
                                                      !ingredient &&
                                                      ri.note && (
                                                        <button
                                                          onClick={() =>
                                                            handleSearchWeb(
                                                              idx,
                                                              ri.note!,
                                                            )
                                                          }
                                                          className="p-1 bg-amber-500/10 text-amber-500 rounded hover:bg-amber-500/20 transition-all flex items-center gap-1.5 px-1.5"
                                                          title="Vincular con Materia Prima"
                                                        >
                                                          <AlertTriangle
                                                            size={10}
                                                          />
                                                          <span className="text-[8px] font-bold uppercase tracking-tighter">
                                                            Vincular
                                                          </span>
                                                        </button>
                                                      )}
                                                  </div>
                                                  <span className="text-[9px] uppercase tracking-[0.1em] text-[var(--text-s)] opacity-40 italic mt-0.5">
                                                    {ri.isRecipe
                                                      ? "Fórmula Base"
                                                      : ingredient?.brand ||
                                                        (ingredient?.category ===
                                                        "generico"
                                                          ? "Insumo Genérico"
                                                          : "Marca no especificada")}
                                                  </span>
                                                </div>
                                              </td>
                                              <td className="px-6 py-4 text-right">
                                                <div className="inline-flex items-center gap-2 bg-black/20 rounded-lg p-1.5 border border-white/5 group-hover:border-[var(--accent)]/30 transition-all">
                                                  <input
                                                    type="number"
                                                    value={ri.amount}
                                                    onChange={(e) => {
                                                      const val =
                                                        parseFloat(
                                                          e.target.value,
                                                        ) || 0;
                                                      const newIngredients = [
                                                        ...selectedRecipe.ingredients,
                                                      ];
                                                      newIngredients[idx] = {
                                                        ...ri,
                                                        amount: val,
                                                      };
                                                      const newTotal =
                                                        newIngredients.reduce(
                                                          (acc, curr) =>
                                                            acc + curr.amount,
                                                          0,
                                                        );
                                                      handleUpdateRecipe({
                                                        ...selectedRecipe,
                                                        ingredients:
                                                          newIngredients,
                                                        totalYield: newTotal,
                                                        finalYield: newTotal,
                                                      });
                                                    }}
                                                    className="w-20 bg-transparent text-right text-sm font-mono text-[var(--accent)] focus:text-white transition-all outline-none"
                                                  />
                                                  <span className="text-[10px] uppercase font-bold text-white/20 mr-1">
                                                    g
                                                  </span>
                                                </div>
                                              </td>
                                              <td className="px-6 py-4 text-right">
                                                <span className="text-xs font-mono font-bold text-white/40">
                                                  {percentage.toFixed(2)}%
                                                </span>
                                              </td>
                                              <td className="px-4 py-4 text-center">
                                                <button
                                                  onClick={() =>
                                                    removeIngredientFromRecipe(
                                                      idx,
                                                    )
                                                  }
                                                  className="p-2 text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                                >
                                                  <Trash2 size={16} />
                                                </button>
                                              </td>
                                            </tr>
                                          );
                                        },
                                      )}
                                      {/* Total Row with Validation */}
                                      <tr className="bg-white/5 font-bold">
                                        <td className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/60">
                                          Total Formulación
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-mono text-white">
                                          {recipeTotalWeight.toFixed(2)} g
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                          <div className="flex flex-col items-end">
                                            <span className={`text-sm font-mono ${Math.abs(recipeTotalWeight - 100) < 0.01 || Math.abs(recipeTotalWeight - 1000) < 0.01 ? "text-emerald-400" : "text-amber-400"}`}>
                                              {selectedRecipe.ingredients.length > 0 ? "100.00%" : "0.00%"}
                                            </span>
                                            {selectedRecipe.ingredients.length > 0 && Math.abs(recipeTotalWeight - 100) > 0.01 && Math.abs(recipeTotalWeight - 1000) > 0.01 && (
                                              <span className="text-[8px] text-white/30 uppercase tracking-tighter mt-1">
                                                Tip: Formular base 100 o 1000 para balancear
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                          {selectedRecipe.ingredients.length > 0 && Math.abs(selectedRecipe.ingredients.reduce((acc, ri) => acc + (recipeTotalWeight > 0 ? (ri.amount / recipeTotalWeight) * 100 : 0), 0) - 100) < 0.01 ? (
                                            <Check size={16} className="text-emerald-400 mx-auto" />
                                          ) : (
                                            <AlertCircle size={16} className="text-amber-400 mx-auto" />
                                          )}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>

                                <div className="flex gap-4">
                                  <div className="flex-1 relative">
                                    <div className="flex gap-2">
                                      <div className="relative flex-1">
                                        <Plus
                                          size={14}
                                          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
                                        />
                                        <input
                                          type="text"
                                          placeholder="🔍 BUSCAR MATERIA PRIMA POR NOMBRE O MARCA..."
                                          value={ingTargetSearch}
                                          onChange={(e) =>
                                            setIngTargetSearch(e.target.value)
                                          }
                                          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-4 text-[10px] font-bold uppercase tracking-[0.1em] text-white outline-none focus:border-[var(--accent)] transition-all placeholder:text-white/20 shadow-inner"
                                        />
                                        {ingTargetSearch && (
                                          <div className="absolute bottom-full left-0 right-0 mb-2 bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xl max-h-60 overflow-y-auto z-50">
                                            <button
                                              onClick={() => {
                                                setResolvingIngredient({
                                                  index:
                                                    selectedRecipe.ingredients
                                                      .length,
                                                  name: ingTargetSearch,
                                                  isSearching: false,
                                                  data: {
                                                    name: ingTargetSearch,
                                                    category: "especifico",
                                                  },
                                                });
                                                setIngTargetSearch("");
                                              }}
                                              className="w-full text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] hover:bg-white/5 transition-all flex items-center gap-2 border-b border-[var(--border)]"
                                            >
                                              <PlusCircle size={14} />
                                              Crear "{ingTargetSearch}" como
                                              nuevo
                                            </button>
                                            {ingredients
                                              .filter(
                                                (i) =>
                                                  i.name
                                                    .toLowerCase()
                                                    .includes(
                                                      ingTargetSearch.toLowerCase(),
                                                    ) ||
                                                  i.brand
                                                    ?.toLowerCase()
                                                    .includes(
                                                      ingTargetSearch.toLowerCase(),
                                                    ),
                                              )
                                              .slice(0, 10)
                                              .map((ing) => (
                                                <button
                                                  key={ing.id}
                                                  onClick={() => {
                                                    addIngredientToRecipe(
                                                      ing.id,
                                                    );
                                                    setIngTargetSearch("");
                                                  }}
                                                  className="w-full text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white/70 hover:bg-white/5 hover:text-[var(--accent)] transition-all flex items-center justify-between"
                                                >
                                                  <span>
                                                    {ing.name}{" "}
                                                    <span className="opacity-40 italic ml-2">
                                                      ({ing.brand || "Genérico"}
                                                      )
                                                    </span>
                                                  </span>
                                                  {ingredients.find(
                                                    (ei) =>
                                                      ei.name.toLowerCase() ===
                                                        ing.name.toLowerCase() &&
                                                      ei.id !== ing.id,
                                                  ) && (
                                                    <span className="text-[8px] bg-amber-500/10 text-amber-500 px-1 rounded">
                                                      Ya en sistema
                                                    </span>
                                                  )}
                                                </button>
                                              ))}
                                          </div>
                                        )}
                                      </div>
                                      <button
                                        onClick={() =>
                                          setIsAddingSubRecipe(true)
                                        }
                                        className="px-6 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-rose-500/20 transition-all font-serif italic"
                                      >
                                        Sub-Receta
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <div className="p-6 bg-rose-500/5 rounded-2xl border border-rose-500/10">
                                  <h4 className="text-[10px] uppercase font-bold text-rose-400 tracking-widest mb-4">
                                    Parámetros Técnicos
                                  </h4>
                                  <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                      <div className="flex flex-col gap-2">
                                        <span className="text-[10px] text-[var(--text-s)] uppercase font-bold">
                                          Rendimiento Final (
                                          {selectedRecipe.finalYield}g)
                                        </span>
                                        <input
                                          type="range"
                                          min={10}
                                          max={selectedRecipe.totalYield * 1.5}
                                          value={selectedRecipe.finalYield}
                                          onChange={(e) =>
                                            handleUpdateRecipe({
                                              ...selectedRecipe,
                                              finalYield:
                                                parseFloat(e.target.value) || 0,
                                            })
                                          }
                                          className="w-full h-1 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                                        />
                                      </div>
                                      <div className="flex flex-col gap-2">
                                        <span className="text-[10px] text-[var(--text-s)] uppercase font-bold">
                                          Porción ({selectedRecipe.servingSize}
                                          g)
                                        </span>
                                        <input
                                          type="range"
                                          min={1}
                                          max={400}
                                          value={selectedRecipe.servingSize}
                                          onChange={(e) =>
                                            handleUpdateRecipe({
                                              ...selectedRecipe,
                                              servingSize:
                                                parseFloat(e.target.value) || 0,
                                            })
                                          }
                                          className="w-full h-1 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                                        />
                                      </div>
                                    </div>
                                    <div className="bg-black/20 rounded-xl p-4 flex flex-col justify-center gap-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-[9px] uppercase font-bold text-[var(--text-s)]">
                                          Sólido/Líquido
                                        </span>
                                        <button
                                          onClick={() =>
                                            handleUpdateRecipe({
                                              ...selectedRecipe,
                                              isLiquid:
                                                !selectedRecipe.isLiquid,
                                            })
                                          }
                                          className={`w-12 h-6 rounded-full relative transition-all ${selectedRecipe.isLiquid ? "bg-rose-500" : "bg-slate-600"}`}
                                        >
                                          <div
                                            className={`absolute top-1 h-4 w-4 bg-white rounded-full transition-all ${selectedRecipe.isLiquid ? "left-7" : "left-1"}`}
                                          />
                                        </button>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-[9px] uppercase font-bold text-[var(--text-s)]">
                                          Porciones/Empaque
                                        </span>
                                        <input
                                          type="number"
                                          value={
                                            selectedRecipe.portionsPerPackage
                                          }
                                          onChange={(e) =>
                                            handleUpdateRecipe({
                                              ...selectedRecipe,
                                              portionsPerPackage:
                                                parseInt(e.target.value) || 1,
                                            })
                                          }
                                          className="w-12 bg-transparent border-b border-white/20 text-right text-xs font-mono outline-none"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                  {!selectedRecipe.isTrialFormula ? (
                                    <button
                                      onClick={() =>
                                        handleUpdateRecipe({
                                          ...selectedRecipe,
                                          status: "informacion_nutricional",
                                        })
                                      }
                                      className="flex items-center gap-3 bg-[var(--accent)] text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-[var(--accent)]/30 hover:scale-105 transition-all"
                                    >
                                      CONTINUAR A INFO NUTRICIONAL
                                      <ArrowRight size={18} />
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-4">
                                      <span className="text-[10px] text-white/20 italic uppercase tracking-widest">
                                        Formulación en Modo Experimental
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {selectedRecipe.status ===
                              "informacion_nutricional" && (
                              <div className="flex-1 p-8 custom-scrollbar overflow-y-auto space-y-10">
                                <header>
                                  <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--accent)]">
                                    Módulo II
                                  </span>
                                  <h2 className="text-3xl font-light italic mt-2 font-serif">
                                    Cálculo e Informe Nutricional
                                  </h2>
                                  <p className="text-[var(--text-s)] text-xs mt-2 leading-relaxed max-w-md">
                                    Validación de la composición química y
                                    cumplimiento con la Ley de Etiquetado
                                    Frontal 27.642.
                                  </p>
                                </header>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="stat-card">
                                    <p className="text-[10px] uppercase font-bold text-[var(--text-s)] tracking-widest mb-1">
                                      Impacto Calórico
                                    </p>
                                    <p className="text-3xl font-light">
                                      {roundValue(
                                        nutritionData.perServing.energy,
                                        "energy",
                                      )}{" "}
                                      <span className="text-sm italic">
                                        kcal/porción
                                      </span>
                                    </p>
                                  </div>
                                  <div className="stat-card !border-l-amber-500">
                                    <p className="text-[10px] uppercase font-bold text-[var(--text-s)] tracking-widest mb-1">
                                      Densidad de Sodio
                                    </p>
                                    <p className="text-3xl font-light">
                                      {roundValue(
                                        nutritionData.perServing.sodium,
                                        "sodium",
                                      )}{" "}
                                      <span className="text-sm italic">mg</span>
                                    </p>
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                                      Composición Nutricional detallada
                                    </h4>
                                    <span className="text-[9px] font-mono opacity-20">
                                      REF: VALORES POR CADA{" "}
                                      {selectedRecipe.servingSize}g
                                    </span>
                                  </div>
                                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-x-auto custom-scrollbar w-full">
                                    <table className="nutri-table !text-sm w-full">
                                      <thead>
                                        <tr className="bg-white/5">
                                          <th className="pl-6 py-4 text-left">Nutriente</th>
                                          <th className="text-right px-4">Por 100g</th>
                                          <th className="text-right px-4">Por Porción ({selectedRecipe.servingSize}g)</th>
                                          <th className="text-right pr-6">% VD*</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[var(--border)]">
                                        {[
                                          { n: "Hidratos de Carbono", id: "carbs", u: "g" },
                                          { n: "- Azúcares Totales", id: "totalSugars", u: "g" },
                                          { n: "- Azúcares Añadidos", id: "addedSugars", u: "g" },
                                          { n: "Proteínas", id: "proteins", u: "g" },
                                          { n: "Grasas Totales", id: "totalFats", u: "g" },
                                          { n: "Grasas Saturadas", id: "saturatedFats", u: "g" },
                                          { n: "- Grasas Trans", id: "transFats", u: "g" },
                                          { n: "Fibra Alimentaria", id: "fiber", u: "g" },
                                          { n: "Sodio", id: "sodium", u: "mg" },
                                        ].map((row, i) => {
                                          const val100g = (nutritionData.adjustedNutrients as any)[row.id] * (100 / (selectedRecipe.finalYield || 1));
                                          const valServing = (nutritionData.perServing as any)[row.id];
                                          const percent = (nutritionData.percentDV as any)[row.id];
                                          
                                          return (
                                            <tr key={i} className="hover:bg-white/5 transition-all">
                                              <td className="pl-6 py-4 font-medium text-[var(--text-s)]">
                                                {row.n}
                                              </td>
                                              <td className="text-right px-4 py-4 font-mono text-white/40">
                                                {roundValue(val100g, row.id as any)}{row.u}
                                              </td>
                                              <td className="text-right px-4 py-4 font-mono font-bold">
                                                {roundValue(valServing, row.id as any)}{row.u}
                                              </td>
                                              <td className="text-right pr-6 py-4 font-mono text-[var(--accent)] font-bold">
                                                {percent ? `${percent.toFixed(0)}%` : "--"}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                <div className="flex justify-between pt-6">
                                  <button
                                    onClick={() =>
                                      handleUpdateRecipe({
                                        ...selectedRecipe,
                                        status: "formulacion",
                                      })
                                    }
                                    className="py-4 px-8 border border-white/10 rounded-2xl text-xs font-bold uppercase tracking-widest text-[var(--text-s)] hover:bg-white/5 transition-all"
                                  >
                                    Volver a Formulación
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleUpdateRecipe({
                                        ...selectedRecipe,
                                        status: "creado_en_sistema",
                                      })
                                    }
                                    className="py-4 px-8 bg-emerald-500 text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all flex items-center gap-3"
                                  >
                                    Validar y Guardar Perfil
                                    <Check size={18} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right Side: Results / Visuals */}
                          <div className="flex flex-col bg-[var(--surface)] custom-scrollbar overflow-y-auto p-8 space-y-10 border-l border-[var(--border)]">
                            {(selectedRecipe.isTrialFormula === true ||
                              selectedRecipe.status ===
                                "informacion_nutricional") && (
                              <>
                                <section>
                                  <h3 className="text-xs font-bold uppercase tracking-widest text-white mb-6">
                                    Octógonos de Advertencia
                                  </h3>
                                  <div className="flex flex-wrap gap-4 justify-center">
                                    {nutritionData.warnings.length > 0 ? (
                                      nutritionData.warnings.map((w, i) => (
                                        <div
                                          key={i}
                                          className="octagon w-28 h-28 flex flex-col items-center justify-center text-center p-2 leading-tight"
                                        >
                                          {w.split(" ").map((word, wi) => (
                                            <span key={wi} className="block text-[7px] font-black tracking-tighter">
                                              {word}
                                            </span>
                                          ))}
                                        </div>
                                      ))
                                    ) : (
                                      <div className="w-full p-10 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex flex-col items-center justify-center text-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                          <Check size={32} />
                                        </div>
                                        <div>
                                          <h4 className="font-bold text-emerald-400 uppercase tracking-widest text-xs">
                                            Cumplimiento Total
                                          </h4>
                                          <p className="text-[var(--text-s)] text-[10px] mt-1 leading-relaxed">
                                            Este perfil no requiere sellos de
                                            advertencia bajo la Ley 27.642.
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </section>

                                {/* Nutritional table inside right column (only for trial formulation) */}
                                {selectedRecipe.isTrialFormula === true && (
                                  <section className="space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="text-xs font-bold uppercase tracking-widest text-white">
                                        Composición Nutricional detallada
                                      </h4>
                                      <span className="text-[9px] font-mono opacity-20">
                                        REF: VALORES POR CADA{" "}
                                        {selectedRecipe.servingSize}g
                                      </span>
                                    </div>
                                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-x-auto custom-scrollbar w-full">
                                      <table className="nutri-table !text-sm w-full font-sans text-left">
                                        <thead>
                                          <tr className="bg-white/5 border-b border-[var(--border)]">
                                            <th className="pl-6 py-3 text-[10px] uppercase font-bold text-[var(--text-s)] tracking-widest">
                                              Nutriente
                                            </th>
                                            <th className="text-right py-3 text-[10px] uppercase font-bold text-[var(--text-s)] tracking-widest">
                                              Valor
                                            </th>
                                            <th className="text-right pr-6 py-3 text-[10px] uppercase font-bold text-[var(--text-s)] tracking-widest">
                                              % VD*
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border)]">
                                          {[
                                            {
                                              n: "Hidratos de Carbono",
                                              v: roundValue(
                                                nutritionData.perServing.carbs,
                                                "carbs",
                                              ),
                                              u: "g",
                                              p: nutritionData.percentDV.carbs,
                                            },
                                            {
                                              n: "- Azúcares Totales",
                                              v: roundValue(
                                                nutritionData.perServing
                                                  .totalSugars,
                                                "totalSugars",
                                              ),
                                              u: "g",
                                              p: null,
                                            },
                                            {
                                              n: "- Azúcares Añadidos",
                                              v: roundValue(
                                                nutritionData.perServing
                                                  .addedSugars,
                                                "addedSugars",
                                              ),
                                              u: "g",
                                              p: null,
                                            },
                                            {
                                              n: "Proteínas",
                                              v: roundValue(
                                                nutritionData.perServing
                                                  .proteins,
                                                "proteins",
                                              ),
                                              u: "g",
                                              p: nutritionData.percentDV
                                                .proteins,
                                            },
                                            {
                                              n: "Grasas Totales",
                                              v: roundValue(
                                                nutritionData.perServing
                                                  .totalFats,
                                                "totalFats",
                                              ),
                                              u: "g",
                                              p: nutritionData.percentDV
                                                .totalFats,
                                            },
                                            {
                                              n: "Grasas Saturadas",
                                              v: roundValue(
                                                nutritionData.perServing
                                                  .saturatedFats,
                                                "saturatedFats",
                                              ),
                                              u: "g",
                                              p: null,
                                            },
                                            {
                                              n: "- Grasas Trans",
                                              v: roundValue(
                                                nutritionData.perServing
                                                  .transFats,
                                                "transFats",
                                              ),
                                              u: "g",
                                              p: null,
                                            },
                                            {
                                              n: "Fibra Alimentaria",
                                              v: roundValue(
                                                nutritionData.perServing.fiber,
                                                "fiber",
                                              ),
                                              u: "g",
                                              p: null,
                                            },
                                            {
                                              n: "Sodio",
                                              v: roundValue(
                                                nutritionData.perServing.sodium,
                                                "sodium",
                                              ),
                                              u: "mg",
                                              p: nutritionData.percentDV.sodium,
                                            },
                                          ].map((row, i) => (
                                            <tr
                                              key={i}
                                              className="hover:bg-white/5 transition-all border-b border-[var(--border)]"
                                            >
                                              <td className="pl-6 py-3 font-medium text-[var(--text-s)]">
                                                {row.n}
                                              </td>
                                              <td className="text-right py-3 font-mono">
                                                {row.v}
                                                {row.u}
                                              </td>
                                              <td className="text-right pr-6 py-3 font-mono opacity-40">
                                                {row.p
                                                  ? `${row.p.toFixed(0)}%`
                                                  : "--"}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </section>
                                )}

                                <section className="space-y-4">
                                  <h3 className="text-xs font-bold uppercase tracking-widest text-white mb-2">
                                    Desglose de Aportes (%)
                                  </h3>
                                  <div className="space-y-4">
                                    {nutritionData.ingredientBreakdown
                                      .slice(0, 5)
                                      .map((item, i) => (
                                        <div
                                          key={i}
                                          className="space-y-1.5 peer"
                                        >
                                          <div className="flex justify-between text-[10px] uppercase font-bold tracking-tighter">
                                            <span className="text-white/60">
                                              {item.name}
                                            </span>
                                            <span className="text-[var(--accent)] font-mono">
                                              {item.percentageByWeight.toFixed(
                                                1,
                                              )}
                                              %
                                            </span>
                                          </div>
                                          <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden">
                                            <motion.div
                                              initial={{ width: 0 }}
                                              animate={{
                                                width: `${item.percentageByWeight}%`,
                                              }}
                                              className="h-full bg-[var(--accent)] rounded-full"
                                            />
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </section>

                                <section>
                                  <h3 className="text-xs font-bold uppercase tracking-widest text-white mb-6">
                                    Reporte para Marketing / DDPP
                                  </h3>
                                  <div className="space-y-8">
                                    {/* Denominación */}
                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                      <h4 className="text-[10px] uppercase font-bold text-[var(--accent)] tracking-widest mb-3 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                                        1. Denominación del Producto
                                      </h4>
                                      <p className="text-lg font-light italic font-serif text-white tracking-tight">
                                        {selectedRecipe.name.toUpperCase()}
                                      </p>
                                    </div>
                                    
                                    {/* Ingredientes */}
                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                      <h4 className="text-[10px] uppercase font-bold text-[var(--accent)] tracking-widest mb-3 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                                        2. Lista de Ingredientes (Orden Decreciente)
                                      </h4>
                                      <div className="text-[11px] font-sans leading-relaxed text-white/80">
                                        {nutritionData.ingredientList.map((name, idx) => {
                                          const flourEnrichmentText = "Harina de trigo enriquecida según Ley 25.630. Contiene hierro (30mg/kg), ácido fólico (2.2mg/kg), tiamina (6.3mg/kg), riboflavina (1.3mg/kg), niacina (13mg/kg)";
                                          const isFlour = name.includes("HARINA") || name.includes("TRIGO");
                                          return (
                                            <span key={idx}>
                                              {isFlour ? (
                                                <span className="text-white font-bold underline decoration-amber-500/50 underline-offset-4" title="Requiere aclaración Ley 25.630">
                                                  {name}*
                                                </span>
                                              ) : name}
                                              {idx < nutritionData.ingredientList.length - 1 ? ", " : "."}
                                            </span>
                                          );
                                        })}
                                        {nutritionData.ingredientList.some(n => n.includes("HARINA") || n.includes("TRIGO")) && (
                                          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                            <p className="text-[10px] italic text-amber-200/80 leading-snug">
                                              * Harina de trigo enriquecida según Ley 25.630. Contiene hierro (30mg/kg), ácido fólico (2.2mg/kg), tiamina (6.3mg/kg), riboflavina (1.3mg/kg), niacina (13mg/kg).
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Alérgenos */}
                                    <div className="bg-rose-500/5 p-6 rounded-2xl border border-rose-500/20">
                                      <h4 className="text-[10px] uppercase font-bold text-rose-400 tracking-widest mb-3 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                        3. Declaración de Alérgenos
                                      </h4>
                                      <p className="text-xs font-bold text-rose-100 uppercase tracking-wide leading-relaxed">
                                        {nutritionData.allergenDeclaration || "NO CONTIENE ALÉRGENOS DECLARABLES."}
                                      </p>
                                    </div>

                                    {/* Advertencias / Octógonos */}
                                    <div className="bg-black/20 p-6 rounded-2xl border border-white/5">
                                      <h4 className="text-[10px] uppercase font-bold text-white/40 tracking-widest mb-4 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                        4. Advertencias (Ley 27.642)
                                      </h4>
                                      <div className="flex flex-wrap gap-3">
                                        {nutritionData.warnings.length > 0 ? (
                                          nutritionData.warnings.map((w, idx) => (
                                            <div key={idx} className="bg-black border-2 border-white px-3 py-1.5 text-white text-[9px] font-black tracking-widest flex items-center gap-2">
                                              <div className="w-2 h-2 bg-white rotate-45" />
                                              {w}
                                            </div>
                                          ))
                                        ) : (
                                          <div className="text-[10px] text-white/30 italic">No requiere sellos de advertencia.</div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Info Nutricional (UI Table) */}
                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                      <h4 className="text-[10px] uppercase font-bold text-[var(--accent)] tracking-widest mb-4 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                                        5. Información Nutricional (Formato Cuadro)
                                      </h4>
                                      <div className="overflow-x-auto custom-scrollbar border border-white/5 rounded-xl">
                                        <table className="w-full text-[10px] text-left border-collapse">
                                          <thead>
                                            <tr className="bg-white/10 text-white/40 uppercase tracking-tighter">
                                              <th className="p-3 font-bold border-r border-white/5">Nutriente</th>
                                              <th className="p-3 text-right font-bold border-r border-white/5">100g</th>
                                              <th className="p-3 text-right font-bold border-r border-white/5">Porción</th>
                                              <th className="p-3 text-right font-bold">%VD</th>
                                            </tr>
                                          </thead>
                                          <tbody className="text-white/70">
                                            {[
                                              { n: "Energía (kcal)", id: "energy" },
                                              { n: "Energía (kJ)", id: "energyKJ" },
                                              { n: "Hidratos (g)", id: "carbs" },
                                              { n: "- Azúcares Tot. (g)", id: "totalSugars" },
                                              { n: "- Azúcares Añad. (g)", id: "addedSugars" },
                                              { n: "Proteínas (g)", id: "proteins" },
                                              { n: "Grasas Tot. (g)", id: "totalFats" },
                                              { n: "- Saturadas (g)", id: "saturatedFats" },
                                              { n: "- Trans (g)", id: "transFats" },
                                              { n: "Fibra (g)", id: "fiber" },
                                              { n: "Sodio (mg)", id: "sodium" },
                                            ].map((row, ridx) => {
                                              const val100 = (nutritionData.adjustedNutrients as any)[row.id] * (100 / (selectedRecipe.finalYield || 1));
                                              const valServ = (nutritionData.perServing as any)[row.id];
                                              const pvd = (nutritionData.percentDV as any)[row.id];
                                              return (
                                                <tr key={ridx} className="border-t border-white/5 hover:bg-white/5">
                                                  <td className="p-3 font-medium border-r border-white/5">{row.n}</td>
                                                  <td className="p-3 text-right font-mono border-r border-white/5">{roundValue(val100, row.id as any)}</td>
                                                  <td className="p-3 text-right font-mono font-bold text-white border-r border-white/5">{roundValue(valServ, row.id as any)}</td>
                                                  <td className="p-3 text-right font-mono text-[var(--accent)] font-bold">{pvd ? `${pvd.toFixed(0)}%` : "0%"}</td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>

                                    {/* Copy Section */}
                                    <div className="bg-black/40 p-6 rounded-2xl border border-[var(--accent)]/30 shadow-2xl shadow-[var(--accent)]/5">
                                      <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-[10px] uppercase font-bold text-[var(--accent)] tracking-widest flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                                          6. Texto Final para Marketing (Copy/Paste)
                                        </h4>
                                        <button
                                          onClick={copyToClipboard}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)] text-black rounded-lg text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all"
                                        >
                                          <Copy size={12} />
                                          {copiedLabel ? "¡COPIADO!" : "COPIAR TEXTO"}
                                        </button>
                                      </div>
                                      <div className="label-copy-box custom-scrollbar max-h-[300px] overflow-y-auto leading-relaxed text-[9px] font-mono text-white/50 bg-[var(--surface)] p-4 rounded-xl border border-white/5 whitespace-pre-wrap selection:bg-[var(--accent)] selection:text-black">
                                        {generateLabelText(selectedRecipe, nutritionData)}
                                      </div>
                                    </div>
                                  </div>
                                </section>
                              </>
                            )}

                            {selectedRecipe.status === "creado_en_sistema" && (
                              <div className="flex-1 p-8 custom-scrollbar overflow-y-auto space-y-8 flex flex-col items-center justify-center text-center">
                                <motion.div
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 mb-4"
                                >
                                  <Check size={48} strokeWidth={3} />
                                </motion.div>
                                <div className="space-y-2">
                                  <h2 className="text-3xl font-light italic">
                                    Producto Cargado en Sistema
                                  </h2>
                                  <p className="text-[var(--text-s)] text-sm max-w-sm mx-auto">
                                    La información nutricional y la formulación
                                    han sido validadas exitosamente. El producto
                                    ahora reside en la base de datos oficial.
                                  </p>
                                </div>
                                <button
                                  onClick={() =>
                                    handleUpdateRecipe({
                                      ...selectedRecipe,
                                      status: "finalizado",
                                    })
                                  }
                                  className="mt-4 px-10 py-4 bg-emerald-500 text-white rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all flex items-center gap-3"
                                >
                                  Finalizar Desarrollo
                                  <Check size={20} />
                                </button>
                              </div>
                            )}

                            {selectedRecipe.status === "finalizado" && (
                              <div className="flex-1 p-8 custom-scrollbar overflow-y-auto space-y-8 flex flex-col items-center justify-center text-center">
                                <div className="relative">
                                  <Package
                                    size={80}
                                    className="text-[var(--accent)] opacity-20"
                                  />
                                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 rounded-full p-2 text-white border-4 border-[var(--bg)] shadow-lg">
                                    <Check size={24} />
                                  </div>
                                </div>
                                <h2 className="text-3xl font-light italic">
                                  Proyecto Finalizado
                                </h2>
                                <div className="flex flex-col sm:flex-row gap-4 mt-6">
                                  {selectedRecipe.sourceProjectId && (
                                    <button
                                      onClick={() => navigateTo("developments")}
                                      className="px-8 py-4 bg-rose-400/20 text-rose-400 border border-rose-400/20 rounded-2xl font-bold uppercase tracking-widest hover:bg-rose-400 hover:text-white transition-all flex items-center justify-center gap-2"
                                    >
                                      <GitMerge size={18} />
                                      Ver Proyecto de Origen
                                    </button>
                                  )}
                                  <button
                                    onClick={() => navigateTo("dashboard")}
                                    className="px-8 py-4 bg-[var(--surface)] text-white border border-[var(--border)] rounded-2xl font-bold uppercase tracking-widest hover:bg-white/5 transition-all"
                                  >
                                    Ir al Panel Principal
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          "¿Seguro que deseas volver a editar esta receta?",
                                        )
                                      ) {
                                        handleUpdateRecipe({
                                          ...selectedRecipe,
                                          status: "formulacion",
                                        });
                                      }
                                    }}
                                    className="px-8 py-4 bg-white/5 text-white/40 border border-white/10 rounded-2xl font-bold uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
                                  >
                                    Deshacer / Seguir Editando
                                  </button>
                                </div>
                              </div>
                            )}

                            {selectedRecipe.status === "formulacion" && (
                              <div className="h-full flex flex-col justify-center items-center text-center p-6 space-y-6">
                                <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center relative">
                                  <div className="absolute inset-0 border border-white/5 rounded-full animate-ping opacity-20" />
                                  <FlaskConical
                                    size={64}
                                    className="text-white/20"
                                  />
                                </div>
                                <div className="space-y-4">
                                  <h3 className="text-xl font-light italic text-white/40">
                                    Visualizador de Ficha Técnica
                                  </h3>
                                  <p className="text-[var(--text-s)] text-xs leading-loose max-w-[240px]">
                                    Avance al módulo de{" "}
                                    <span className="text-[var(--accent)]">
                                      Información Nutricional
                                    </span>{" "}
                                    para visualizar sellos, advertencias y el
                                    texto final de la etiqueta.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}

              {view === "trial_manager" && (
                <motion.div
                  key="trial_manager"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="p-8 custom-scrollbar overflow-y-auto h-full"
                >
                  <TrialManager 
                    recipes={recipes} 
                    developments={developments}
                    onSaveTrial={async (trial) => {
                      if (user) {
                        await saveRecipe(trial, user.uid);
                      } else {
                        setRecipes(prev => {
                          const idx = prev.findIndex(r => r.id === trial.id);
                          if (idx >= 0) {
                            const next = [...prev];
                            next[idx] = trial;
                            return next;
                          }
                          return [...prev, trial];
                        });
                      }
                    }}
                    onDeleteTrial={async (id) => {
                      if (window.confirm("¿Estás seguro de eliminar esta prueba?")) {
                        if (user) {
                          await deleteRecipe(id);
                        } else {
                          setRecipes(prev => prev.filter(r => r.id !== id));
                        }
                      }
                    }}
                  />
                </motion.div>
              )}

              {view === "ingredients" && (
                <motion.div
                  key="ingredients"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 h-full overflow-hidden bg-[var(--bg)] flex flex-col lg:grid lg:grid-cols-[280px_1fr] bg-[var(--border)] gap-[1px]"
                >
                  {/* Ingredients Sidebar */}
                  <aside className="pane bg-[var(--bg)] custom-scrollbar overflow-y-auto hidden lg:flex flex-col">
                    <div className="pane-title mb-4">Filtrar Insumos</div>

                    <div className="mb-6 relative group">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[var(--accent)] transition-colors"
                        size={14}
                      />
                      <input
                        type="text"
                        placeholder="Buscador rápido..."
                        value={ingSearch}
                        onChange={(e) => setIngSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-[10px] uppercase font-bold tracking-widest text-white outline-none focus:border-[var(--accent)] transition-all"
                      />
                    </div>

                    <div className="pane-title mb-4 bg-gradient-to-r from-rose-400 to-amber-400 bg-clip-text text-transparent">
                      Clasificación Principal
                    </div>
                    <div className="space-y-1">
                      {[
                        {
                          label: "Almacén Completo",
                          count: ingredients.length,
                          id: "all",
                          icon: Database,
                          color: "text-rose-400",
                        },
                        {
                          label: "Lácteos",
                          count: ingredients.filter(
                            (i) => i.functionalGroup === "lacteos",
                          ).length,
                          id: "lacteos",
                          icon: Milk,
                          color: "text-blue-400",
                        },
                        {
                          label: "Azúcares",
                          count: ingredients.filter(
                            (i) => i.functionalGroup === "azucares",
                          ).length,
                          id: "azucares",
                          icon: Candy,
                          color: "text-amber-400",
                        },
                        {
                          label: "Aceites & Materia G.",
                          count: ingredients.filter(
                            (i) => i.functionalGroup === "aceites",
                          ).length,
                          id: "aceites",
                          icon: Droplets,
                          color: "text-cyan-400",
                        },
                        {
                          label: "Frutos Secos",
                          count: ingredients.filter(
                            (i) => i.functionalGroup === "frutos_secos",
                          ).length,
                          id: "frutos_secos",
                          icon: Sprout,
                          color: "text-orange-400",
                        },
                        {
                          label: "Chocolates & Cacaos",
                          count: ingredients.filter(
                            (i) => i.functionalGroup === "chocolates",
                          ).length,
                          id: "chocolates",
                          icon: Cookie,
                          color: "text-orange-900",
                        },
                        {
                          label: "Neutros & Estabil.",
                          count: ingredients.filter(
                            (i) => i.functionalGroup === "neutros",
                          ).length,
                          id: "neutros",
                          icon: FlaskConical,
                          color: "text-purple-400",
                        },
                        {
                          label: "Pastas & Bases",
                          count: ingredients.filter(
                            (i) => i.functionalGroup === "pastas",
                          ).length,
                          id: "pastas",
                          icon: Wheat,
                          color: "text-yellow-600",
                        },
                        {
                          label: "Frutas",
                          count: ingredients.filter(
                            (i) => i.functionalGroup === "frutas",
                          ).length,
                          id: "frutas",
                          icon: Apple,
                          color: "text-emerald-400",
                        },
                        {
                          label: "Aditivos",
                          count: ingredients.filter(
                            (i) => i.functionalGroup === "aditivos",
                          ).length,
                          id: "aditivos",
                          icon: FlaskRound,
                          color: "text-indigo-400",
                        },
                        {
                          label: "Misceláneos",
                          count: ingredients.filter(
                            (i) => i.functionalGroup === "miscelaneos",
                          ).length,
                          id: "miscelaneos",
                          icon: Layers,
                          color: "text-slate-400",
                        },
                        {
                          label: "Genéricos (Base)",
                          count: ingredients.filter(
                            (i) => i.category === "generico",
                          ).length,
                          id: "generico",
                          icon: Box,
                          color: "text-slate-400",
                        },
                      ].map((cat, i) => (
                        <button
                          key={i}
                          onClick={() => setIngCategory(cat.id)}
                          className={`w-full text-left px-4 py-3 rounded-xl text-[10px] uppercase tracking-wider font-bold flex justify-between items-center transition-all group ${
                            ingCategory === cat.id
                              ? "bg-white/10 text-white shadow-xl ring-1 ring-white/20"
                              : "text-[var(--text-s)] hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <cat.icon
                              size={14}
                              className={
                                ingCategory === cat.id
                                  ? cat.color
                                  : "opacity-40 group-hover:opacity-100"
                              }
                            />
                            <span>{cat.label}</span>
                          </div>
                          <span
                            className={`font-mono text-[9px] ${ingCategory === cat.id ? "text-white/60" : "opacity-40"}`}
                          >
                            {cat.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="pane-title mt-8 mb-4 opacity-50">
                      Nutrición & Alertas
                    </div>
                    <div className="space-y-1">
                      {[
                        {
                          label: "Materias Primas Críticas",
                          count: ingredients.filter((i) => i.energy > 300)
                            .length,
                          id: "critico",
                          icon: Flame,
                        },
                        {
                          label: "Bajos en Sodio",
                          count: ingredients.filter((i) => i.sodium < 50)
                            .length,
                          id: "bajo_sodio",
                          icon: Wind,
                        },
                      ].map((cat, i) => (
                        <button
                          key={i}
                          onClick={() => setIngCategory(cat.id)}
                          className={`w-full text-left px-4 py-2.5 rounded text-[10px] uppercase tracking-wider font-bold flex justify-between items-center transition-all ${
                            ingCategory === cat.id
                              ? "bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30"
                              : "text-[var(--text-s)] hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <cat.icon size={12} className="opacity-40" />
                            <span>{cat.label}</span>
                          </div>
                          <span className="opacity-40 font-mono text-[9px]">
                            {cat.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="mt-auto p-4 bg-white/5 rounded-lg border border-white/5">
                      <div className="flex items-center gap-2 mb-2 text-amber-500">
                        <Info size={14} />
                        <span className="text-[10px] font-bold uppercase">
                          Sincronización
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--text-s)] leading-relaxed italic">
                        Los valores nutricionales se actualizan automáticamente
                        desde la base de datos de Anmat y USDA.
                      </p>
                    </div>
                  </aside>

                  <div className="pane bg-[var(--bg)] custom-scrollbar overflow-y-auto flex-1">
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                      <div className="space-y-1">
                        <div className="pane-title">
                          Almacén de Materias Primas
                        </div>
                        <h2 className="text-3xl font-light italic font-serif">
                          Inventario de Insumos
                        </h2>
                      </div>
                      <div className="flex items-center gap-3 w-full md:w-auto">
                        {(ingSearch || ingCategory !== "all") && (
                          <button
                            onClick={() => {
                              setIngSearch("");
                              setIngCategory("all");
                            }}
                            className="text-[10px] font-bold uppercase text-[var(--accent)] hover:underline whitespace-nowrap"
                          >
                            Limpiar Filtros
                          </button>
                        )}
                        <div className="flex-1 md:w-80">
                          <div className="relative group">
                            <Search
                              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[var(--accent)] transition-colors"
                              size={16}
                            />
                            <input
                              type="text"
                              placeholder="BUSCAR MATERIA PRIMA (NOMBRE, MARCA, RNPA...)"
                              value={ingSearch}
                              onChange={(e) => setIngSearch(e.target.value)}
                              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-full pl-12 pr-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white focus:outline-none focus:border-[var(--accent)] border-white/10 hover:border-white/20 transition-all shadow-inner"
                            />
                          </div>
                        </div>
                        <button
                          onClick={consolidateIngredients}
                          disabled={isSeeding}
                          className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-500 hover:bg-amber-500/20 transition-all flex items-center gap-2 px-4 group"
                          title="Consolidar duplicados automáticos (mismo nombre y marca)"
                        >
                          <Combine
                            className={isSeeding ? "animate-spin" : ""}
                            size={18}
                          />
                          <span className="text-[10px] font-bold uppercase tracking-wider hidden md:inline">
                            Auto-Limpiar
                          </span>
                        </button>
                        <button
                          onClick={seedDatabase}
                          disabled={isSeeding}
                          className="p-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-full text-[var(--text-s)] hover:text-white transition-all"
                          title="Sincronizar Base de Datos"
                        >
                          <RefreshCw
                            className={isSeeding ? "animate-spin" : ""}
                            size={18}
                          />
                        </button>
                        <button
                          onClick={() => {
                            setIsMergeMode(!isMergeMode);
                            setMergeTargetId(null);
                            setMergeSourceIds([]);
                          }}
                          className={`p-2.5 border rounded-full transition-all flex items-center gap-2 px-4 ${isMergeMode ? "bg-amber-500 border-amber-500 text-white" : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-s)] hover:text-white"}`}
                          title="Unificar Insumos Duplicados"
                        >
                          <GitMerge size={18} />
                          <span className="text-[10px] font-bold uppercase tracking-wider hidden md:inline">
                            {isMergeMode ? "Cancelar" : "Unificar"}
                          </span>
                        </button>
                        <button
                          onClick={() =>
                            setResolvingIngredient({
                              index: -1,
                              name: "",
                              isSearching: false,
                              data: { category: "especifico" },
                            })
                          }
                          className="flex items-center gap-2 bg-[var(--accent)] text-white px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg shadow-[var(--accent)]/20 hover:scale-105 transition-all"
                        >
                          <Plus size={16} />
                          <span className="hidden sm:inline">Nuevo Insumo</span>
                        </button>
                      </div>
                    </header>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
                      {[
                        {
                          label: "Total Items",
                          value: ingredients.length,
                          icon: Database,
                          color: "text-rose-400",
                        },
                        {
                          label: "Recetas Base",
                          value: recipes.filter((r) => r.type === "base")
                            .length,
                          icon: Layers,
                          color: "text-slate-400",
                        },
                        {
                          label: "Productos Finales",
                          value: recipes.filter((r) => r.type === "final")
                            .length,
                          icon: Package,
                          color: "text-emerald-400",
                        },
                      ].map((stat, i) => (
                        <div
                          key={i}
                          className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl flex items-center gap-4"
                        >
                          <div
                            className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center ${stat.color}`}
                          >
                            <stat.icon size={20} />
                          </div>
                          <div>
                            <div className="text-[10px] uppercase font-bold text-[var(--text-s)] tracking-widest">
                              {stat.label}
                            </div>
                            <div className="text-xl font-light">
                              {stat.value}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-x-auto shadow-2xl">
                      <table className="nutri-table !text-sm min-w-[1300px]">
                        <thead className="bg-white/5">
                          <tr>
                            {isMergeMode && (
                              <th className="pl-6 w-[140px] text-left">
                                Unificación
                              </th>
                            )}
                            <th className="pl-6">Componente / Proveedor</th>
                            <th className="text-center">Clasificación</th>
                            <th className="text-center">kcal</th>
                            <th className="text-center">Proteína</th>
                            <th className="text-center">Lípidos</th>
                            <th className="text-center">Glúcidos</th>
                            <th className="text-left py-4">DNI Legal (RNPA)</th>
                            <th className="text-center pr-6">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {filteredIngredients.length === 0 && (
                            <tr>
                              <td
                                colSpan={isMergeMode ? 10 : 9}
                                className="py-24 text-center"
                              >
                                <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
                                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-white/10 ring-1 ring-white/10">
                                    <Database size={32} />
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-white font-bold uppercase tracking-[0.2em] text-[10px]">
                                      Almacén Vacío
                                    </p>
                                    <p className="text-[var(--text-s)] text-[10px] leading-relaxed italic opacity-60">
                                      {ingSearch
                                        ? `No hay resultados para "${ingSearch}"`
                                        : "Aún no has registrado materias primas en esta categoría."}
                                    </p>
                                  </div>
                                  {user && ingredients.length === 0 && (
                                    <button
                                      onClick={seedDatabase}
                                      className="mt-4 px-8 py-2.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-all shadow-xl"
                                    >
                                      Sincronizar Datos Base
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                          {filteredIngredients.map((ing) => (
                            <tr
                              key={ing.id}
                              className={`hover:bg-white/5 transition-all group ${mergeTargetId === ing.id ? "bg-emerald-500/5" : mergeSourceIds.includes(ing.id) ? "bg-red-500/5" : ""}`}
                            >
                              {isMergeMode && (
                                <td className="pl-6 py-4">
                                  <div className="flex flex-col gap-1.5">
                                    <button
                                      onClick={() => {
                                        if (mergeTargetId === ing.id) {
                                          setMergeTargetId(null);
                                        } else {
                                          setMergeTargetId(ing.id);
                                          setMergeSourceIds((prev) =>
                                            prev.filter((id) => id !== ing.id),
                                          );
                                        }
                                      }}
                                      className={`text-[9px] uppercase font-bold p-1 rounded border text-center transition-all ${mergeTargetId === ing.id ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white/5 border-white/10 text-white/40 hover:text-white"}`}
                                    >
                                      {mergeTargetId === ing.id
                                        ? "MAESTRO"
                                        : "Fijar Maestro"}
                                    </button>
                                    {mergeTargetId !== ing.id && (
                                      <button
                                        onClick={() => {
                                          setMergeSourceIds((prev) =>
                                            prev.includes(ing.id)
                                              ? prev.filter(
                                                  (id) => id !== ing.id,
                                                )
                                              : [...prev, ing.id],
                                          );
                                        }}
                                        className={`text-[9px] uppercase font-bold p-1 rounded border text-center transition-all ${mergeSourceIds.includes(ing.id) ? "bg-red-500 border-red-500 text-white" : "bg-white/5 border-white/10 text-white/40 hover:text-white"}`}
                                      >
                                        {mergeSourceIds.includes(ing.id)
                                          ? "DUPLICADO"
                                          : "Es Duplicado"}
                                      </button>
                                    )}
                                  </div>
                                </td>
                              )}
                              <td className="pl-6 py-4">
                                <div className="flex flex-col">
                                  <div className="font-medium text-[var(--text-p)]">
                                    {ing.name}
                                  </div>
                                  <div className="text-[10px] uppercase tracking-wider text-[var(--text-s)] mt-0.5 font-mono">
                                    {ing.brand || "STANDARDIZED CORE"}
                                  </div>
                                </div>
                              </td>
                              <td className="text-center">
                                <div
                                  onClick={() => {
                                    setResolvingIngredient({
                                      index: -1,
                                      name: ing.name,
                                      isSearching: false,
                                      data: ing,
                                    });
                                  }}
                                  className="flex flex-col items-center gap-1 cursor-pointer hover:scale-105 transition-all"
                                >
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold border ${ing.category === "generico" ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : "bg-purple-500/10 border-purple-500/30 text-purple-400"}`}
                                  >
                                    {ing.category}
                                  </span>
                                  {ing.functionalGroup && (
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[8px] uppercase font-bold border whitespace-nowrap ${
                                        ing.functionalGroup === "lacteos"
                                          ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                                          : ing.functionalGroup === "azucares"
                                            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                            : ing.functionalGroup === "aceites"
                                              ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                                              : ing.functionalGroup ===
                                                  "frutos_secos"
                                                ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                                                : ing.functionalGroup ===
                                                    "chocolates"
                                                  ? "bg-orange-900/20 border-orange-900/30 text-orange-900"
                                                  : ing.functionalGroup ===
                                                      "neutros"
                                                    ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
                                                    : ing.functionalGroup ===
                                                        "pastas"
                                                      ? "bg-yellow-600/10 border-yellow-600/30 text-yellow-600"
                                                      : ing.functionalGroup ===
                                                          "frutas"
                                                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                                        : ing.functionalGroup ===
                                                            "aditivos"
                                                          ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                                                          : "bg-white/5 border-white/10 text-white/60"
                                      }`}
                                    >
                                      {ing.functionalGroup.replace("_", " ")}
                                    </span>
                                  )}
                                  {ing.isTrialOnly && (
                                    <span className="px-2 py-0.5 rounded-full text-[7px] uppercase font-bold bg-amber-500/10 border border-amber-500/30 text-amber-500 whitespace-nowrap">
                                      LOTE PRUEBA
                                    </span>
                                  )}
                                  {ing.isGlutenFree && (
                                    <span className="px-2 py-0.5 rounded-full text-[7px] uppercase font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 whitespace-nowrap">
                                      SIN TACC
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="text-center font-mono text-[var(--text-p)]">
                                {ing.energy}
                              </td>
                              <td className="text-center font-mono text-[var(--text-s)]">
                                {ing.proteins}g
                              </td>
                              <td className="text-center font-mono text-[var(--text-s)]">
                                {ing.totalFats}g
                              </td>
                              <td className="text-center font-mono text-[var(--text-s)]">
                                {ing.sugars}g
                              </td>
                              <td className="text-left">
                                <div className="flex flex-col gap-1">
                                  {ing.isTrialOnly ? (
                                    <div className="space-y-0.5">
                                      <div className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">
                                        INFO PRUEBA
                                      </div>
                                      <div className="text-[9px] text-white/60 font-mono">
                                        LOTE: {ing.trialBatch || "-"}
                                      </div>
                                      <div className="text-[9px] text-white/60 font-mono">
                                        VTO: {ing.trialExpiration || "-"}
                                      </div>
                                      <div className="text-[9px] text-white/60 font-mono">
                                        CANT: {ing.trialQuantity || "-"}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] font-mono text-white/60">
                                      {ing.rnpa || "Sin RNPA"}
                                    </span>
                                  )}
                                  <div className="flex gap-2">
                                    {ing.technicalSheetUrl && (
                                      <a
                                        href={ing.technicalSheetUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-rose-400 hover:text-rose-300 flex items-center gap-1"
                                        title="Ficha Técnica"
                                      >
                                        <FileText size={10} />
                                        <span className="text-[8px] uppercase font-bold">
                                          Ficha
                                        </span>
                                      </a>
                                    )}
                                    {ing.certificateUrl && (
                                      <a
                                        href={ing.certificateUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                                        title="Certificado"
                                      >
                                        <Scale size={10} />
                                        <span className="text-[8px] uppercase font-bold">
                                          Cert.
                                        </span>
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="text-center pr-6">
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={() => handleWebSync(ing)}
                                    disabled={isSearchingWeb === ing.id}
                                    className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all disabled:opacity-20 flex items-center justify-center"
                                    title="Actualizar desde la web"
                                  >
                                    {isSearchingWeb === ing.id ? (
                                      <Loader2
                                        className="animate-spin"
                                        size={14}
                                      />
                                    ) : (
                                      <RefreshCw size={14} />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => {
                                      // Find the recipe index if needed, but here we just need a modal to edit the ingredient
                                      setResolvingIngredient({
                                        index: -1, // Not part of a recipe sync
                                        name: ing.name,
                                        isSearching: false,
                                        data: ing,
                                      });
                                    }}
                                    className="p-2 rounded-lg bg-white/5 text-[var(--text-s)] hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteIngredient(ing.id)
                                    }
                                    className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all flex items-center justify-center"
                                    title="Eliminar Insumo"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {isMergeMode && (
                      <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50 border-4 border-white/20 backdrop-blur-md"
                      >
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-black tracking-widest opacity-80">
                            Asistente de Unificación
                          </span>
                          <span className="text-sm font-bold">
                            {mergeTargetId
                              ? `Unificando ${mergeSourceIds.length} ítems en "${ingredients.find((i) => i.id === mergeTargetId)?.name}"`
                              : "Seleccione el ingrediente Maestro"}
                          </span>
                        </div>
                        <button
                          onClick={handleMergeIngredients}
                          disabled={
                            !mergeTargetId ||
                            mergeSourceIds.length === 0 ||
                            isSeeding
                          }
                          className="px-6 py-2 bg-white text-amber-600 rounded-xl font-bold uppercase text-xs tracking-widest hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
                        >
                          {isSeeding ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Combine size={16} />
                          )}
                          Confirmar Unificación
                        </button>
                        <button
                          onClick={() => {
                            setIsMergeMode(false);
                            setMergeTargetId(null);
                            setMergeSourceIds([]);
                          }}
                          className="text-white/60 hover:text-white transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

              {view === "guide" && (
                <motion.div
                  key="guide"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-8 h-full custom-scrollbar overflow-y-auto space-y-10"
                >
                  <div className="flex items-center gap-6 mb-10">
                    <div className="w-20 h-20 bg-[var(--accent)]/10 rounded-3xl flex items-center justify-center text-[var(--accent)] border border-[var(--accent)]/20">
                      <FileText size={40} />
                    </div>
                    <div>
                      <h2 className="text-4xl font-light italic text-white">
                        Centro de Asesoría Técnica
                      </h2>
                      <p className="text-[var(--text-s)] uppercase tracking-widest text-xs mt-1">
                        Normativas CAA y Rotulado Omnicanal
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                      <section className="bg-[var(--surface)] border border-[var(--border)] p-8 rounded-3xl space-y-6">
                        <div className="flex items-center gap-4 text-[var(--accent)]">
                          <Info size={32} />
                          <h2 className="text-3xl font-light italic text-white">
                            Ley de Etiquetado Frontal
                          </h2>
                        </div>
                        <p className="text-[var(--text-s)] leading-loose">
                          Argentina adopta el perfil de nutrientes de la OPS
                          para productos con exceso de nutrientes críticos.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                            <h4 className="text-[10px] uppercase font-bold text-white tracking-widest">
                              Azúcares Libres
                            </h4>
                            <p className="text-xs text-[var(--text-s)]">
                              Crítico si la energía de azúcares es ≥ 10% de la
                              energía total.
                            </p>
                          </div>
                          <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                            <h4 className="text-[10px] uppercase font-bold text-white tracking-widest">
                              Sodio
                            </h4>
                            <p className="text-xs text-[var(--text-s)]">
                              Crítico si es ≥ 1mg/kcal o ≥ 300mg cada 100g.
                            </p>
                          </div>
                        </div>
                      </section>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-2xl space-y-4">
                          <h3 className="font-bold uppercase tracking-widest text-xs flex items-center gap-2 text-rose-400">
                            <Layers size={16} />
                            Gestión de Alérgenos
                          </h3>
                          <p className="text-[var(--text-s)] text-[11px] leading-relaxed">
                            Obligatoriedad de declarar: gluten, leche, huevo,
                            pescado, crustáceos, maní, soja y frutos secos.
                          </p>
                        </div>
                        <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-2xl space-y-4 text-emerald-400">
                          <h3 className="font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                            <Scale size={16} />
                            Reglas de Redondeo
                          </h3>
                          <p className="text-[var(--text-s)] text-[11px] leading-relaxed">
                            Cumplimiento estricto del Capítulo V del CAA para
                            declaración jurada nutricional.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-gradient-to-br from-[var(--accent)]/20 to-transparent border border-[var(--accent)]/30 p-8 rounded-3xl space-y-6">
                        <div className="flex items-center gap-3 text-[var(--accent)]">
                          <Sparkles size={24} />
                          <h3 className="font-bold uppercase tracking-widest text-sm">
                            Consultoría IA
                          </h3>
                        </div>
                        <p className="text-[var(--text-s)] text-xs italic">
                          Pregunte sobre reemplazo de aditivos o normativa
                          específica.
                        </p>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Su consulta técnica..."
                            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-4 px-4 text-xs outline-none focus:border-[var(--accent)]"
                          />
                          <button className="absolute right-2 top-2 p-2 bg-[var(--accent)] rounded-lg text-white">
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        <footer className="h-[40px] px-6 bg-[var(--surface)] border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--text-s)] z-30 shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Usuario: I+D_Manager_AR
            </span>
            <span className="opacity-30">|</span>
            <span>Región: Cono Sur</span>
          </div>
          <div className="font-mono tracking-tighter opacity-60">
            SISTEMA DE GESTIÓN I+D: GIANDUIA LAB v5.0.0 - 2024
          </div>
        </footer>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.03); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.08); }
        input[type="range"] { -webkit-appearance: none; appearance: none; cursor: pointer; background: transparent; }
        input[type="range"]::-webkit-slider-thumb { 
          -webkit-appearance: none; 
          height: 14px; 
          width: 14px; 
          border-radius: 50%; 
          background: #fff; 
          border: 1px solid rgba(0,0,0,0.1);
          box-shadow: 0 0 10px rgba(255,255,255,0.2);
          margin-top: -6px;
        }
        input[type="range"]::-webkit-slider-runnable-track {
          width: 100%;
          height: 1px;
          background: rgba(255,255,255,0.1);
          border-radius: 0;
        }
      `,
        }}
      />

      <AnimatePresence>
        {deletingRecipeId && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg)] border border-red-500/20 rounded-xl w-full max-w-sm overflow-hidden shadow-2xl"
            >
              <div className="p-6 text-center space-y-6">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto">
                  <Trash2 size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white uppercase tracking-widest">
                    ¿Eliminar Proyecto?
                  </h3>
                  <p className="text-[var(--text-s)] text-xs">
                    Esta acción eliminará permanentemente la fórmula y todos sus
                    datos asociados.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeletingRecipeId(null)}
                    className="flex-1 px-4 py-3 bg-[var(--surface)] text-[var(--text-s)] rounded-lg text-[10px] font-bold uppercase tracking-widest border border-[var(--border)] hover:bg-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() =>
                      deletingRecipeId && handleDeleteRecipe(deletingRecipeId)
                    }
                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-red-600"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {deletingDevelopmentId && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg)] border border-red-500/20 rounded-xl w-full max-w-sm overflow-hidden shadow-2xl"
            >
              <div className="p-6 text-center space-y-6">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto">
                  <Trash2 size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white uppercase tracking-widest">
                    ¿Eliminar Desarrollo?
                  </h3>
                  <p className="text-[var(--text-s)] text-xs">
                    Esta acción eliminará permanentemente el registro de este
                    desarrollo I+D.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeletingDevelopmentId(null)}
                    className="flex-1 px-4 py-3 bg-[var(--surface)] text-[var(--text-s)] rounded-lg text-[10px] font-bold uppercase tracking-widest border border-[var(--border)] hover:bg-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() =>
                      deletingDevelopmentId &&
                      handleDeleteDevelopment(deletingDevelopmentId, true)
                    }
                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-red-600"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Resolution Modal */}
      <AnimatePresence>
        {resolvingIngredient && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
            >
              {/* Header con diseño más premium */}
              <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-b from-white/[0.03] to-transparent shrink-0">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-[var(--accent)]/10 rounded-2xl flex items-center justify-center text-[var(--accent)] shadow-inner">
                    <FlaskConical size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-[3px] text-white">
                      Configuración de Materia Prima
                    </h3>
                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-[4px] mt-1">
                      Módulo de Catalogación Técnica
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setResolvingIngredient(null)}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 text-white/20 hover:text-white transition-all border border-white/5"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-10 overflow-y-auto custom-scrollbar flex-1">
                {resolvingIngredient.isSearching ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-8">
                    <div className="relative">
                      <div className="absolute inset-0 bg-[var(--accent)]/20 blur-3xl animate-pulse rounded-full" />
                      <Loader2
                        className="animate-spin text-[var(--accent)] relative z-10"
                        size={64}
                      />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-2xl font-light italic text-white font-serif">
                        Sincronizando con fuentes oficiales...
                      </p>
                      <p className="text-[var(--text-s)] text-xs uppercase font-bold tracking-[2px] opacity-40">
                        Investigando parámetros para "{resolvingIngredient.data?.name || resolvingIngredient.name}"
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Columna Izquierda: Identificación y Clasificación */}
                    <div className="space-y-8">
                      <section className="space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                          <Fingerprint size={16} className="text-[var(--accent)]" />
                          <h4 className="text-[11px] font-black uppercase tracking-[3px] text-white/40">Identificación de Insumo</h4>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="text-[9px] uppercase font-black text-white/20 tracking-widest block mb-2">
                              Nombre del Componente
                            </label>
                            <div className="relative group">
                              <input
                                type="text"
                                value={resolvingIngredient.data?.name || ""}
                                onChange={(e) =>
                                  setResolvingIngredient({
                                    ...resolvingIngredient,
                                    data: {
                                      ...resolvingIngredient.data,
                                      name: e.target.value,
                                    },
                                  })
                                }
                                placeholder="Ej: Azúcar Impalpable"
                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-base text-white outline-none focus:border-[var(--accent)] focus:bg-white/[0.05] transition-all"
                              />
                              <button
                                onClick={handleIngredientWebSearch}
                                className="absolute right-2 top-2 bottom-2 bg-[var(--accent)] text-white px-4 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[var(--accent)]/20"
                              >
                                <Sparkles size={14} />
                                Buscar en Web
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[9px] uppercase font-black text-white/20 tracking-widest block mb-2">
                                DNI Legal (RNPA)
                              </label>
                              <input
                                type="text"
                                placeholder="Número de Registro"
                                value={resolvingIngredient.data?.rnpa || ""}
                                onChange={(e) =>
                                  setResolvingIngredient({
                                    ...resolvingIngredient,
                                    data: {
                                      ...resolvingIngredient.data,
                                      rnpa: e.target.value,
                                    },
                                  })
                                }
                                className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-white/20 transition-all"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] uppercase font-black text-white/20 tracking-widest block mb-2">
                                Marca / Fabricante
                              </label>
                              <input
                                type="text"
                                placeholder="Genérico / Propia"
                                value={resolvingIngredient.data?.brand || ""}
                                onChange={(e) =>
                                  setResolvingIngredient({
                                    ...resolvingIngredient,
                                    data: {
                                      ...resolvingIngredient.data,
                                      brand: e.target.value,
                                    },
                                  })
                                }
                                className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-white/20 transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                          <Layers size={16} className="text-amber-400" />
                          <h4 className="text-[11px] font-black uppercase tracking-[3px] text-white/40">Clasificación Técnica</h4>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[9px] uppercase font-black text-white/20 tracking-widest block mb-2">
                              Alcance
                            </label>
                            <select
                              value={resolvingIngredient.data?.category}
                              onChange={(e) =>
                                setResolvingIngredient({
                                  ...resolvingIngredient,
                                  data: {
                                    ...resolvingIngredient.data,
                                    category: e.target.value as any,
                                  },
                                })
                              }
                              className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-white/20 transition-all appearance-none"
                            >
                              <option value="generico" className="bg-[#0a0a0a]">Genérico</option>
                              <option value="especifico" className="bg-[#0a0a0a]">Específico</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] uppercase font-black text-white/20 tracking-widest block mb-2">
                              Grupo Funcional
                            </label>
                            <select
                              value={
                                resolvingIngredient.data?.functionalGroup || "otros"
                              }
                              onChange={(e) =>
                                setResolvingIngredient({
                                  ...resolvingIngredient,
                                  data: {
                                    ...resolvingIngredient.data,
                                    functionalGroup: e.target.value as any,
                                  },
                                })
                              }
                              className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-white/20 transition-all appearance-none"
                            >
                              <option value="otros" className="bg-[#0a0a0a]">Seleccionar Grupo...</option>
                              <option value="lacteos" className="bg-[#0a0a0a]">Lácteos</option>
                              <option value="azucares" className="bg-[#0a0a0a]">Azúcares</option>
                              <option value="aceites" className="bg-[#0a0a0a]">Aceites & Grasas</option>
                              <option value="frutos_secos" className="bg-[#0a0a0a]">Frutos Secos</option>
                              <option value="chocolates" className="bg-[#0a0a0a]">Chocolates & Cacaos</option>
                              <option value="neutros" className="bg-[#0a0a0a]">Neutros & Estabil.</option>
                              <option value="pastas" className="bg-[#0a0a0a]">Pastas & Concentrados</option>
                              <option value="frutas" className="bg-[#0a0a0a]">Frutas</option>
                              <option value="aditivos" className="bg-[#0a0a0a]">Aditivos</option>
                              <option value="miscelaneos" className="bg-[#0a0a0a]">Misceláneos</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <button
                            onClick={() =>
                              setResolvingIngredient({
                                ...resolvingIngredient,
                                data: {
                                  ...resolvingIngredient.data,
                                  isGlutenFree:
                                    !resolvingIngredient.data?.isGlutenFree,
                                },
                              })
                            }
                            className={`flex-1 flex items-center justify-center gap-3 px-4 py-4 rounded-2xl font-black text-[10px] uppercase transition-all border ${
                              resolvingIngredient.data?.isGlutenFree
                                ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                                : "bg-white/[0.02] border-white/5 text-white/20 hover:text-white/40"
                            }`}
                          >
                            <Check size={16} />
                            Certificado SIN TACC
                          </button>
                          
                          <button
                            onClick={() =>
                              setResolvingIngredient({
                                ...resolvingIngredient,
                                data: {
                                  ...resolvingIngredient.data,
                                  isTrialOnly: !resolvingIngredient.data?.isTrialOnly,
                                },
                              })
                            }
                            className={`flex-1 flex items-center justify-center gap-3 px-4 py-4 rounded-2xl font-black text-[10px] uppercase transition-all border ${
                              resolvingIngredient.data?.isTrialOnly
                                ? "bg-amber-500/10 border-amber-500 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                                : "bg-white/[0.02] border-white/5 text-white/20 hover:text-white/40"
                            }`}
                          >
                            <FlaskConical size={16} />
                            Muestra / Piloto
                          </button>
                        </div>
                      </section>

                      <section className="space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                          <Paperclip size={16} className="text-blue-400" />
                          <h4 className="text-[11px] font-black uppercase tracking-[3px] text-white/40">Documentación Adjunta</h4>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[9px] uppercase font-black text-white/20 tracking-widest block">Ficha Técnica</label>
                            <div className="relative">
                              <label className="cursor-pointer bg-white/[0.03] border border-white/5 rounded-xl p-4 hover:bg-white/[0.06] transition-all flex items-center justify-between group">
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest truncate max-w-[120px]">
                                  {resolvingIngredient.data?.technicalSheetUrl ? "PDF Cargado" : "Subir PDF"}
                                </span>
                                {isUploading === "sheet" ? <Loader2 size={14} className="animate-spin text-[var(--accent)]" /> : <Upload size={14} className="text-white/20 group-hover:text-white" />}
                                <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleIngredientFileUpload(e, "sheet")} />
                              </label>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] uppercase font-black text-white/20 tracking-widest block">Certificado</label>
                            <div className="relative">
                              <label className="cursor-pointer bg-white/[0.03] border border-white/5 rounded-xl p-4 hover:bg-white/[0.06] transition-all flex items-center justify-between group">
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest truncate max-w-[120px]">
                                  {resolvingIngredient.data?.certificateUrl ? "PDF Cargado" : "Subir PDF"}
                                </span>
                                {isUploading === "cert" ? <Loader2 size={14} className="animate-spin text-[var(--accent)]" /> : <Upload size={14} className="text-white/20 group-hover:text-white" />}
                                <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleIngredientFileUpload(e, "cert")} />
                              </label>
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>

                    {/* Columna Derecha: Nutrición y Alérgenos */}
                    <div className="space-y-8 bg-white/[0.02] p-8 rounded-[2rem] border border-white/5 shadow-inner">
                      <section className="space-y-6">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Gauge size={16} className="text-emerald-400" />
                            <h4 className="text-[11px] font-black uppercase tracking-[3px] text-white/40">Parámetros Nutricionales (100g)</h4>
                          </div>
                          {resolvingIngredient.data?.source && (
                            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                              Origen: Web ({resolvingIngredient.data.source})
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                          {[
                            { id: "energy", label: "Energía (kcal)", unit: "kcal" },
                            { id: "proteins", label: "Proteínas", unit: "g" },
                            { id: "carbs", label: "Carbohidratos", unit: "g" },
                            { id: "sugars", label: "Azúcares", unit: "g" },
                            { id: "totalFats", label: "Grasas Totales", unit: "g" },
                            { id: "saturatedFats", label: "G. Saturadas", unit: "g" },
                            { id: "fiber", label: "Fibra", unit: "g" },
                            { id: "sodium", label: "Sodio", unit: "mg" },
                          ].map((nutrient) => (
                            <div key={nutrient.id} className="relative group">
                              <label className="text-[9px] uppercase font-black text-white/20 tracking-widest block mb-1">
                                {nutrient.label}
                              </label>
                              <div className="flex items-end gap-2 border-b border-white/10 group-focus-within:border-[var(--accent)] transition-all pb-1">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={(resolvingIngredient.data as any)[nutrient.id] || 0}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const update: any = { [nutrient.id]: val };
                                    if (nutrient.id === "energy") {
                                      update.energyKJ = Math.round(val * 4.184);
                                    }
                                    setResolvingIngredient({
                                      ...resolvingIngredient,
                                      data: {
                                        ...resolvingIngredient.data,
                                        ...update,
                                      },
                                    });
                                  }}
                                  className="bg-transparent text-lg font-mono text-white outline-none w-full"
                                />
                                <span className="text-[10px] font-black text-white/10 uppercase tracking-widest mb-1">{nutrient.unit}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {resolvingIngredient.data?.confidenceNote && (
                          <div className="p-4 bg-[var(--accent)]/5 border border-[var(--accent)]/10 rounded-2xl flex items-start gap-3">
                            <Sparkles size={14} className="text-[var(--accent)] shrink-0 mt-0.5" />
                            <p className="text-[10px] text-[var(--accent)] font-bold italic tracking-wide opacity-80">
                              IA Insight: {resolvingIngredient.data.confidenceNote}
                            </p>
                          </div>
                        )}
                      </section>

                      <section className="space-y-6 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-3 mb-2">
                          <AlertCircle size={16} className="text-rose-400" />
                          <h4 className="text-[11px] font-black uppercase tracking-[3px] text-white/40">Presencia de Alérgenos</h4>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {COMMON_ALLERGENS.map((allergen) => {
                            const entry = resolvingIngredient.data?.allergens?.find(
                              (a) => a.allergen === allergen,
                            );
                            return (
                              <button
                                key={allergen}
                                onClick={() => {
                                  const current = resolvingIngredient.data?.allergens || [];
                                  const exists = current.find((a) => a.allergen === allergen);
                                  let next;
                                  if (exists) {
                                    next = current.filter((a) => a.allergen !== allergen);
                                  } else {
                                    next = [...current, { allergen, type: "contiene" }];
                                  }
                                  setResolvingIngredient({
                                    ...resolvingIngredient,
                                    data: {
                                      ...resolvingIngredient.data,
                                      allergens: next,
                                    },
                                  });
                                }}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                  entry
                                    ? entry.type === "contiene"
                                      ? "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20"
                                      : entry.type === "puede_contener"
                                        ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20"
                                        : "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20"
                                    : "bg-white/[0.03] border-white/5 text-white/20 hover:border-white/20 hover:text-white/40"
                                }`}
                              >
                                {allergen}
                              </button>
                            );
                          })}
                        </div>

                        {resolvingIngredient.data?.allergens && resolvingIngredient.data.allergens.length > 0 && (
                          <div className="space-y-3 bg-black/20 p-4 rounded-2xl border border-white/5">
                            {resolvingIngredient.data.allergens.map((ae, i) => (
                              <div key={i} className="flex items-center justify-between gap-4">
                                <span className="text-[11px] font-bold text-white/80 uppercase tracking-widest">{ae.allergen}</span>
                                <select
                                  value={ae.type}
                                  onChange={(e) => {
                                    const next = [...(resolvingIngredient.data?.allergens || [])];
                                    next[i] = { ...ae, type: e.target.value as AllergenType };
                                    setResolvingIngredient({
                                      ...resolvingIngredient,
                                      data: {
                                        ...resolvingIngredient.data,
                                        allergens: next,
                                      },
                                    });
                                  }}
                                  className="bg-transparent text-[10px] font-black uppercase text-[var(--accent)] outline-none cursor-pointer"
                                >
                                  <option value="contiene" className="bg-[#0a0a0a]">Contiene</option>
                                  <option value="derivado_de" className="bg-[#0a0a0a]">Derivado de</option>
                                  <option value="puede_contener" className="bg-[#0a0a0a]">Puede contener</option>
                                </select>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-10 py-8 bg-white/[0.02] border-t border-white/5 flex justify-between items-center shrink-0">
                <button
                  onClick={() => setResolvingIngredient(null)}
                  className="px-8 py-4 text-[11px] font-black uppercase tracking-[3px] text-white/20 hover:text-white transition-all"
                >
                  Descartar Cambios
                </button>
                <button
                  onClick={() => finalizeResolution(resolvingIngredient.data || {})}
                  className="px-12 py-4 bg-[var(--accent)] text-white rounded-2xl text-[11px] font-black uppercase tracking-[4px] shadow-2xl shadow-[var(--accent)]/40 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Finalizar Catalogación
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() =>
                setConfirmModal((prev) => ({ ...prev, show: false }))
              }
              className="absolute inset-0 bg-[var(--bg)]/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[var(--surface)] border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden"
            >
              <div
                className={`absolute top-0 left-0 w-full h-1 ${
                  confirmModal.type === "danger"
                    ? "bg-red-500"
                    : confirmModal.type === "warning"
                      ? "bg-amber-500"
                      : "bg-[var(--accent)]"
                }`}
              />

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      confirmModal.type === "danger"
                        ? "bg-red-500/10 text-red-500"
                        : confirmModal.type === "warning"
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-[var(--accent)]/10 text-[var(--accent)]"
                    }`}
                  >
                    {confirmModal.type === "danger" ? (
                      <Trash2 size={24} />
                    ) : confirmModal.type === "warning" ? (
                      <AlertTriangle size={24} />
                    ) : (
                      <HelpCircle size={24} />
                    )}
                  </div>
                  <h3 className="text-xl font-light italic font-serif">
                    {confirmModal.title}
                  </h3>
                </div>

                <p className="text-[var(--text-s)] text-sm leading-relaxed">
                  {confirmModal.message}
                </p>

                <div className="flex gap-3 pt-6">
                  <button
                    onClick={() =>
                      setConfirmModal((prev) => ({ ...prev, show: false }))
                    }
                    className="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--text-s)] border border-white/10 hover:bg-white/5 rounded transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      confirmModal.onConfirm();
                      setConfirmModal((prev) => ({ ...prev, show: false }));
                    }}
                    className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest text-white rounded transition-all hover:brightness-110 ${
                      confirmModal.type === "danger"
                        ? "bg-red-600"
                        : confirmModal.type === "warning"
                          ? "bg-amber-500"
                          : "bg-[var(--accent)]"
                    }`}
                  >
                    {confirmModal.confirmText || "Confirmar"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Modals */}
      <DataManagementModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        ingredients={ingredients}
        recipes={recipes}
        developments={developments}
        onImport={handleImport}
        isImporting={isSeeding}
      />

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*,.pdf"
        className="hidden"
      />
      <input
        type="file"
        ref={excelInputRef}
        onChange={handleExcelUpload}
        accept=".xlsx,.xls"
        className="hidden"
      />

      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-[var(--bg)]/80 backdrop-blur-md"
          >
            <div className="flex flex-col items-center gap-6 p-12 bg-[var(--surface)] border border-white/10 rounded-3xl shadow-2xl">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-[var(--accent)]/20 border-t-[var(--accent)] rounded-full animate-spin" />
                <Sparkles
                  className="absolute inset-0 m-auto text-[var(--accent)] animate-pulse"
                  size={24}
                />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-light italic font-serif">
                  Escaneando Receta...
                </h3>
                <p className="text-[var(--text-s)] text-xs uppercase tracking-widest font-bold opacity-60">
                  La IA de Gianduia Lab está procesando los ingredientes
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </ErrorBoundary>
    </div>
  );
}
function generateLabelText(recipe: Recipe, data: CalculationResult): string {
  const flourEnrichmentText = "Harina de trigo enriquecida según Ley 25.630. Contiene hierro (30mg/kg), ácido fólico (2.2mg/kg), tiamina (6.3mg/kg), riboflavina (1.3mg/kg), niacina (13mg/kg)";
  
  const ingList = data.ingredientList.map(name => {
    if (name.includes("HARINA") || name.includes("TRIGO")) {
      return `${name} (${flourEnrichmentText})`;
    }
    return name;
  }).join(", ");

  const serving = `${recipe.servingSize}g${recipe.servingMeasure ? ` (${recipe.servingMeasure})` : ""}`;
  
  const rows = [
    { n: "Valor Energético (kcal)", id: "energy", u: "" },
    { n: "Valor Energético (kJ)", id: "energyKJ", u: "" },
    { n: "Carbohidratos (g)", id: "carbs", u: "" },
    { n: "- Azúcares Totales (g)", id: "totalSugars", u: "" },
    { n: "- Azúcares Añadidos (g)", id: "addedSugars", u: "" },
    { n: "Proteínas (g)", id: "proteins", u: "" },
    { n: "Grasas Totales (g)", id: "totalFats", u: "" },
    { n: "- Grasas Saturadas (g)", id: "saturatedFats", u: "" },
    { n: "- Grasas Trans (g)", id: "transFats", u: "" },
    { n: "Fibra Alimentaria (g)", id: "fiber", u: "" },
    { n: "Sodio (mg)", id: "sodium", u: "" },
  ];

  let tableText = "INFORMACIÓN NUTRICIONAL\n";
  tableText += `Porción: ${serving}\n`;
  tableText += `Porciones por envase: ${recipe.portionsPerPackage || "~"}\n`;
  tableText += "----------------------------------------------------------------------\n";
  tableText += "Nutriente            | Por 100g      | Por Porción   | %VD (*)\n";
  tableText += "----------------------------------------------------------------------\n";

  rows.forEach(row => {
    const val100g = (data.adjustedNutrients as any)[row.id] * (100 / (recipe.finalYield || 1));
    const valServing = (data.perServing as any)[row.id];
    const percent = (data.percentDV as any)[row.id];
    const pStr = percent ? `${percent.toFixed(0)}%` : "0%";
    
    tableText += `${row.n.padEnd(20)} | ${roundValue(val100g, row.id as any).padEnd(13)} | ${roundValue(valServing, row.id as any).padEnd(13)} | ${pStr}\n`;
  });

  return `*** REPORTE TÉCNICO PARA MARKETING / DDPP ***

1) DENOMINACIÓN:
${recipe.name.toUpperCase()}

2) LISTA DE INGREDIENTES:
${ingList}.

3) ALÉRGENOS:
${data.allergenDeclaration || "NO CONTIENE ALÉRGENOS DECLARABLES"}.

4) CUADRO NUTRICIONAL:
${tableText}
(*) % Valores Diarios con base a una dieta de 2000 kcal u 8400 kJ. Sus valores diarios pueden ser mayores o menores dependiendo de sus necesidades energéticas.

5) SELLOS DE ADVERTENCIA:
${data.warnings.length > 0 ? data.warnings.join(", ") : "NO REQUIERE SELLOS DE ADVERTENCIA"}`;
}
