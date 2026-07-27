import React, { useState, useMemo } from 'react';
import { 
  ClipboardCheck, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  ChevronRight, 
  History,
  FileText,
  AlertCircle,
  X,
  Save,
  ArrowRight,
  PieChart,
  BarChart3,
  Calendar,
  Sparkles,
  Download,
  LayoutGrid,
  ListFilter,
  CalendarDays,
  Settings2,
  CheckCircle,
  RotateCcw,
  RefreshCw,
  Flag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Recipe, 
  Ingredient, 
  RecipeAudit, 
  AuditStatus, 
  RNPAStatus, 
  MPStatus,
  ProcedureStatus,
  RecipeCategory
} from '../types';
import { format, addDays, isPast, startOfWeek, isSameDay, isAfter, startOfDay, getDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface RecipeAuditViewProps {
  recipes: Recipe[];
  ingredients: Ingredient[];
  audits: RecipeAudit[];
  onSaveAudit: (audit: RecipeAudit) => Promise<void>;
  onUpdateRecipe?: (recipe: Recipe) => Promise<void>;
  userId: string;
}

const CATEGORIES: { id: RecipeCategory; label: string; color: string }[] = [
  { id: 'helados', label: 'Helados', color: 'bg-blue-500' },
  { id: 'pasteleria', label: 'Pastelería', color: 'bg-rose-500' },
  { id: 'paletas', label: 'Paletas', color: 'bg-purple-500' },
  { id: 'chocolateria', label: 'Chocolatería', color: 'bg-amber-700' },
  { id: 'popolo', label: 'Popolo', color: 'bg-emerald-600' },
  { id: 'vitrina', label: 'Vitrina', color: 'bg-cyan-500' },
  { id: 'semielaborado', label: 'Semielaborados', color: 'bg-slate-500' },
  { id: 'sin_definir', label: 'Sin Definir', color: 'bg-white/20' }
];

export function RecipeAuditView({ 
  recipes, 
  ingredients, 
  audits, 
  onSaveAudit,
  onUpdateRecipe,
  userId 
}: RecipeAuditViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'urgency'>('urgency');
  const [calendarMode, setCalendarMode] = useState<'normal' | 'urgency'>('normal');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'report' | 'calendar'>('grid');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Starting date for the calendar: Monday 27/07/2026
  const CALENDAR_START = new Date(2026, 6, 27); // July is 6 (0-indexed)

  // Form state
  const [auditForm, setAuditForm] = useState<Partial<RecipeAudit>>({
    status: 'ok',
    notes: '',
    isUpdated: true,
    rnpaStatus: 'al_dia',
    mpStatus: 'al_dia',
    procedureStatus: 'ok',
    improvements: '',
    deviations: '',
    findings: '',
    systemCount: 0,
    physicalCount: 0,
    adjustmentReason: ''
  });

  const getRecipeAudits = (recipeId: string) => {
    return audits
      .filter(a => a.recipeId === recipeId)
      .sort((a, b) => b.date - a.date);
  };

  const filteredRecipes = useMemo(() => {
    let result = recipes.filter(r => {
      const matchesSearch = (r.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || r.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    if (sortBy === 'urgency') {
      return result.sort((a, b) => {
        // Priority 1: Manual Priority (alta > media > baja/undefined)
        const priorityScore = (p: string | undefined) => {
          if (p === 'alta') return 3;
          if (p === 'media') return 2;
          return 1;
        };
        const scoreA = priorityScore(a.priority);
        const scoreB = priorityScore(b.priority);
        if (scoreA !== scoreB) return scoreB - scoreA;

        // Priority 2: Never audited
        const auditsA = getRecipeAudits(a.id);
        const auditsB = getRecipeAudits(b.id);
        if (auditsA.length === 0 && auditsB.length !== 0) return -1;
        if (auditsA.length !== 0 && auditsB.length === 0) return 1;
        
        // Priority 3: Oldest audit
        if (auditsA.length > 0 && auditsB.length > 0) {
          return auditsA[0].date - auditsB[0].date;
        }
        
        return a.name.localeCompare(b.name);
      });
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [recipes, searchTerm, selectedCategory, sortBy]);

  // Calendar logic: Distributed schedule starting Monday 27/07
  const calendarSchedule = useMemo(() => {
    let auditableRecipes = [...recipes];
    
    // Randomize/Shuffle to avoid alphabetical clusters
    auditableRecipes = auditableRecipes.sort(() => 0.5 - Math.random());

    if (calendarMode === 'urgency') {
      const priorityScore = (p: string | undefined) => {
        if (p === 'alta') return 3;
        if (p === 'media') return 2;
        return 1;
      };
      auditableRecipes.sort((a, b) => {
        const scoreA = priorityScore(a.priority);
        const scoreB = priorityScore(b.priority);
        if (scoreA !== scoreB) return scoreB - scoreA;
        
        const auditsA = getRecipeAudits(a.id);
        const auditsB = getRecipeAudits(b.id);
        if (auditsA.length === 0 && auditsB.length !== 0) return -1;
        if (auditsA.length !== 0 && auditsB.length === 0) return 1;
        
        return 0.5 - Math.random(); // Keep it somewhat random within same priority level
      });
    } else {
      // Priority first, then balanced areas within priority
      const priorityGroups: Record<string, Recipe[]> = {
        alta: [],
        media: [],
        baja: []
      };
      
      auditableRecipes.forEach(r => {
        const p = r.priority || 'baja';
        priorityGroups[p].push(r);
      });

      const finalBalanced: Recipe[] = [];

      ['alta', 'media', 'baja'].forEach(prioKey => {
        const group = priorityGroups[prioKey];
        if (group.length === 0) return;

        // Balance Areas within this priority group
        const categories: Record<string, Recipe[]> = {};
        group.forEach(r => {
          const cat = r.category || 'sin_definir';
          if (!categories[cat]) categories[cat] = [];
          categories[cat].push(r);
        });

        const catKeys = Object.keys(categories);
        let hasItems = true;
        let idx = 0;
        
        while (hasItems) {
          hasItems = false;
          catKeys.forEach(cat => {
            if (categories[cat][idx]) {
              finalBalanced.push(categories[cat][idx]);
              hasItems = true;
            }
          });
          idx++;
        }
      });
      auditableRecipes = finalBalanced;
    }

    const schedule: Record<string, Recipe[]> = {};
    const RECIPES_PER_DAY = 6; // Reduced load

    auditableRecipes.forEach((recipe, idx) => {
      const lastAudit = getRecipeAudits(recipe.id)[0];
      let nextDate: Date;

      if (lastAudit?.nextReviewDate && calendarMode === 'normal') {
        nextDate = startOfDay(new Date(lastAudit.nextReviewDate));
      } else {
        // Initial distribution logic starting Monday 27/07
        let dayOffset = Math.floor(idx / RECIPES_PER_DAY);
        let checkDate = addDays(CALENDAR_START, dayOffset);
        
        // Skip weekends for the initial schedule
        let dayOfWeek = getDay(checkDate);
        while (dayOfWeek === 0 || dayOfWeek === 6) {
          dayOffset++;
          checkDate = addDays(CALENDAR_START, dayOffset);
          dayOfWeek = getDay(checkDate);
        }
        nextDate = checkDate;
      }

      const dateKey = format(nextDate, 'yyyy-MM-dd');
      if (!schedule[dateKey]) schedule[dateKey] = [];
      schedule[dateKey].push(recipe);
    });

    return schedule;
  }, [recipes, audits, calendarMode, refreshKey]);

  // Stats for Report
  const stats = useMemo(() => {
    const auditable = recipes;
    const total = auditable.length;
    const audited = new Set(audits.map(a => a.recipeId)).size;
    const pending = total - audited;
    const percentage = total > 0 ? (audited / total) * 100 : 0;

    const statusCounts = audits.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryStats = CATEGORIES.map(cat => {
      const catRecipes = recipes.filter(r => r.category === cat.id);
      const catAudited = catRecipes.filter(r => audits.some(a => a.recipeId === r.id)).length;
      return {
        ...cat,
        total: catRecipes.length,
        audited: catAudited,
        percent: catRecipes.length > 0 ? (catAudited / catRecipes.length) * 100 : 0
      };
    }).filter(c => c.total > 0);

    return { total, audited, pending, percentage, statusCounts, categoryStats };
  }, [recipes, audits]);

  const checkMPStatus = (recipe: Recipe): MPStatus => {
    let hasMissingSheet = false;
    let hasMissingCert = false;

    recipe.ingredients.forEach(ri => {
      if (!ri.isRecipe) {
        const ing = ingredients.find(i => i.id === ri.ingredientId);
        if (ing) {
          if (!ing.technicalSheetUrl) hasMissingSheet = true;
          if (!ing.certificateUrl) hasMissingCert = true;
        }
      }
    });

    if (hasMissingSheet) return 'faltante_ficha';
    if (hasMissingCert) return 'faltante_cert';
    return 'al_dia';
  };

  const calculateNextReviewDate = (status: AuditStatus): number => {
    const now = new Date();
    switch (status) {
      case 'problema': return addDays(now, 7).getTime();
      case 'desvio': return addDays(now, 15).getTime();
      case 'arreglado': return addDays(now, 21).getTime();
      case 'ok': return addDays(now, 30).getTime();
      default: return addDays(now, 30).getTime();
    }
  };

  const handleStartAudit = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    const lastAudit = getRecipeAudits(recipe.id)[0];
    const mpStatus = checkMPStatus(recipe);
    const initialStatus: AuditStatus = lastAudit?.status || 'ok';
    
    setAuditForm({
      status: initialStatus,
      notes: '',
      isUpdated: true,
      rnpaStatus: recipe.type === 'final' ? 'al_dia' : 'no_aplica',
      mpStatus: mpStatus,
      procedureStatus: 'ok',
      improvements: '',
      deviations: '',
      findings: '',
      systemCount: recipe.stock || 0,
      physicalCount: recipe.stock || 0,
      adjustmentReason: '',
      nextReviewDate: calculateNextReviewDate(initialStatus)
    });
    setIsAuditModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedRecipe) return;

    const status = auditForm.status as AuditStatus;
    const suggestedNextDate = calculateNextReviewDate(status);

    const newAudit: RecipeAudit = {
      id: `audit_${Date.now()}`,
      recipeId: selectedRecipe.id,
      recipeName: selectedRecipe.name,
      recipeType: selectedRecipe.type,
      date: Date.now(),
      auditorId: userId,
      status: status,
      notes: auditForm.notes || '',
      isUpdated: auditForm.isUpdated || false,
      rnpaStatus: auditForm.rnpaStatus as RNPAStatus,
      mpStatus: auditForm.mpStatus as MPStatus,
      procedureStatus: auditForm.procedureStatus as ProcedureStatus,
      improvements: auditForm.improvements,
      deviations: auditForm.deviations,
      findings: auditForm.findings,
      nextReviewDate: auditForm.nextReviewDate || suggestedNextDate,
      systemCount: auditForm.systemCount,
      physicalCount: auditForm.physicalCount,
      adjustmentReason: auditForm.adjustmentReason
    };

    if (auditForm.physicalCount !== undefined && auditForm.physicalCount !== (selectedRecipe.stock || 0)) {
      if (onUpdateRecipe) {
        await onUpdateRecipe({
          ...selectedRecipe,
          stock: auditForm.physicalCount
        });
      }
    }

    await onSaveAudit(newAudit);
    setIsAuditModalOpen(false);
    setSelectedRecipe(null);
  };

  const getStatusColor = (status: AuditStatus) => {
    switch (status) {
      case 'ok': return 'text-emerald-400';
      case 'desvio': return 'text-amber-400';
      case 'arreglado': return 'text-blue-400';
      case 'problema': return 'text-rose-400';
      default: return 'text-white/40';
    }
  };

  const getStatusBadge = (status: AuditStatus) => {
    const colors = {
      ok: 'bg-emerald-500/20 text-emerald-400',
      desvio: 'bg-amber-500/20 text-amber-400',
      arreglado: 'bg-blue-500/20 text-blue-400',
      problema: 'bg-rose-500/20 text-rose-400'
    };
    return (
      <span className={`text-[10px] font-bold uppercase tracking-tighter px-2 py-0.5 rounded-full ${colors[status]}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[var(--accent)]/20 rounded-2xl flex items-center justify-center text-[var(--accent)]">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-light italic text-white/90">Conteo Cíclico</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/40">Gestión de Auditoría y Calidad</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setIsRefreshing(true);
              setRefreshKey(prev => prev + 1);
              setTimeout(() => setIsRefreshing(false), 1000);
            }}
            className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white/40 hover:text-[var(--accent)] hover:border-[var(--accent)]/30 hover:bg-[var(--accent)]/5 transition-all"
            title="Actualizar Conteos y Urgencias"
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
          </button>

          {viewMode === 'calendar' && (
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setCalendarMode('normal')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                  calendarMode === 'normal' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white'
                }`}
              >
                Cíclico
              </button>
              <button
                onClick={() => setCalendarMode('urgency')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                  calendarMode === 'urgency' ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-white/40 hover:text-white'
                }`}
              >
                Urgencia
              </button>
            </div>
          )}

          <div className="h-8 w-px bg-white/10 mx-1" />
          
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setSortBy('urgency')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                sortBy === 'urgency' ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-white/40 hover:text-white'
              }`}
            >
              Urgencia
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                sortBy === 'name' ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-white/40 hover:text-white'
              }`}
            >
              Nombre
            </button>
          </div>
          <div className="h-8 w-px bg-white/10 mx-1" />
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            {[
              { id: 'grid', label: 'Recetas', icon: LayoutGrid },
              { id: 'calendar', label: 'Calendario', icon: CalendarDays },
              { id: 'report', label: 'Reporte', icon: BarChart3 },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id as any)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  viewMode === mode.id ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-white/40 hover:text-white'
                }`}
              >
                <mode.icon size={14} /> {mode.label}
              </button>
            ))}
          </div>
          <div className="h-8 w-px bg-white/10 mx-2" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[var(--accent)]/50 transition-colors w-48 md:w-64"
            />
          </div>
        </div>
      </div>

      {viewMode === 'grid' && (
        <>
          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all border ${
                selectedCategory === 'all' 
                  ? 'bg-white text-black border-white' 
                  : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'
              }`}
            >
              Todos
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all border flex items-center gap-2 ${
                  selectedCategory === cat.id 
                    ? `${cat.color} text-white border-transparent` 
                    : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${cat.color}`} />
                {cat.label}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRecipes.map(recipe => {
              const lastAudit = getRecipeAudits(recipe.id)[0];
              const mpStatus = checkMPStatus(recipe);
              const isOverdue = lastAudit?.nextReviewDate && isPast(lastAudit.nextReviewDate);
              
              return (
                <motion.div
                  key={recipe.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white/5 border rounded-[2rem] p-6 hover:border-[var(--accent)]/40 transition-all group relative overflow-hidden flex flex-col ${
                    recipe.priority === 'alta' ? 'border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.1)]' :
                    isOverdue ? 'border-rose-500/30' : 'border-white/10'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] uppercase tracking-[0.2em] font-black px-2 py-0.5 rounded-full bg-white/5 text-white/60 border border-white/10`}>
                          {recipe.category?.replace('_', ' ') || 'Sin clasificar'}
                        </span>
                        {isOverdue && (
                          <span className="text-[8px] uppercase tracking-[0.2em] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                            <Clock size={8} /> Vencido
                          </span>
                        )}
                        {recipe.priority === 'alta' && (
                          <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                        )}
                      </div>
                      <h3 className="text-base font-medium text-white/90 line-clamp-2 group-hover:text-[var(--accent)] transition-colors min-h-[3rem]">
                        {recipe.name}
                      </h3>
                    </div>
                    <select
                      value={recipe.priority || 'baja'}
                      onChange={async (e) => {
                        if (onUpdateRecipe) {
                          await onUpdateRecipe({
                            ...recipe,
                            priority: e.target.value as 'baja' | 'media' | 'alta'
                          });
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={`text-[8px] uppercase tracking-tighter font-black px-2 py-1 rounded-md border transition-all cursor-pointer ${
                        recipe.priority === 'alta' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                        recipe.priority === 'media' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                        'bg-white/5 border-white/10 text-white/30'
                      }`}
                    >
                      <option value="baja" className="bg-[#0a0a0a]">PRIO BAJA</option>
                      <option value="media" className="bg-[#0a0a0a]">PRIO MEDIA</option>
                      <option value="alta" className="bg-[#0a0a0a]">PRIO ALTA</option>
                    </select>
                  </div>

                  <div className="space-y-4 flex-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-black/20 rounded-2xl p-3 border border-white/5">
                        <p className="text-[8px] uppercase tracking-widest font-bold text-white/20 mb-1">M. Primas</p>
                        <div className={`flex items-center gap-1 text-[10px] font-bold ${
                          mpStatus === 'al_dia' ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {mpStatus === 'al_dia' ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                          {mpStatus === 'al_dia' ? 'OK' : 'FALTANTE'}
                        </div>
                      </div>
                      <div className="bg-black/20 rounded-2xl p-3 border border-white/5">
                        <p className="text-[8px] uppercase tracking-widest font-bold text-white/20 mb-1">Estado</p>
                        <div className="flex items-center h-full">
                          {lastAudit ? getStatusBadge(lastAudit.status) : <span className="text-[10px] text-white/20">PENDIENTE</span>}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-white/30">Stock Actual</span>
                        <span className="text-white/60 font-mono font-bold">
                          {recipe.stock || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-white/30">Última Revisión</span>
                        <span className="text-white/60 font-medium">
                          {lastAudit ? format(lastAudit.date, 'dd/MM/yy', { locale: es }) : 'N/A'}
                        </span>
                      </div>
                      {lastAudit?.nextReviewDate && (
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-white/30">Próx. Revisión</span>
                          <span className={`font-bold ${isOverdue ? 'text-rose-400' : 'text-white/60'}`}>
                            {format(lastAudit.nextReviewDate, 'dd/MM/yy', { locale: es })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex gap-2">
                    <button
                      onClick={() => handleStartAudit(recipe)}
                      className="flex-1 py-3 bg-white/5 hover:bg-[var(--accent)] text-white/60 hover:text-white border border-white/10 hover:border-transparent rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 group/btn"
                    >
                      <Plus size={14} className="group-hover/btn:scale-110 transition-transform" /> Auditar
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRecipe(recipe);
                        setShowHistory(true);
                      }}
                      className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white rounded-2xl flex items-center justify-center transition-all shadow-inner"
                    >
                      <History size={16} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {viewMode === 'calendar' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-xl font-light text-white/90 italic flex items-center gap-3">
                    <CalendarDays size={24} className="text-[var(--accent)]" /> 
                    Próximas Auditorías (Desde 27/07)
                 </h3>
                 <div className="flex items-center gap-4">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
                       Frecuencia automatizada según resultados
                    </p>
                    <div className="p-2 bg-white/5 rounded-lg border border-white/10 text-[var(--accent)]">
                       <Sparkles size={16} />
                    </div>
                 </div>
              </div>

              <div className="space-y-12">
                 {Object.entries(calendarSchedule)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([dateKey, scheduledRecipes]) => {
                       const date = new Date(dateKey + 'T12:00:00'); // set mid day to avoid TZ issues
                       const isToday = isSameDay(date, new Date());
                       const isPastDate = isPast(date) && !isToday;
                       
                       return (
                          <div key={dateKey} className="relative pl-12 border-l border-white/5">
                             <div className={`absolute -left-3 top-0 w-6 h-6 rounded-full border-4 border-[#0d0d0d] shadow-xl transition-colors ${
                                isToday ? 'bg-[var(--accent)] scale-125' : isPastDate ? 'bg-rose-500/50' : 'bg-white/10'
                             }`} />
                             
                             <div className="mb-4">
                                <h4 className={`text-sm font-bold uppercase tracking-[0.2em] ${isToday ? 'text-[var(--accent)]' : 'text-white/40'}`}>
                                   {format(date, "EEEE d 'de' MMMM", { locale: es })}
                                </h4>
                                {isToday && <span className="text-[8px] font-black text-[var(--accent)] uppercase tracking-widest">Hoy</span>}
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {scheduledRecipes.map(recipe => (
                                   <div 
                                      key={recipe.id}
                                      onClick={() => handleStartAudit(recipe)}
                                      className="bg-white/[0.02] hover:bg-white/5 border border-white/5 hover:border-white/10 p-4 rounded-2xl cursor-pointer transition-all flex items-center justify-between group"
                                   >
                                      <div className="flex items-center gap-3">
                                         <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${
                                            CATEGORIES.find(c => c.id === recipe.category)?.color || 'bg-white/10'
                                         } text-white/90`}>
                                            {recipe.category?.charAt(0).toUpperCase() || '?'}
                                         </div>
                                         <div>
                                            <p className="text-xs font-medium text-white/80 group-hover:text-[var(--accent)] transition-colors line-clamp-1">{recipe.name}</p>
                                            <p className="text-[9px] text-white/20 uppercase tracking-widest">{recipe.category?.replace('_', ' ')}</p>
                                         </div>
                                      </div>
                                      <ChevronRight size={14} className="text-white/10 group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all" />
                                   </div>
                                ))}
                             </div>
                          </div>
                       );
                 })}
              </div>
           </div>
        </div>
      )}

      {viewMode === 'report' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Main Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10">
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-2">Total Productos</p>
              <h4 className="text-4xl font-light text-white">{stats.total}</h4>
            </div>
            <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10">
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-2">Auditados</p>
              <h4 className="text-4xl font-light text-emerald-400">{stats.audited}</h4>
            </div>
            <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10">
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-2">Pendientes</p>
              <h4 className="text-4xl font-light text-amber-400">{stats.pending}</h4>
            </div>
            <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 flex flex-col justify-center">
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-2">Progreso General</p>
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.percentage}%` }}
                  className="h-full bg-[var(--accent)]"
                />
              </div>
              <p className="text-right text-xs font-bold text-white/60 mt-2">{stats.percentage.toFixed(1)}%</p>
            </div>
          </div>

          {/* Category Progress */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6">
              <h3 className="text-lg font-light text-white/90 italic flex items-center gap-3">
                <PieChart size={20} className="text-[var(--accent)]" /> 
                Progreso por Sector
              </h3>
              <div className="space-y-4">
                {stats.categoryStats.map(cat => (
                  <div key={cat.id} className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold">
                      <span className="text-white/60">{cat.label}</span>
                      <span className="text-white/40">{cat.audited} / {cat.total}</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${cat.percent}%` }}
                        className={`h-full ${cat.color}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6">
              <h3 className="text-lg font-light text-white/90 italic flex items-center gap-3">
                <AlertCircle size={20} className="text-rose-400" /> 
                Hallazgos y Observaciones
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(stats.statusCounts).map(([status, count]) => (
                  <div key={status} className="bg-black/20 p-4 rounded-2xl border border-white/5">
                    <p className="text-[8px] uppercase tracking-[0.2em] font-black text-white/30 mb-1">{status.replace('_', ' ')}</p>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-light ${
                        status === 'ok' ? 'text-emerald-400' : 
                        status === 'problema' ? 'text-rose-400' : 'text-amber-400'
                      }`}>{count}</span>
                      <span className="text-[10px] text-white/20">registros</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-white/5">
                <p className="text-[10px] text-white/40 italic leading-relaxed">
                  * El sistema sugiere próximas revisiones automáticamente basándose en la gravedad de los hallazgos. 
                  Sectores con desviaciones críticas serán re-auditados en 7 días.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Modal (Refined) */}
      <AnimatePresence>
        {isAuditModalOpen && selectedRecipe && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAuditModalOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-[#0a0a0a] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-10 border-b border-white/5 flex items-center justify-between bg-gradient-to-br from-white/[0.03] to-transparent">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-[var(--accent)]/10 rounded-[1.5rem] flex items-center justify-center text-[var(--accent)] border border-[var(--accent)]/20 shadow-inner shadow-[var(--accent)]/10">
                    <ClipboardCheck size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-light text-white/90 italic">Auditoría Técnica</h2>
                    <p className="text-[10px] uppercase tracking-[0.3em] font-black text-[var(--accent)] mt-1">{selectedRecipe.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAuditModalOpen(false)}
                  className="p-3 hover:bg-white/5 rounded-full transition-colors text-white/20 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-10 overflow-y-auto space-y-10 custom-scrollbar">
                {/* Priority Selection */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/20 border-b border-white/5 pb-4 flex items-center gap-2">
                    <Flag size={14} /> Prioridad de Auditoría
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'baja', label: 'Baja', active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
                      { id: 'media', label: 'Media', active: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
                      { id: 'alta', label: 'Alta', active: 'bg-rose-500/20 text-rose-400 border-rose-500/30' }
                    ].map(prio => (
                      <button
                        key={prio.id}
                        type="button"
                        onClick={async () => {
                          if (onUpdateRecipe) {
                            const updated = { ...selectedRecipe, priority: prio.id as any };
                            setSelectedRecipe(updated);
                            await onUpdateRecipe(updated);
                          }
                        }}
                        className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                          selectedRecipe.priority === prio.id 
                            ? prio.active 
                            : 'bg-white/5 text-white/20 border-white/10 hover:border-white/20'
                        }`}
                      >
                        {prio.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest font-black text-white/30 ml-1">Estado de Auditoría</label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['ok', 'desvio', 'arreglado', 'problema'] as AuditStatus[]).map(s => (
                        <button
                          key={s}
                          onClick={() => setAuditForm({ ...auditForm, status: s })}
                          className={`py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                            auditForm.status === s 
                              ? `${getStatusColor(s).replace('text-', 'bg-').replace('-400', '-500/20')} ${getStatusColor(s)} border-white/30 shadow-lg shadow-black/40`
                              : 'bg-white/5 text-white/20 border-white/10 hover:border-white/20'
                          }`}
                        >
                          {s === 'ok' ? 'TODO OK' : s === 'desvio' ? 'DESVÍO' : s === 'arreglado' ? 'ARREGLADO' : 'PROBLEMA'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest font-black text-white/30 ml-1">Próxima Revisión (Manual)</label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={auditForm.nextReviewDate ? format(auditForm.nextReviewDate, 'yyyy-MM-dd') : ''}
                        onChange={(e) => setAuditForm({ ...auditForm, nextReviewDate: new Date(e.target.value).getTime() })}
                        className="flex-1 px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-[var(--accent)]/50 transition-colors"
                      />
                      <div className="bg-white/5 border border-white/10 rounded-[1.5rem] p-5 flex items-center justify-between flex-1">
                        <div className="flex items-center gap-3">
                          <Clock size={20} className="text-white/20" />
                          <div>
                            <p className="text-xs font-bold text-white/80">
                              Sugerido: {auditForm.status === 'problema' ? '7 días' : 
                               auditForm.status === 'desvio' ? '15 días' : 
                               auditForm.status === 'arreglado' ? '21 días' :
                               '1 mes'}
                            </p>
                            <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Autocálculo Smart</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Adjustment Section */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[var(--accent)] border-b border-[var(--accent)]/20 pb-4 flex items-center gap-2">
                    <RotateCcw size={14} /> Ajuste de Inventario (Manual)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-[var(--accent)]/[0.03] p-8 rounded-[2rem] border border-[var(--accent)]/10 shadow-inner">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <label className="text-[10px] uppercase tracking-widest font-black text-white/30 ml-1">Stock Sistema</label>
                        <div className="px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white/60 font-mono flex items-center justify-center">
                          {auditForm.systemCount}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] uppercase tracking-widest font-black text-[var(--accent)] ml-1">Stock Físico</label>
                        <input
                          type="number"
                          value={auditForm.physicalCount}
                          onChange={(e) => setAuditForm({ ...auditForm, physicalCount: parseFloat(e.target.value) || 0 })}
                          className="w-full px-5 py-4 bg-white/10 border border-[var(--accent)]/30 rounded-2xl text-sm text-white font-mono text-center focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-widest font-black text-white/30 ml-1">Motivo del Ajuste (Obligatorio si cambia)</label>
                      <textarea
                        value={auditForm.adjustmentReason}
                        onChange={(e) => setAuditForm({ ...auditForm, adjustmentReason: e.target.value })}
                        required={auditForm.physicalCount !== auditForm.systemCount}
                        placeholder="Explicar por qué se cambia el conteo..."
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:border-[var(--accent)]/50 transition-colors min-h-[58px] resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Checklist Section */}
                <div className="space-y-4">
                   <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/20 border-b border-white/5 pb-4">Checklist de Calidad</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {/* MP Status */}
                     <div className="space-y-3">
                        <label className="text-[10px] uppercase tracking-widest font-black text-white/30 ml-1">Materias Primas (Fichas/Cert)</label>
                        <select
                          value={auditForm.mpStatus}
                          onChange={(e) => setAuditForm({ ...auditForm, mpStatus: e.target.value as any })}
                          className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:border-[var(--accent)]/50 transition-colors"
                        >
                          <option value="al_dia">Al día / En sistema</option>
                          <option value="faltante_ficha">Faltante Ficha Técnica</option>
                          <option value="faltante_cert">Faltante Certificado</option>
                          <option value="no_aplica">No aplica</option>
                        </select>
                     </div>
                     {/* RNPA Status */}
                     <div className="space-y-3">
                        <label className="text-[10px] uppercase tracking-widest font-black text-white/30 ml-1">Estado RNPA</label>
                        <select
                          value={auditForm.rnpaStatus}
                          disabled={selectedRecipe.type !== 'final'}
                          onChange={(e) => setAuditForm({ ...auditForm, rnpaStatus: e.target.value as any })}
                          className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:border-[var(--accent)]/50 transition-colors disabled:opacity-50"
                        >
                          <option value="al_dia">Tiene / Al día</option>
                          <option value="vencido">Vencido</option>
                          <option value="pendiente">Pendiente Registro</option>
                          <option value="no_aplica">No aplica</option>
                        </select>
                     </div>
                     {/* Procedure Status */}
                     <div className="space-y-3">
                        <label className="text-[10px] uppercase tracking-widest font-black text-white/30 ml-1">Procedimiento de Elaboración</label>
                        <select
                          value={auditForm.procedureStatus}
                          onChange={(e) => setAuditForm({ ...auditForm, procedureStatus: e.target.value as any })}
                          className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:border-[var(--accent)]/50 transition-colors"
                        >
                          <option value="ok">Cumplimiento Total (Siguen Hoja)</option>
                          <option value="siguen_hoja">Cumplimiento Parcial</option>
                          <option value="modificar">Se debe Modificar Procedimiento</option>
                          <option value="faltante">Falta documentación en sector</option>
                        </select>
                     </div>
                     {/* Updated Toggle */}
                     <div className="space-y-3">
                        <label className="text-[10px] uppercase tracking-widest font-black text-white/30 ml-1">Estado en Sistema</label>
                        <div 
                          onClick={() => setAuditForm({ ...auditForm, isUpdated: !auditForm.isUpdated })}
                          className={`flex items-center justify-between h-[58px] px-5 rounded-2xl border transition-all cursor-pointer ${
                            auditForm.isUpdated ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10'
                          }`}
                        >
                          <span className={`text-xs font-bold ${auditForm.isUpdated ? 'text-emerald-400' : 'text-white/40'}`}>
                            Receta 100% Actualizada
                          </span>
                          <div className={`w-10 h-6 rounded-full p-1 transition-colors ${auditForm.isUpdated ? 'bg-emerald-500' : 'bg-white/10'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${auditForm.isUpdated ? 'translate-x-4' : 'translate-x-0'}`} />
                          </div>
                        </div>
                     </div>
                   </div>
                </div>

                {/* Detail TextAreas */}
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest font-black text-white/30 ml-1">Desvíos Detectados</label>
                    <textarea
                      value={auditForm.deviations}
                      onChange={(e) => setAuditForm({ ...auditForm, deviations: e.target.value })}
                      placeholder="Detalle cualquier diferencia entre la teoría del sistema y la realidad de planta..."
                      className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-[1.5rem] text-sm focus:outline-none focus:border-[var(--accent)]/50 transition-colors min-h-[120px] resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-widest font-black text-white/30 ml-1 text-emerald-400/60">Mejoras Probables / I+D</label>
                      <textarea
                        value={auditForm.improvements}
                        onChange={(e) => setAuditForm({ ...auditForm, improvements: e.target.value })}
                        placeholder="Oportunidades de optimización..."
                        className="w-full px-5 py-4 bg-emerald-500/[0.02] border border-white/10 rounded-[1.5rem] text-sm focus:outline-none focus:border-emerald-500/30 transition-colors min-h-[100px] resize-none"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-widest font-black text-white/30 ml-1">Observaciones Generales</label>
                      <textarea
                        value={auditForm.notes}
                        onChange={(e) => setAuditForm({ ...auditForm, notes: e.target.value })}
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-[1.5rem] text-sm focus:outline-none focus:border-[var(--accent)]/50 transition-colors min-h-[100px] resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-10 border-t border-white/5 bg-white/[0.01] flex gap-4">
                <button
                  onClick={() => setIsAuditModalOpen(false)}
                  className="flex-1 py-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="flex-[2] py-5 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-[var(--accent)]/20 flex items-center justify-center gap-3 group/save"
                >
                  <Save size={18} className="group-hover/save:scale-110 transition-transform" /> Finalizar Auditoría
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && selectedRecipe && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-[#0d0d0d] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-10 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-light text-white/90 italic flex items-center gap-3">
                    <History size={20} className="text-[var(--accent)]" /> 
                    Historial de Revisiones
                  </h2>
                  <p className="text-[10px] uppercase tracking-[0.2em] font-black text-white/40 mt-1">{selectedRecipe.name}</p>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-3 hover:bg-white/5 rounded-full transition-colors text-white/20 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-10 overflow-y-auto space-y-6 custom-scrollbar">
                {getRecipeAudits(selectedRecipe.id).length > 0 ? (
                  getRecipeAudits(selectedRecipe.id).map(audit => (
                    <div key={audit.id} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${
                            audit.status === 'ok' ? 'bg-emerald-500/20 text-emerald-400' : 
                            audit.status === 'problema' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {audit.status === 'ok' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white/90 capitalize tracking-wide">{audit.status.replace('_', ' ')}</p>
                            <p className="text-[10px] text-white/30 font-medium">{format(audit.date, 'PPPP', { locale: es })}</p>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border ${
                            audit.isUpdated ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : 'text-rose-400 border-rose-500/20 bg-rose-500/5'
                          }`}>
                            {audit.isUpdated ? 'SISTEMA AL DÍA' : 'DESACTUALIZADA'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                          <p className="text-[7px] uppercase tracking-widest font-black text-white/20 mb-1">RNPA</p>
                          <p className="text-[10px] text-white/70 font-bold capitalize">{audit.rnpaStatus.replace('_', ' ')}</p>
                        </div>
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                          <p className="text-[7px] uppercase tracking-widest font-black text-white/20 mb-1">M. Primas</p>
                          <p className="text-[10px] text-white/70 font-bold capitalize">{audit.mpStatus.replace('_', ' ')}</p>
                        </div>
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                          <p className="text-[7px] uppercase tracking-widest font-black text-white/20 mb-1">Procedimiento</p>
                          <p className="text-[10px] text-white/70 font-bold capitalize">{audit.procedureStatus?.replace('_', ' ') || 'N/A'}</p>
                        </div>
                        {audit.physicalCount !== undefined && (
                          <div className="bg-[var(--accent)]/10 p-3 rounded-xl border border-[var(--accent)]/20">
                            <p className="text-[7px] uppercase tracking-widest font-black text-[var(--accent)] mb-1">Ajuste Stock</p>
                            <p className="text-[10px] text-white font-mono font-bold">
                              {audit.systemCount} → {audit.physicalCount}
                            </p>
                          </div>
                        )}
                      </div>

                      {(audit.deviations || audit.findings || audit.improvements || audit.notes || audit.adjustmentReason) && (
                        <div className="space-y-4 pt-4 border-t border-white/5">
                          {audit.adjustmentReason && (
                            <div className="bg-white/5 p-4 rounded-xl border-l-2 border-[var(--accent)]">
                              <p className="text-[8px] uppercase tracking-widest font-black text-[var(--accent)] mb-1">Motivo de Ajuste Manual</p>
                              <p className="text-xs text-white/80 italic font-medium">{audit.adjustmentReason}</p>
                            </div>
                          )}
                          {audit.deviations && (
                            <div>
                              <p className="text-[8px] uppercase tracking-widest font-black text-rose-400/60 mb-1">Desvíos Detectados</p>
                              <p className="text-xs text-white/60 leading-relaxed font-light">{audit.deviations}</p>
                            </div>
                          )}
                          {audit.improvements && (
                            <div>
                              <p className="text-[8px] uppercase tracking-widest font-black text-emerald-400/60 mb-1">Mejoras Propuestas</p>
                              <p className="text-xs text-white/60 leading-relaxed font-light">{audit.improvements}</p>
                            </div>
                          )}
                          {audit.notes && (
                            <div>
                              <p className="text-[8px] uppercase tracking-widest font-black text-white/20 mb-1">Observaciones</p>
                              <p className="text-xs text-white/40 leading-relaxed font-light italic">{audit.notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-24 text-center space-y-4">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-white/10 mx-auto">
                      <History size={32} />
                    </div>
                    <p className="text-white/20 italic font-light">No hay registros históricos para esta receta.</p>
                  </div>
                )}
              </div>

              <div className="p-10 border-t border-white/5 bg-white/[0.01]">
                <button
                  onClick={() => setShowHistory(false)}
                  className="w-full py-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all"
                >
                  Cerrar Historial
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
