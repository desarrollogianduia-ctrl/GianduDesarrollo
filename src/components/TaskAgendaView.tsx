import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  List,
  Check,
  Plus,
  Play,
  Pause,
  Clock,
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Filter,
  Flame,
  ArrowRight,
  TrendingDown,
  Sparkles,
  User,
  Coffee,
  Wrench,
  Package,
  MessageSquare,
  RotateCcw,
  HelpCircle,
  CheckCircle2,
  ThumbsUp,
  History,
  PenTool,
  Bookmark
} from 'lucide-react';
import { DevelopmentProject, ProjectTask, TaskStatus, TimeLossReason, TaskTimeCut, AssignmentArea } from '../types';

interface TaskAgendaViewProps {
  developments: DevelopmentProject[];
  userId: string;
  onUpdateDevelopment: (dev: DevelopmentProject) => Promise<void>;
  onNavigateToProject?: (devId: string) => void;
  onClose?: () => void;
}

interface EnrichedTask extends ProjectTask {
  projectId: string;
  projectName: string;
  projectCode: string;
  projectPriority: string;
  projectArea: string;
}

export const REASON_CONFIG: Record<TimeLossReason, { label: string; icon: any; color: string; badgeBg: string }> = {
  espera_insumo: { label: 'Falta / Espera de Insumo', icon: Package, color: 'text-amber-600', badgeBg: 'bg-amber-100 border-amber-300 text-amber-800' },
  equipo_ocupado: { label: 'Máquina / Equipo Ocupado', icon: Wrench, color: 'text-purple-600', badgeBg: 'bg-purple-100 border-purple-300 text-purple-800' },
  consulta_aprobacion: { label: 'Espera de Aprobación', icon: MessageSquare, color: 'text-blue-600', badgeBg: 'bg-blue-100 border-blue-300 text-blue-800' },
  reunion_imprevista: { label: 'Reunión Imprevista', icon: Coffee, color: 'text-pink-600', badgeBg: 'bg-pink-100 border-pink-300 text-pink-800' },
  urgencia_produccion: { label: 'Urgencia en Planta', icon: AlertTriangle, color: 'text-rose-600', badgeBg: 'bg-rose-100 border-rose-300 text-rose-800' },
  corte_operativo: { label: 'Pausa Operativa', icon: RotateCcw, color: 'text-emerald-600', badgeBg: 'bg-emerald-100 border-emerald-300 text-emerald-800' },
  otro: { label: 'Otra Interrupción', icon: HelpCircle, color: 'text-gray-600', badgeBg: 'bg-gray-100 border-gray-300 text-gray-800' },
};

export const TaskAgendaView: React.FC<TaskAgendaViewProps> = ({
  developments,
  userId,
  onUpdateDevelopment,
  onNavigateToProject,
  onClose
}) => {
  // Mode: Display Agenda (Default) vs Display Lista
  const [displayMode, setDisplayMode] = useState<'agenda' | 'lista'>('agenda');

  // Agenda Mode: 'todas' (Default: todas las tareas en una hoja continua) vs 'paginada' (carillas para girar)
  const [sheetMode, setSheetMode] = useState<'todas' | 'paginada'>('todas');
  
  // Page number for the notebook agenda (tasks per page = 8 when paginated)
  const [currentPage, setCurrentPage] = useState(0);
  const [pageDirection, setPageDirection] = useState<'next' | 'prev'>('next');
  const TASKS_PER_PAGE = 8;

  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState<string>('todos');
  const [selectedArea, setSelectedArea] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendientes' | 'en_curso' | 'pausados' | 'finalizados'>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Cuts / Pause Modal State
  const [activePauseTaskId, setActivePauseTaskId] = useState<{ devId: string; taskId: string } | null>(null);
  const [pauseReason, setPauseReason] = useState<TimeLossReason>('espera_insumo');
  const [pauseNote, setPauseNote] = useState('');
  const [pauseDurationEst, setPauseDurationEst] = useState<number>(15);

  // View Cuts History Modal
  const [viewingCutsTask, setViewingCutsTask] = useState<EnrichedTask | null>(null);

  // Quick New Task input on the agenda sheet (Inking in pen)
  const [newText, setNewText] = useState('');
  const [targetDevId, setTargetDevId] = useState<string>('');
  const [newArea, setNewArea] = useState<AssignmentArea | ''>('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [isAddingInking, setIsAddingInking] = useState(false);
  const [inkFlourishTaskId, setInkFlourishTaskId] = useState<string | null>(null);

  // Active projects
  const activeDevs = useMemo(() => {
    return developments.filter(d => d.status !== 'archivado');
  }, [developments]);

  // Set default target project if none selected
  React.useEffect(() => {
    if (!targetDevId && activeDevs.length > 0) {
      setTargetDevId(activeDevs[0].id);
    }
  }, [activeDevs, targetDevId]);

  // Flatten and enrich all tasks
  const allTasks: EnrichedTask[] = useMemo(() => {
    return activeDevs.flatMap(dev => {
      return (dev.tasks || []).map(task => ({
        ...task,
        projectId: dev.id,
        projectName: dev.productName,
        projectCode: `${dev.trialLetter}${dev.sequenceNumber.toString().padStart(3, '0')}`,
        projectPriority: dev.priority,
        projectArea: dev.area,
        status: (task.status as TaskStatus) || (task.completed ? 'finalizado' : 'pendiente')
      }));
    });
  }, [activeDevs]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return allTasks.filter(t => {
      if (selectedProjectId !== 'todos' && t.projectId !== selectedProjectId) return false;
      if (selectedArea !== 'todos' && t.area !== selectedArea) return false;
      
      if (statusFilter === 'pendientes') {
        if (t.completed || t.status === 'finalizado') return false;
      } else if (statusFilter === 'en_curso') {
        if (t.status !== 'en_curso') return false;
      } else if (statusFilter === 'pausados') {
        if (t.status !== 'pausado') return false;
      } else if (statusFilter === 'finalizados') {
        if (!t.completed && t.status !== 'finalizado') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesText = t.text.toLowerCase().includes(q);
        const matchesProj = t.projectName.toLowerCase().includes(q);
        const matchesResp = (t.assignee || '').toLowerCase().includes(q);
        return matchesText || matchesProj || matchesResp;
      }

      return true;
    }).sort((a, b) => {
      // Prioritize active running tasks first
      if (a.status === 'en_curso' && b.status !== 'en_curso') return -1;
      if (b.status === 'en_curso' && a.status !== 'en_curso') return 1;

      // Paused next
      if (a.status === 'pausado' && b.status !== 'pausado') return -1;
      if (b.status === 'pausado' && a.status !== 'pausado') return 1;

      // Pending before completed
      if (a.completed !== b.completed) return a.completed ? 1 : -1;

      // Priority
      const pScore: Record<string, number> = { alta: 3, media: 2, baja: 1 };
      const scoreA = pScore[a.projectPriority] || 0;
      const scoreB = pScore[b.projectPriority] || 0;
      if (scoreA !== scoreB) return scoreB - scoreA;

      return b.createdAt - a.createdAt;
    });
  }, [allTasks, selectedProjectId, selectedArea, statusFilter, searchQuery]);

  // Pagination for the agenda notebook
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / TASKS_PER_PAGE));
  const validPage = Math.min(currentPage, totalPages - 1);
  const currentSheetTasks = useMemo(() => {
    if (sheetMode === 'todas') {
      return filteredTasks; // Default: Todas las tareas en una hoja continua
    }
    const start = validPage * TASKS_PER_PAGE;
    return filteredTasks.slice(start, start + TASKS_PER_PAGE);
  }, [filteredTasks, validPage, sheetMode]);

  // Page turning handlers
  const handleTurnNextPage = () => {
    if (validPage < totalPages - 1) {
      setPageDirection('next');
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleTurnPrevPage = () => {
    if (validPage > 0) {
      setPageDirection('prev');
      setCurrentPage(prev => prev - 1);
    }
  };

  // Overall Time Loss & Efficiency Analysis ("¿En qué se pierde tiempo? ¿En qué no?")
  const timeMetrics = useMemo(() => {
    let totalWork = 0;
    let totalLost = 0;
    let totalCutsCount = 0;
    let totalTasksCompleted = 0;
    let zeroCutTasks = 0;

    const reasonBreakdown: Record<TimeLossReason, { minutes: number; count: number }> = {
      espera_insumo: { minutes: 0, count: 0 },
      equipo_ocupado: { minutes: 0, count: 0 },
      consulta_aprobacion: { minutes: 0, count: 0 },
      reunion_imprevista: { minutes: 0, count: 0 },
      urgencia_produccion: { minutes: 0, count: 0 },
      corte_operativo: { minutes: 0, count: 0 },
      otro: { minutes: 0, count: 0 }
    };

    allTasks.forEach(t => {
      if (t.completed || t.status === 'finalizado') totalTasksCompleted++;

      // Compute work duration from startTime & endTime if available
      let computedWork = t.totalWorkMinutes || 0;
      if (!computedWork && t.startTime && t.endTime) {
        const [sh, sm] = t.startTime.split(':').map(Number);
        const [eh, em] = t.endTime.split(':').map(Number);
        if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
          const diff = (eh * 60 + em) - (sh * 60 + sm);
          if (diff > 0) computedWork = diff;
        }
      }
      totalWork += computedWork;

      let taskCutsLost = t.totalLostMinutes || 0;
      if (t.timeCuts && t.timeCuts.length > 0) {
        totalCutsCount += t.timeCuts.length;
        t.timeCuts.forEach(cut => {
          const duration = cut.durationMinutes || 15;
          if (cut.reason && reasonBreakdown[cut.reason]) {
            reasonBreakdown[cut.reason].minutes += duration;
            reasonBreakdown[cut.reason].count += 1;
          }
        });
      } else {
        zeroCutTasks++;
      }
      totalLost += taskCutsLost;
    });

    const grandTotal = totalWork + totalLost;
    const efficiency = grandTotal > 0 ? Math.round((totalWork / grandTotal) * 100) : 100;

    // Sort reasons by lost time descending
    const sortedReasons = Object.entries(reasonBreakdown)
      .map(([key, data]) => ({ reason: key as TimeLossReason, minutes: data.minutes, count: data.count }))
      .filter(item => item.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes);

    // Identify reasons with 0 minutes (where NO time is lost)
    const zeroReasons = Object.entries(reasonBreakdown)
      .map(([key, data]) => ({ reason: key as TimeLossReason, minutes: data.minutes }))
      .filter(item => item.minutes === 0)
      .map(item => item.reason);

    return {
      totalWorkMinutes: totalWork,
      totalLostMinutes: totalLost,
      totalCutsCount,
      totalTasksCompleted,
      zeroCutTasks,
      efficiency,
      sortedReasons,
      zeroReasons
    };
  }, [allTasks]);

  // Helper to update a task in a development project
  const updateTask = async (devId: string, taskId: string, modifier: (task: ProjectTask) => ProjectTask) => {
    const dev = developments.find(d => d.id === devId);
    if (!dev) return;

    const updatedTasks = (dev.tasks || []).map(t => {
      if (t.id === taskId) {
        return modifier(t);
      }
      return t;
    });

    await onUpdateDevelopment({
      ...dev,
      tasks: updatedTasks,
      updatedAt: Date.now()
    });
  };

  // Toggle Complete / Strike-through in ink ("voy tachando")
  const handleToggleTask = async (task: EnrichedTask) => {
    const willBeCompleted = !task.completed && task.status !== 'finalizado';
    const nowTime = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    await updateTask(task.projectId, task.id, (t) => {
      return {
        ...t,
        completed: willBeCompleted,
        status: willBeCompleted ? 'finalizado' : 'pendiente',
        completedAt: willBeCompleted ? Date.now() : undefined,
        endTime: willBeCompleted ? (t.endTime || nowTime) : t.endTime
      };
    });
  };

  // Start Task ('en_curso')
  const handleStartTask = async (task: EnrichedTask) => {
    const nowTime = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    await updateTask(task.projectId, task.id, (t) => ({
      ...t,
      status: 'en_curso',
      startedAt: t.startedAt || Date.now(),
      startTime: t.startTime || nowTime,
      completed: false
    }));
  };

  // Finish Task ('finalizado')
  const handleFinishTask = async (task: EnrichedTask) => {
    const nowTime = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    await updateTask(task.projectId, task.id, (t) => ({
      ...t,
      status: 'finalizado',
      completed: true,
      completedAt: Date.now(),
      endTime: t.endTime || nowTime
    }));
  };

  // Confirm Pause / Interruption Cut (si se fue cortando varias veces)
  const handleConfirmPause = async () => {
    if (!activePauseTaskId) return;
    const { devId, taskId } = activePauseTaskId;
    
    await updateTask(devId, taskId, (t) => {
      const addedLost = Number(pauseDurationEst) || 15;
      const newCut: TaskTimeCut = {
        id: `cut_${Date.now()}`,
        pausedAt: Date.now(),
        durationMinutes: addedLost,
        reason: pauseReason,
        note: pauseNote.trim() || undefined
      };

      const existingCuts = t.timeCuts || [];
      const updatedCuts = [...existingCuts, newCut];

      return {
        ...t,
        status: 'pausado',
        timeCuts: updatedCuts,
        totalLostMinutes: (t.totalLostMinutes || 0) + addedLost,
        timeLossCategory: pauseReason,
        timeLossNote: pauseNote.trim() || t.timeLossNote
      };
    });

    setActivePauseTaskId(null);
    setPauseNote('');
    setPauseDurationEst(15);
  };

  // Resume Task from Pause
  const handleResumeTask = async (task: EnrichedTask) => {
    await updateTask(task.projectId, task.id, (t) => ({
      ...t,
      status: 'en_curso'
    }));
  };

  // Direct Time Change (Hora de inicio y fin)
  const handleTimeChange = async (task: EnrichedTask, field: 'startTime' | 'endTime', value: string) => {
    await updateTask(task.projectId, task.id, (t) => ({
      ...t,
      [field]: value
    }));
  };

  // Delete a cut from history
  const handleDeleteCut = async (task: EnrichedTask, cutId: string) => {
    await updateTask(task.projectId, task.id, (t) => {
      const remainingCuts = (t.timeCuts || []).filter(c => c.id !== cutId);
      const remainingLost = remainingCuts.reduce((acc, c) => acc + (c.durationMinutes || 0), 0);
      return {
        ...t,
        timeCuts: remainingCuts,
        totalLostMinutes: remainingLost
      };
    });

    if (viewingCutsTask && viewingCutsTask.id === task.id) {
      setViewingCutsTask({
        ...viewingCutsTask,
        timeCuts: (viewingCutsTask.timeCuts || []).filter(c => c.id !== cutId)
      });
    }
  };

  // Add Task directly on the paper ("se van escribiendo cosas en tinta")
  const handleAddDirectTask = async () => {
    if (!newText.trim() || !targetDevId) return;

    setIsAddingInking(true);
    const targetDev = developments.find(d => d.id === targetDevId);
    if (!targetDev) {
      setIsAddingInking(false);
      return;
    }

    const newTaskId = `task_${Date.now()}`;
    const newTask: ProjectTask = {
      id: newTaskId,
      text: newText.trim(),
      completed: false,
      createdAt: Date.now(),
      status: 'pendiente',
      area: newArea || undefined,
      assignee: newAssignee.trim() || undefined,
      startTime: newStartTime || undefined,
      endTime: newEndTime || undefined,
      timeCuts: [],
      totalWorkMinutes: 0,
      totalLostMinutes: 0
    };

    const updatedTasks = [...(targetDev.tasks || []), newTask];
    await onUpdateDevelopment({
      ...targetDev,
      tasks: updatedTasks,
      updatedAt: Date.now()
    });

    setInkFlourishTaskId(newTaskId);

    // Reset inputs with inking flourish
    setTimeout(() => {
      setNewText('');
      setNewStartTime('');
      setNewEndTime('');
      setNewAssignee('');
      setNewArea('');
      setIsAddingInking(false);
    }, 400);

    setTimeout(() => {
      setInkFlourishTaskId(null);
    }, 2000);
  };

  // Format minutes into clean human duration
  const formatMins = (mins?: number) => {
    if (!mins || mins <= 0) return '0 min';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // Today formatted in Spanish
  const todayFormatted = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  return (
    <div className="flex flex-col h-full space-y-6 select-text">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & VIEW MODE SWITCHER                                         */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[var(--surface)] border border-white/10 p-5 rounded-3xl shadow-xl shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10 shrink-0">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[2px] text-amber-400">
                Bitácora de Laboratorio
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                Gestión de Tareas y Tiempos
              </span>
            </div>
            <h2 className="text-2xl font-serif italic text-white flex items-center gap-3">
              Agenda Diaria de Pendientes
              <span className="text-xs font-mono font-normal not-italic px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60">
                {filteredTasks.length} pendientes
              </span>
            </h2>
          </div>
        </div>

        {/* Display Switcher: Display Agenda (Default) vs Display Lista */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
          <div className="bg-black/50 p-1.5 rounded-2xl border border-white/10 flex items-center gap-1.5 shadow-inner">
            <button
              onClick={() => setDisplayMode('agenda')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                displayMode === 'agenda'
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30 font-bold scale-[1.02]'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <BookOpen size={16} />
              <span>Display Agenda</span>
            </button>
            <button
              onClick={() => setDisplayMode('lista')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                displayMode === 'lista'
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30 font-bold scale-[1.02]'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <List size={16} />
              <span>Display Lista</span>
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all"
              title="Volver"
            >
              <ChevronLeft size={20} />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ANALYTICS: "¿EN QUÉ SE PIERDE TIEMPO? ¿EN QUÉ NO?"                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        {/* Card 1: Tiempo Activo */}
        <div className="bg-[var(--surface)] border border-white/5 p-5 rounded-3xl flex items-center gap-4 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Clock size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] uppercase font-bold text-white/40 tracking-[2px]">Tiempo Activo</p>
            <p className="text-2xl font-bold font-mono text-emerald-400 truncate">{formatMins(timeMetrics.totalWorkMinutes)}</p>
            <p className="text-[10px] text-white/30 truncate">{timeMetrics.totalTasksCompleted} tareas completadas</p>
          </div>
        </div>

        {/* Card 2: Tiempo Perdido por Interrupciones */}
        <div className="bg-[var(--surface)] border border-white/5 p-5 rounded-3xl flex items-center gap-4 relative overflow-hidden group hover:border-rose-500/30 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <TrendingDown size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] uppercase font-bold text-white/40 tracking-[2px]">Tiempo Perdido</p>
            <p className="text-2xl font-bold font-mono text-rose-400 truncate">{formatMins(timeMetrics.totalLostMinutes)}</p>
            <p className="text-[10px] text-rose-400/70 font-semibold truncate">
              {timeMetrics.totalCutsCount} {timeMetrics.totalCutsCount === 1 ? 'corte registrado' : 'cortes registrados'}
            </p>
          </div>
        </div>

        {/* Card 3: Eficiencia Neta */}
        <div className="bg-[var(--surface)] border border-white/5 p-5 rounded-3xl flex items-center gap-4 relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Flame size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] uppercase font-bold text-white/40 tracking-[2px]">Foco Productivo</p>
            <p className="text-2xl font-bold font-mono text-amber-400 truncate">{timeMetrics.efficiency}%</p>
            <p className="text-[10px] text-white/30 truncate">{timeMetrics.zeroCutTasks} tareas sin cortes</p>
          </div>
        </div>

        {/* Card 4: ¿En qué se pierde tiempo? ¿En qué no? */}
        <div className="bg-[var(--surface)] border border-white/5 p-4 rounded-3xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-1 border-b border-white/5">
            <p className="text-[9px] uppercase font-bold text-white/40 tracking-[2px] flex items-center gap-1.5">
              <AlertTriangle size={12} className="text-amber-400" />
              ¿En qué se pierde tiempo?
            </p>
            <span className="text-[8px] font-mono text-white/30 uppercase">Demoras</span>
          </div>

          <div className="space-y-1.5 my-1.5">
            {timeMetrics.sortedReasons.length > 0 ? (
              timeMetrics.sortedReasons.slice(0, 2).map((r, i) => {
                const itemConfig = REASON_CONFIG[r.reason] || REASON_CONFIG.otro;
                const percent = timeMetrics.totalLostMinutes > 0
                  ? Math.round((r.minutes / timeMetrics.totalLostMinutes) * 100)
                  : 0;
                return (
                  <div key={i} className="flex items-center justify-between text-xs gap-2">
                    <span className="text-white/70 truncate text-[10px] font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                      {itemConfig.label}
                    </span>
                    <span className="font-mono text-rose-400 font-bold text-[10px] shrink-0">
                      {r.minutes}m ({percent}%)
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <ThumbsUp size={11} /> ¡Cero demoras registradas!
              </p>
            )}
          </div>

          <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[9px] text-white/40">
            <span className="text-emerald-400/80 font-semibold flex items-center gap-1">
              <CheckCircle2 size={10} /> En qué NO:
            </span>
            <span className="truncate max-w-[150px] italic">
              {timeMetrics.zeroReasons.length > 0
                ? `${REASON_CONFIG[timeMetrics.zeroReasons[0]]?.label || 'Sin cortes'}`
                : 'Todas las áreas registraron pausas'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FILTERS & SEARCH                                                       */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center gap-3 bg-[var(--surface)] border border-white/5 p-4 rounded-2xl shrink-0">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Buscar pendiente, proyecto o responsable..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-amber-400/50"
          />
        </div>

        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="bg-[#181818] border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 outline-none focus:border-amber-400/50 cursor-pointer"
        >
          <option value="todos">Todos los Proyectos ({activeDevs.length})</option>
          {activeDevs.map(d => (
            <option key={d.id} value={d.id}>
              {d.productName} ({d.trialLetter}{d.sequenceNumber.toString().padStart(3, '0')})
            </option>
          ))}
        </select>

        <select
          value={selectedArea}
          onChange={(e) => setSelectedArea(e.target.value)}
          className="bg-[#181818] border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 outline-none focus:border-amber-400/50 cursor-pointer"
        >
          <option value="todos">Todas las Áreas</option>
          <option value="desarrollo">Desarrollo</option>
          <option value="produccion">Producción</option>
          <option value="compras">Compras</option>
          <option value="sistema">Sistema</option>
          <option value="pcp">PCP</option>
          <option value="mantenimiento">Mantenimiento</option>
          <option value="logistica">Logística</option>
        </select>

        <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/5">
          {(['todos', 'pendientes', 'en_curso', 'pausados', 'finalizados'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                statusFilter === st
                  ? 'bg-amber-400/20 text-amber-300 font-black border border-amber-400/30'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {st === 'todos' ? 'Todos' : st === 'pendientes' ? 'Pendientes' : st === 'en_curso' ? 'En Curso' : st === 'pausados' ? 'Pausados' : 'Tachados'}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MAIN DISPLAY AREA: AGENDA HOJA (NOTEBOOK) OR LISTA                     */}
      {/* ========================================================================= */}
      <div className="flex-1 min-h-0 flex flex-col">
        {displayMode === 'agenda' ? (
          /* ========================================================================= */
          /* DISPLAY AGENDA: HOJA DE CUADERNO / AGENDA CON TINTA Y EFECTO DE HOJEO    */
          /* ========================================================================= */
          <div className="flex-1 flex flex-col items-center justify-start min-h-0 relative">
            {/* Agenda Book Exterior / Binding Container */}
            <div className="w-full max-w-5xl h-full flex flex-col bg-[#161410] border-2 border-[#2c261e] rounded-[36px] p-3 sm:p-6 shadow-[0_25px_70px_rgba(0,0,0,0.85)] relative overflow-hidden">
              
              {/* Top Agenda Navigation Header (Girar Hojas & Modo de Hoja) */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#2d271f] z-20">
                {/* Book Spine Details */}
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5 items-center">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#383126] border border-[#524838] shadow-inner" />
                    <span className="w-3.5 h-3.5 rounded-full bg-[#383126] border border-[#524838] shadow-inner" />
                    <span className="w-3.5 h-3.5 rounded-full bg-[#383126] border border-[#524838] shadow-inner" />
                  </div>
                  <div className="flex items-center gap-2">
                    <PenTool size={14} className="text-amber-400/80" />
                    <span className="font-serif italic text-amber-200/80 text-sm font-semibold tracking-wide">
                      Bitácora de Laboratorio Gianduia
                    </span>
                  </div>
                </div>

                {/* Hoja Mode: "Todas en esta hoja" (Default) vs "Paginada (Girar Hojas)" */}
                <div className="flex items-center gap-2">
                  <div className="bg-black/50 p-1 rounded-xl border border-white/5 flex items-center gap-1 text-[10px]">
                    <button
                      onClick={() => setSheetMode('todas')}
                      className={`px-2.5 py-1 rounded-lg font-mono uppercase font-bold transition-all ${
                        sheetMode === 'todas'
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                          : 'text-white/40 hover:text-white'
                      }`}
                      title="Ver todas las tareas en una sola hoja continua"
                    >
                      Todas en una Hoja
                    </button>
                    <button
                      onClick={() => setSheetMode('paginada')}
                      className={`px-2.5 py-1 rounded-lg font-mono uppercase font-bold transition-all ${
                        sheetMode === 'paginada'
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                          : 'text-white/40 hover:text-white'
                      }`}
                      title="Dividir en hojas de agenda para girar de página en página"
                    >
                      Girar Hojas
                    </button>
                  </div>

                  {/* Page Turning Controls (Active in paginada mode or when many tasks) */}
                  <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-[#3e3428]">
                    <button
                      onClick={handleTurnPrevPage}
                      disabled={sheetMode === 'todas' || validPage === 0}
                      className="p-1.5 rounded-lg text-white/50 hover:text-white disabled:opacity-20 disabled:hover:text-white/50 transition-all"
                      title="Girar hoja anterior (⬅)"
                    >
                      <ChevronLeft size={18} />
                    </button>

                    <span className="text-[11px] font-mono text-amber-300 px-2 font-bold whitespace-nowrap">
                      {sheetMode === 'todas' ? `Hoja Única (${filteredTasks.length})` : `Hoja ${validPage + 1} de ${totalPages}`}
                    </span>

                    <button
                      onClick={handleTurnNextPage}
                      disabled={sheetMode === 'todas' || validPage >= totalPages - 1}
                      className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 disabled:opacity-20 disabled:hover:text-amber-400 transition-all flex items-center gap-1 font-mono text-xs font-bold px-2"
                      title="Girar hoja siguiente (➔)"
                    >
                      <span>Girar</span>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* The Realistic Paper Sheet (Ivory / Lab Ruled Paper with Ink Typography) */}
              <div 
                className="flex-1 mt-3 rounded-2xl bg-[#fcfaf4] text-[#1a253c] shadow-2xl relative flex flex-col overflow-hidden min-h-0 border-l-[16px] border-l-[#d6cdb6]"
                style={{
                  boxShadow: 'inset 0 0 40px rgba(0,0,0,0.06), 0 10px 30px rgba(0,0,0,0.5)'
                }}
              >
                {/* Spiral Holes Texture Effect along the Left Spine */}
                <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-around py-6 pointer-events-none z-20 opacity-80">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <div key={i} className="w-4 h-3 rounded-full bg-[#1e1b16] border border-[#e8e0ce] shadow-inner -ml-2" />
                  ))}
                </div>

                {/* Vertical Margin Red Line (classic notebook margin) */}
                <div className="absolute left-[70px] top-0 bottom-0 w-[1.5px] bg-rose-400/40 pointer-events-none z-10" />

                {/* Paper Header: Date stamp in ink style */}
                <div className="pl-24 pr-8 pt-4 pb-2 border-b border-[#304060]/10 flex flex-wrap items-center justify-between gap-2 z-10 bg-[#fbf9f2]/70">
                  <div className="flex items-center gap-2">
                    <Bookmark size={14} className="text-[#a83232]" />
                    <span 
                      className="text-lg text-[#162947] font-bold capitalize"
                      style={{ fontFamily: 'Caveat, Kalam, cursive' }}
                    >
                      {todayFormatted}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono text-[#5b6a88]">
                    <span className="uppercase tracking-widest font-bold">Laboratorio Gianduia • Ensayos</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#304060]/30" />
                    <span>Tacha con un clic al finalizar</span>
                  </div>
                </div>

                {/* Ruled Notebook Paper Body with Repeating Lines */}
                <div 
                  className="flex-1 overflow-y-auto custom-scrollbar p-6 pl-24 pr-8 relative z-0 flex flex-col"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(transparent, transparent 47px, rgba(40, 60, 110, 0.08) 48px)',
                    backgroundPosition: '0 8px'
                  }}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={sheetMode === 'todas' ? 'sheet_all' : `sheet_${validPage}`}
                      initial={{
                        opacity: 0,
                        rotateY: pageDirection === 'next' ? 12 : -12,
                        transformOrigin: 'left center'
                      }}
                      animate={{
                        opacity: 1,
                        rotateY: 0,
                        transformOrigin: 'left center'
                      }}
                      exit={{
                        opacity: 0,
                        rotateY: pageDirection === 'next' ? -12 : 12,
                        transformOrigin: 'left center'
                      }}
                      transition={{ duration: 0.32, ease: "easeOut" }}
                      className="space-y-3.5 pb-6"
                    >
                      {currentSheetTasks.length === 0 ? (
                        <div className="py-28 text-center">
                          <p 
                            className="text-2xl text-[#6b7792] font-semibold"
                            style={{ fontFamily: 'Caveat, Kalam, cursive' }}
                          >
                            Esta carilla está en blanco. No hay pendientes anotados.
                          </p>
                          <p className="text-xs text-[#8f9baa] mt-2 font-mono">
                            Escribe una tarea debajo para plasmarla en tinta sobre esta hoja.
                          </p>
                        </div>
                      ) : (
                        currentSheetTasks.map((task) => {
                          const isCompleted = task.completed || task.status === 'finalizado';
                          const isRunning = task.status === 'en_curso';
                          const isPaused = task.status === 'pausado';
                          const cutsCount = (task.timeCuts || []).length;
                          const isJustInked = inkFlourishTaskId === task.id;

                          return (
                            <div
                              key={task.id}
                              className={`group relative flex flex-col md:flex-row items-start md:items-center justify-between gap-3 py-2.5 px-3 rounded-xl border border-transparent hover:border-[#304060]/10 hover:bg-white/40 transition-all ${
                                isCompleted ? 'opacity-60' : ''
                              } ${isJustInked ? 'bg-amber-100/50 animate-pulse' : ''}`}
                            >
                              {/* Left: Handwritten Checkbox & Ink Strike-through Task */}
                              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                                {/* Hand-drawn style ink checkbox */}
                                <button
                                  onClick={() => handleToggleTask(task)}
                                  className={`w-6 h-6 mt-1 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                                    isCompleted
                                      ? 'bg-[#152e55] border-[#152e55] text-[#fcfaf4] shadow-sm scale-95'
                                      : 'border-[#3d4d6e]/50 hover:border-[#152e55] bg-white/50 hover:scale-105'
                                  }`}
                                  title={isCompleted ? "Desmarcar (Quitar tachado)" : "Tachar tarea con tinta (Finalizada)"}
                                >
                                  {isCompleted ? (
                                    <Check size={16} strokeWidth={3} className="text-[#fcfaf4]" />
                                  ) : (
                                    <div className="w-1.5 h-1.5 rounded-full bg-current opacity-0 group-hover:opacity-40" />
                                  )}
                                </button>

                                <div className="flex-1 min-w-0">
                                  {/* Task written in ink with striking line */}
                                  <div className="relative inline-block max-w-full">
                                    <span
                                      className={`text-xl tracking-normal leading-snug transition-all ${
                                        isCompleted
                                          ? 'line-through text-[#63708a] italic'
                                          : 'text-[#122342] font-semibold'
                                      }`}
                                      style={{
                                        fontFamily: 'Caveat, Kalam, cursive',
                                        fontSize: '1.35rem',
                                        textDecorationThickness: isCompleted ? '2.5px' : 'auto',
                                        textDecorationColor: '#122342'
                                      }}
                                    >
                                      {task.text}
                                    </span>
                                  </div>

                                  {/* Project, Area & Interruption Badges */}
                                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#2d4168] bg-[#2d4168]/10 px-2 py-0.5 rounded-md">
                                      {task.projectName} ({task.projectCode})
                                    </span>

                                    {task.area && (
                                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#735316] bg-[#f5e5c0] px-2 py-0.5 rounded-md">
                                        {task.area}
                                      </span>
                                    )}

                                    {task.assignee && (
                                      <span className="text-[11px] italic text-[#4b5872] flex items-center gap-1 font-serif">
                                        <User size={11} className="text-[#64748b]" /> {task.assignee}
                                      </span>
                                    )}

                                    {/* Number of cuts / interruptions ("si se fue cortando varias veces") */}
                                    {cutsCount > 0 && (
                                      <button
                                        onClick={() => setViewingCutsTask(task)}
                                        className="text-[9px] font-mono font-bold uppercase tracking-wider text-rose-800 bg-rose-100 hover:bg-rose-200 border border-rose-300 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                                        title="Ver detalle de interrupciones / cortes de esta tarea"
                                      >
                                        <AlertTriangle size={10} className="text-rose-600" />
                                        Cortada {cutsCount} {cutsCount === 1 ? 'vez' : 'veces'} ({task.totalLostMinutes || 15}m perdidos)
                                        <span className="underline ml-0.5">Ver</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Right: Time Controls (Hora de Inicio, Fin, Iniciar, Pausar, Finalizar) */}
                              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                {/* Time Fields: Hora Inicio y Fin */}
                                <div className="flex items-center gap-1 bg-[#ede6d4]/80 border border-[#d2c8b2] px-2.5 py-1 rounded-xl shadow-inner">
                                  <Clock size={12} className="text-[#55637e]" />
                                  <input
                                    type="time"
                                    value={task.startTime || ''}
                                    onChange={(e) => handleTimeChange(task, 'startTime', e.target.value)}
                                    className="bg-transparent text-xs font-mono font-bold text-[#14233e] outline-none w-14"
                                    title="Hora de Inicio"
                                  />
                                  <span className="text-[#8895ad] font-bold text-xs">-</span>
                                  <input
                                    type="time"
                                    value={task.endTime || ''}
                                    onChange={(e) => handleTimeChange(task, 'endTime', e.target.value)}
                                    className="bg-transparent text-xs font-mono font-bold text-[#14233e] outline-none w-14"
                                    title="Hora de Fin"
                                  />
                                </div>

                                {/* Status & Control Buttons */}
                                {isRunning ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => setActivePauseTaskId({ devId: task.projectId, taskId: task.id })}
                                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-mono font-bold text-[10px] uppercase shadow-md transition-all animate-pulse"
                                      title="Pausar o registrar interrupción / corte de tarea"
                                    >
                                      <Pause size={12} />
                                      <span>Pausar</span>
                                    </button>
                                    <button
                                      onClick={() => handleFinishTask(task)}
                                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-[10px] uppercase shadow-md transition-all"
                                      title="Finalizar tarea y tachar con tinta"
                                    >
                                      <Check size={12} />
                                      <span>Tachar</span>
                                    </button>
                                  </div>
                                ) : isPaused ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleResumeTask(task)}
                                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-mono font-bold text-[10px] uppercase shadow-md transition-all"
                                      title="Reanudar tarea"
                                    >
                                      <Play size={12} />
                                      <span>Reanudar</span>
                                    </button>
                                    <button
                                      onClick={() => setActivePauseTaskId({ devId: task.projectId, taskId: task.id })}
                                      className="p-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 border border-rose-300 text-rose-800 text-[10px] font-mono font-bold"
                                      title="Añadir otro corte a esta tarea"
                                    >
                                      + Corte
                                    </button>
                                  </div>
                                ) : !isCompleted ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleStartTask(task)}
                                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#152e55] hover:bg-[#203f74] text-white font-mono font-bold text-[10px] uppercase shadow-md transition-all"
                                      title="Iniciar tarea (Registra hora de inicio automática)"
                                    >
                                      <Play size={12} />
                                      <span>Iniciar</span>
                                    </button>
                                    <button
                                      onClick={() => handleFinishTask(task)}
                                      className="p-1.5 rounded-xl border border-[#3d4d6e]/40 hover:bg-emerald-100 hover:text-emerald-800 text-[#3d4d6e] transition-all"
                                      title="Marcar finalizada directamente"
                                    >
                                      <Check size={13} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 bg-emerald-100 border border-emerald-300 text-emerald-800 px-2.5 py-1 rounded-xl">
                                    <CheckCircle2 size={12} />
                                    <span className="text-[10px] font-mono font-bold uppercase">Tachada</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Bottom of the Sheet: Write in Ink New Task ("se van escribiendo cosas en tinta") */}
                <div className="bg-[#eee8da] border-t border-[#d8d0bd] p-4 pl-24 pr-8 flex flex-col md:flex-row items-center gap-3 shrink-0 z-10">
                  <div className="flex-1 w-full flex items-center gap-2">
                    <span 
                      className="text-xl text-[#142646] font-bold"
                      style={{ fontFamily: 'Caveat, Kalam, cursive' }}
                    >
                      Escribir en tinta:
                    </span>
                    <input
                      type="text"
                      placeholder="Escribir nuevo pendiente para registrar en la hoja..."
                      value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddDirectTask()}
                      className="flex-1 bg-white/80 border border-[#c9c0ae] rounded-xl px-4 py-2 text-base text-[#122342] placeholder:italic outline-none focus:border-[#152e55] focus:bg-white transition-all shadow-inner"
                      style={{ fontFamily: 'Caveat, Kalam, cursive', fontSize: '1.25rem' }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <select
                      value={targetDevId}
                      onChange={(e) => setTargetDevId(e.target.value)}
                      className="bg-white/90 border border-[#c9c0ae] rounded-xl px-3 py-2 text-xs text-[#1e2a40] font-mono outline-none"
                    >
                      {activeDevs.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.productName.slice(0, 18)}...
                        </option>
                      ))}
                    </select>

                    <select
                      value={newArea}
                      onChange={(e) => setNewArea(e.target.value as any)}
                      className="bg-white/90 border border-[#c9c0ae] rounded-xl px-3 py-2 text-xs text-[#1e2a40] font-mono outline-none"
                    >
                      <option value="">Área...</option>
                      <option value="desarrollo">Desarrollo</option>
                      <option value="produccion">Producción</option>
                      <option value="compras">Compras</option>
                      <option value="sistema">Sistema</option>
                      <option value="pcp">PCP</option>
                      <option value="mantenimiento">Mantenimiento</option>
                      <option value="logistica">Logística</option>
                    </select>

                    <div className="flex items-center gap-1 bg-white/90 border border-[#c9c0ae] px-2 py-1.5 rounded-xl">
                      <Clock size={12} className="text-[#59647a]" />
                      <input
                        type="time"
                        value={newStartTime}
                        onChange={(e) => setNewStartTime(e.target.value)}
                        placeholder="Inicio"
                        className="bg-transparent text-xs font-mono font-bold text-[#1e2a40] outline-none w-14"
                        title="Hora de Inicio"
                      />
                    </div>

                    <button
                      onClick={handleAddDirectTask}
                      disabled={isAddingInking || !newText.trim()}
                      className="px-5 py-2 rounded-xl bg-[#152e55] hover:bg-[#203f74] disabled:opacity-40 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={16} />
                      <span>{isAddingInking ? "Escribiendo..." : "Anotar"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* DISPLAY LISTA: VISTA COMPACTA Y MODERNA DE TARJETAS / LISTADO TABULAR     */
          /* ========================================================================= */
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 p-1">
            {filteredTasks.length === 0 ? (
              <div className="py-24 text-center bg-[var(--surface)] border border-white/5 rounded-3xl">
                <p className="text-white/40 italic">No hay tareas que coincidan con los filtros aplicados.</p>
              </div>
            ) : (
              filteredTasks.map(task => {
                const isCompleted = task.completed || task.status === 'finalizado';
                const isRunning = task.status === 'en_curso';
                const isPaused = task.status === 'pausado';
                const cutsCount = (task.timeCuts || []).length;

                return (
                  <div
                    key={task.id}
                    className={`bg-[var(--surface)] border border-white/5 hover:border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
                      isCompleted ? 'opacity-40' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <button
                        onClick={() => handleToggleTask(task)}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                          isCompleted
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-white/20 hover:border-amber-400 text-transparent'
                        }`}
                        title={isCompleted ? "Desmarcar" : "Completar tarea"}
                      >
                        <Check size={14} />
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug truncate ${isCompleted ? 'line-through text-white/30' : 'text-white font-medium'}`}>
                          {task.text}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[9px] uppercase font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                            {task.projectName}
                          </span>
                          {task.area && (
                            <span className="text-[9px] uppercase font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded">
                              {task.area}
                            </span>
                          )}
                          {task.assignee && (
                            <span className="text-[9px] text-white/30 italic">
                              Resp: {task.assignee}
                            </span>
                          )}
                          {cutsCount > 0 && (
                            <button
                              onClick={() => setViewingCutsTask(task)}
                              className="text-[9px] font-mono text-rose-400 hover:text-rose-300 font-bold bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded flex items-center gap-1"
                              title="Ver detalle de cortes"
                            >
                              <AlertTriangle size={10} />
                              {cutsCount} {cutsCount === 1 ? 'corte' : 'cortes'} ({task.totalLostMinutes || 0}m perdidos)
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-between md:justify-end">
                      {/* Time Fields */}
                      <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl font-mono text-xs">
                        <Clock size={12} className="text-white/40" />
                        <input
                          type="time"
                          value={task.startTime || ''}
                          onChange={(e) => handleTimeChange(task, 'startTime', e.target.value)}
                          className="bg-transparent text-white outline-none w-14"
                          title="Hora Inicio"
                        />
                        <span className="text-white/30">-</span>
                        <input
                          type="time"
                          value={task.endTime || ''}
                          onChange={(e) => handleTimeChange(task, 'endTime', e.target.value)}
                          className="bg-transparent text-white outline-none w-14"
                          title="Hora Fin"
                        />
                      </div>

                      {/* Control Buttons */}
                      {isRunning ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setActivePauseTaskId({ devId: task.projectId, taskId: task.id })}
                            className="px-3 py-1.5 rounded-xl bg-amber-400 text-black font-bold text-[10px] uppercase flex items-center gap-1 shadow-md animate-pulse"
                          >
                            <Pause size={12} /> Pausar
                          </button>
                          <button
                            onClick={() => handleFinishTask(task)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-bold text-[10px] uppercase flex items-center gap-1"
                          >
                            <Check size={12} /> Finalizar
                          </button>
                        </div>
                      ) : isPaused ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleResumeTask(task)}
                            className="px-3 py-1.5 rounded-xl bg-blue-500 text-white font-bold text-[10px] uppercase flex items-center gap-1"
                          >
                            <Play size={12} /> Reanudar
                          </button>
                          <button
                            onClick={() => setActivePauseTaskId({ devId: task.projectId, taskId: task.id })}
                            className="px-2 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-mono"
                            title="Añadir otro corte"
                          >
                            + Corte
                          </button>
                        </div>
                      ) : !isCompleted ? (
                        <button
                          onClick={() => handleStartTask(task)}
                          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] uppercase flex items-center gap-1"
                        >
                          <Play size={12} /> Iniciar
                        </button>
                      ) : (
                        <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                          Finalizada
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. MODAL: REGISTRAR CORTE / PAUSA ("SI SE FUE CORTANDO VARIAS VECES")     */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {activePauseTaskId && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActivePauseTaskId(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#18181b] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl relative z-10 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-400/10 text-amber-400 rounded-xl">
                    <Pause size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white uppercase tracking-wider">
                      Registrar Corte / Pausa
                    </h3>
                    <p className="text-[10px] text-white/40 uppercase font-mono">
                      Seguimiento de demoras e interrupciones
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActivePauseTaskId(null)}
                  className="text-white/30 hover:text-white text-lg p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">
                    ¿Por qué se interrumpió la tarea? (Motivo)
                  </label>
                  <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                    {(Object.keys(REASON_CONFIG) as TimeLossReason[]).map(reasonKey => {
                      const item = REASON_CONFIG[reasonKey];
                      const IconComp = item.icon;
                      const isSelected = pauseReason === reasonKey;

                      return (
                        <button
                          key={reasonKey}
                          type="button"
                          onClick={() => setPauseReason(reasonKey)}
                          className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                              : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <IconComp size={16} />
                            <span>{item.label}</span>
                          </div>
                          {isSelected && <Check size={14} className="text-amber-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">
                    Tiempo Perdido Estimado (Minutos)
                  </label>
                  <div className="flex items-center gap-2">
                    {[10, 15, 30, 45, 60].map(mins => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setPauseDurationEst(mins)}
                        className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                          pauseDurationEst === mins
                            ? 'bg-amber-400 text-black border-amber-400'
                            : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">
                    Observación o Detalle Adicional (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Se esperó a que se enfriara la templadora..."
                    value={pauseNote}
                    onChange={(e) => setPauseNote(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActivePauseTaskId(null)}
                  className="flex-1 py-3 bg-white/5 text-white/60 hover:bg-white/10 rounded-xl font-bold uppercase text-xs tracking-wider transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPause}
                  className="flex-1 py-3 bg-amber-400 hover:bg-amber-300 text-black font-bold uppercase text-xs tracking-wider rounded-xl shadow-lg shadow-amber-400/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Pause size={14} />
                  <span>Guardar Pausa</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 6. MODAL: HISTORIAL DE CORTES DE UNA TAREA ESPECÍFICA                     */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {viewingCutsTask && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingCutsTask(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#18181b] border border-white/10 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative z-10 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
                    <History size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white uppercase tracking-wider">
                      Historial de Interrupciones
                    </h3>
                    <p className="text-[10px] text-white/40 truncate max-w-xs font-serif italic">
                      "{viewingCutsTask.text}"
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingCutsTask(null)}
                  className="text-white/30 hover:text-white text-lg p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar">
                {(viewingCutsTask.timeCuts || []).length === 0 ? (
                  <p className="text-xs text-white/30 italic text-center py-8">
                    No hay cortes registrados para esta tarea.
                  </p>
                ) : (
                  (viewingCutsTask.timeCuts || []).map((cut, idx) => {
                    const info = REASON_CONFIG[cut.reason] || REASON_CONFIG.otro;
                    const IconComp = info.icon;

                    return (
                      <div
                        key={cut.id || idx}
                        className="bg-white/5 border border-white/5 rounded-2xl p-3.5 flex items-start justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-xl ${info.badgeBg}`}>
                            <IconComp size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">
                                {info.label}
                              </span>
                              <span className="text-[10px] font-mono text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded">
                                +{cut.durationMinutes || 15} min perdidos
                              </span>
                            </div>
                            {cut.note && (
                              <p className="text-xs text-white/60 mt-1 italic">
                                "{cut.note}"
                              </p>
                            )}
                            <p className="text-[9px] text-white/30 font-mono mt-1">
                              {new Date(cut.pausedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteCut(viewingCutsTask, cut.id)}
                          className="p-1.5 text-white/20 hover:text-rose-400 rounded-lg transition-all"
                          title="Eliminar este corte"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-white/5">
                <span className="text-xs text-white/40 font-mono">
                  Total tiempo perdido: <strong className="text-rose-400">{viewingCutsTask.totalLostMinutes || 0}m</strong>
                </span>
                <button
                  onClick={() => {
                    setActivePauseTaskId({ devId: viewingCutsTask.projectId, taskId: viewingCutsTask.id });
                    setViewingCutsTask(null);
                  }}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black font-bold uppercase text-xs tracking-wider rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Plus size={14} />
                  <span>Añadir Corte</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
