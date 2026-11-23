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
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Trash2,
  ExternalLink,
  HelpCircle,
  Package,
  Wrench,
  MessageSquare,
  Coffee,
  RotateCcw,
  Sparkles,
  Search,
  Filter
} from 'lucide-react';
import {
  DevelopmentProject,
  ProjectTask,
  TaskStatus,
  TimeLossReason,
  TaskTimeCut,
  AssignmentArea
} from '../types';

export interface DashboardTaskAgendaCardProps {
  developments: DevelopmentProject[];
  userId?: string;
  onUpdateDevelopment?: (dev: DevelopmentProject) => Promise<void> | void;
  onNavigateToAgenda?: () => void;
  onNavigateToProject?: (devId: string) => void;
  isExpandedWidth?: boolean;
  onToggleExpandWidth?: () => void;
}

interface EnrichedTask extends ProjectTask {
  projectId: string;
  projectName: string;
  projectCode: string;
  projectPriority: string;
  projectArea: string;
}

const REASONS: Record<TimeLossReason, { label: string; icon: any; color: string; badgeBg: string }> = {
  espera_insumo: { label: 'Falta / Espera Insumo', icon: Package, color: 'text-amber-600', badgeBg: 'bg-amber-100 border-amber-300 text-amber-800' },
  equipo_ocupado: { label: 'Máquina / Equipo Ocupado', icon: Wrench, color: 'text-purple-600', badgeBg: 'bg-purple-100 border-purple-300 text-purple-800' },
  consulta_aprobacion: { label: 'Espera de Aprobación', icon: MessageSquare, color: 'text-blue-600', badgeBg: 'bg-blue-100 border-blue-300 text-blue-800' },
  reunion_imprevista: { label: 'Reunión Imprevista', icon: Coffee, color: 'text-pink-600', badgeBg: 'bg-pink-100 border-pink-300 text-pink-800' },
  urgencia_produccion: { label: 'Urgencia en Planta', icon: AlertTriangle, color: 'text-rose-600', badgeBg: 'bg-rose-100 border-rose-300 text-rose-800' },
  corte_operativo: { label: 'Pausa Operativa', icon: RotateCcw, color: 'text-emerald-600', badgeBg: 'bg-emerald-100 border-emerald-300 text-emerald-800' },
  otro: { label: 'Otra Interrupción', icon: HelpCircle, color: 'text-gray-600', badgeBg: 'bg-gray-100 border-gray-300 text-gray-800' },
};

export const DashboardTaskAgendaCard: React.FC<DashboardTaskAgendaCardProps> = ({
  developments,
  userId,
  onUpdateDevelopment,
  onNavigateToAgenda,
  onNavigateToProject,
  isExpandedWidth = false,
  onToggleExpandWidth
}) => {
  // Display Modes: 'agenda' (Hoja de libreta) vs 'lista' (Tarjetas condensadas)
  const [displayMode, setDisplayMode] = useState<'agenda' | 'lista'>('agenda');

  // Sheet Mode: 'todas' (Hoja continua) vs 'paginada' (Carillas para girar)
  const [sheetMode, setSheetMode] = useState<'todas' | 'paginada'>('todas');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageDirection, setPageDirection] = useState<'next' | 'prev'>('next');
  const TASKS_PER_PAGE = 8;

  // Filters
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendientes' | 'en_curso' | 'pausados' | 'finalizados'>('pendientes');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTimeLossStats, setShowTimeLossStats] = useState(false);

  // Pause / Cuts Modal State
  const [activePauseTaskId, setActivePauseTaskId] = useState<{ devId: string; taskId: string } | null>(null);
  const [pauseReason, setPauseReason] = useState<TimeLossReason>('espera_insumo');
  const [pauseNote, setPauseNote] = useState('');
  const [pauseDurationEst, setPauseDurationEst] = useState<number>(15);

  // View Cuts History Modal
  const [viewingCutsTask, setViewingCutsTask] = useState<EnrichedTask | null>(null);

  // Quick Inking Task Input
  const [isAddingInking, setIsAddingInking] = useState(false);
  const [newText, setNewText] = useState('');
  const [targetDevId, setTargetDevId] = useState<string>('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [inkFlourishTaskId, setInkFlourishTaskId] = useState<string | null>(null);

  // Active projects
  const activeDevs = useMemo(() => {
    return developments.filter(d => d.status !== 'archivado');
  }, [developments]);

  // Set default target development
  React.useEffect(() => {
    if (!targetDevId && activeDevs.length > 0) {
      setTargetDevId(activeDevs[0].id);
    }
  }, [activeDevs, targetDevId]);

  // Flatten and enrich ALL tasks from all developments (no filtering by deadline)
  const allTasks: EnrichedTask[] = useMemo(() => {
    return developments.flatMap(dev => {
      return (dev.tasks || []).map(task => ({
        ...task,
        projectId: dev.id,
        projectName: dev.productName,
        projectCode: dev.code,
        projectPriority: dev.priority,
        projectArea: dev.area,
      }));
    });
  }, [developments]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let result = allTasks;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        t => t.text.toLowerCase().includes(q) || t.projectName.toLowerCase().includes(q)
      );
    }

    if (statusFilter === 'pendientes') {
      result = result.filter(t => !t.completed);
    } else if (statusFilter === 'finalizados') {
      result = result.filter(t => t.completed);
    } else if (statusFilter === 'en_curso') {
      result = result.filter(t => !t.completed && (t.status === 'en_curso' || (!t.status && !t.completed)));
    } else if (statusFilter === 'pausados') {
      result = result.filter(t => !t.completed && t.status === 'pausado');
    }

    // Sort: Active/In progress first, then by priority, then by creation
    return result.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.status === 'en_curso' && b.status !== 'en_curso') return -1;
      if (b.status === 'en_curso' && a.status !== 'en_curso') return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [allTasks, searchQuery, statusFilter]);

  // Pagination for notebook sheet
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / TASKS_PER_PAGE));
  const currentDisplayedTasks = useMemo(() => {
    if (sheetMode === 'todas') {
      return filteredTasks;
    }
    const start = currentPage * TASKS_PER_PAGE;
    return filteredTasks.slice(start, start + TASKS_PER_PAGE);
  }, [filteredTasks, sheetMode, currentPage]);

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setPageDirection('next');
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setPageDirection('prev');
      setCurrentPage(prev => prev - 1);
    }
  };

  // Task Mutations
  const handleToggleTask = async (task: EnrichedTask) => {
    if (!onUpdateDevelopment) return;
    const dev = developments.find(d => d.id === task.projectId);
    if (!dev) return;

    const willBeCompleted = !task.completed;
    const now = Date.now();
    const updatedTasks = (dev.tasks || []).map(t => {
      if (t.id === task.id) {
        return {
          ...t,
          completed: willBeCompleted,
          status: willBeCompleted ? ('finalizado' as TaskStatus) : ('en_curso' as TaskStatus),
          completedAt: willBeCompleted ? now : undefined,
          endTime: willBeCompleted && !t.endTime ? new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : t.endTime
        };
      }
      return t;
    });

    await onUpdateDevelopment({
      ...dev,
      tasks: updatedTasks,
      updatedAt: now,
    });
  };

  const handleUpdateTaskTimes = async (
    projectId: string,
    taskId: string,
    times: { startTime?: string; endTime?: string }
  ) => {
    if (!onUpdateDevelopment) return;
    const dev = developments.find(d => d.id === projectId);
    if (!dev) return;

    const updatedTasks = (dev.tasks || []).map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          ...times,
        };
      }
      return t;
    });

    await onUpdateDevelopment({
      ...dev,
      tasks: updatedTasks,
      updatedAt: Date.now(),
    });
  };

  const handleSetTaskStatus = async (
    projectId: string,
    taskId: string,
    newStatus: TaskStatus
  ) => {
    if (!onUpdateDevelopment) return;
    const dev = developments.find(d => d.id === projectId);
    if (!dev) return;

    const now = Date.now();
    const updatedTasks = (dev.tasks || []).map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: newStatus,
          completed: newStatus === 'finalizado',
          completedAt: newStatus === 'finalizado' ? now : t.completedAt,
          endTime: newStatus === 'finalizado' && !t.endTime ? new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : t.endTime
        };
      }
      return t;
    });

    await onUpdateDevelopment({
      ...dev,
      tasks: updatedTasks,
      updatedAt: now,
    });
  };

  const handleOpenPauseModal = (projectId: string, taskId: string) => {
    setActivePauseTaskId({ devId: projectId, taskId });
    setPauseReason('espera_insumo');
    setPauseNote('');
    setPauseDurationEst(15);
  };

  const handleSaveCutAndPause = async () => {
    if (!activePauseTaskId || !onUpdateDevelopment) return;
    const dev = developments.find(d => d.id === activePauseTaskId.devId);
    if (!dev) return;

    const now = Date.now();
    const newCut: TaskTimeCut = {
      id: crypto.randomUUID(),
      pausedAt: now,
      reason: pauseReason,
      note: pauseNote.trim() || undefined,
      durationMinutes: pauseDurationEst || 15,
    };

    const updatedTasks = (dev.tasks || []).map(t => {
      if (t.id === activePauseTaskId.taskId) {
        const existingCuts = t.timeCuts || [];
        const updatedCuts = [...existingCuts, newCut];
        const totalLost = updatedCuts.reduce((acc, c) => acc + (c.durationMinutes || 0), 0);
        return {
          ...t,
          status: 'pausado' as TaskStatus,
          timeCuts: updatedCuts,
          totalLostMinutes: totalLost,
          timeLossCategory: pauseReason,
        };
      }
      return t;
    });

    await onUpdateDevelopment({
      ...dev,
      tasks: updatedTasks,
      updatedAt: now,
    });

    setActivePauseTaskId(null);
  };

  const handleResumeTask = async (projectId: string, taskId: string) => {
    if (!onUpdateDevelopment) return;
    const dev = developments.find(d => d.id === projectId);
    if (!dev) return;

    const now = Date.now();
    const updatedTasks = (dev.tasks || []).map(t => {
      if (t.id === taskId) {
        const existingCuts = [...(t.timeCuts || [])];
        if (existingCuts.length > 0) {
          const lastCut = existingCuts[existingCuts.length - 1];
          if (!lastCut.resumedAt) {
            existingCuts[existingCuts.length - 1] = {
              ...lastCut,
              resumedAt: now,
            };
          }
        }
        return {
          ...t,
          status: 'en_curso' as TaskStatus,
          timeCuts: existingCuts,
        };
      }
      return t;
    });

    await onUpdateDevelopment({
      ...dev,
      tasks: updatedTasks,
      updatedAt: now,
    });
  };

  const handleAddNewTaskInInk = async () => {
    if (!newText.trim() || !onUpdateDevelopment) return;
    let targetDev = developments.find(d => d.id === targetDevId);
    if (!targetDev && developments.length > 0) {
      targetDev = developments[0];
    }
    if (!targetDev) return;

    const newId = crypto.randomUUID();
    const newTask: ProjectTask = {
      id: newId,
      text: newText.trim(),
      completed: false,
      status: 'en_curso',
      startTime: newStartTime || new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      endTime: newEndTime || undefined,
      timeCuts: [],
      createdAt: Date.now(),
    };

    setInkFlourishTaskId(newId);
    setTimeout(() => setInkFlourishTaskId(null), 2500);

    const updatedTasks = [...(targetDev.tasks || []), newTask];
    await onUpdateDevelopment({
      ...targetDev,
      tasks: updatedTasks,
      updatedAt: Date.now(),
    });

    setNewText('');
    setNewStartTime('');
    setNewEndTime('');
    setIsAddingInking(false);
  };

  const handleDeleteTask = async (projectId: string, taskId: string) => {
    if (!onUpdateDevelopment) return;
    const dev = developments.find(d => d.id === projectId);
    if (!dev) return;

    const updatedTasks = (dev.tasks || []).filter(t => t.id !== taskId);
    await onUpdateDevelopment({
      ...dev,
      tasks: updatedTasks,
      updatedAt: Date.now(),
    });
  };

  // Lost Time Analytics Computation
  const timeLossStats = useMemo(() => {
    let totalLostMinutes = 0;
    const reasonMinutes: Record<string, number> = {};
    const reasonCounts: Record<string, number> = {};
    let tasksWithCutsCount = 0;
    let zeroCutCompletedTasks = 0;

    allTasks.forEach(task => {
      const cuts = task.timeCuts || [];
      if (cuts.length > 0) {
        tasksWithCutsCount++;
        cuts.forEach(cut => {
          const mins = cut.durationMinutes || 15;
          totalLostMinutes += mins;
          reasonMinutes[cut.reason] = (reasonMinutes[cut.reason] || 0) + mins;
          reasonCounts[cut.reason] = (reasonCounts[cut.reason] || 0) + 1;
        });
      } else if (task.completed) {
        zeroCutCompletedTasks++;
      }
    });

    const sortedReasons = Object.entries(reasonMinutes)
      .map(([reason, minutes]) => ({
        reason: reason as TimeLossReason,
        minutes,
        count: reasonCounts[reason] || 0,
        percentage: totalLostMinutes > 0 ? Math.round((minutes / totalLostMinutes) * 100) : 0,
      }))
      .sort((a, b) => b.minutes - a.minutes);

    return {
      totalLostMinutes,
      tasksWithCutsCount,
      zeroCutCompletedTasks,
      sortedReasons,
    };
  }, [allTasks]);

  const pendingCount = allTasks.filter(t => !t.completed).length;
  const inProgressCount = allTasks.filter(t => !t.completed && t.status === 'en_curso').length;
  const pausedCount = allTasks.filter(t => !t.completed && t.status === 'pausado').length;
  const completedCount = allTasks.filter(t => t.completed).length;

  return (
    <div
      className="bg-[var(--surface)] border border-[var(--border)] p-6 lg:p-8 rounded-3xl space-y-6 shadow-2xl relative transition-all w-full"
    >
      {/* Header matching user focus */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <BookOpen size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black uppercase tracking-[2px] text-white">
                Bitácora y Agenda de Pendientes
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono">
                {pendingCount} activos
              </span>
            </div>
            <p className="text-[11px] text-white/40">
              Hoja de seguimiento con tinta de laboratorio, horas de inicio/fin y cortes
            </p>
          </div>
        </div>

        {/* Display Selector and Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Display Mode Switch */}
          <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setDisplayMode('agenda')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                displayMode === 'agenda'
                  ? 'bg-amber-400 text-stone-900 shadow-md font-black'
                  : 'text-white/60 hover:text-white'
              }`}
              title="Ver en formato hoja de agenda / cuaderno"
            >
              <BookOpen size={14} />
              <span>Agenda</span>
            </button>
            <button
              onClick={() => setDisplayMode('lista')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                displayMode === 'lista'
                  ? 'bg-white/20 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
              title="Ver en formato lista condensada"
            >
              <List size={14} />
              <span>Lista</span>
            </button>
          </div>

          {/* Toggle Lost Time Stats */}
          <button
            onClick={() => setShowTimeLossStats(!showTimeLossStats)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              showTimeLossStats
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title="¿En qué se pierde tiempo en el laboratorio?"
          >
            <Clock size={14} />
            <span>¿Pérdida de tiempo?</span>
          </button>

          {/* Expand width if container allows */}
          {onToggleExpandWidth && (
            <button
              onClick={onToggleExpandWidth}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all hidden lg:flex"
              title={isExpandedWidth ? 'Comprimir ancho' : 'Expandir a ancho completo'}
            >
              {isExpandedWidth ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}

          {/* Jump to Full Agenda View */}
          {onNavigateToAgenda && (
            <button
              onClick={onNavigateToAgenda}
              className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-md hover:scale-105 active:scale-95 cursor-pointer"
              title="Abrir la pestaña de Agenda completa (Hoja en pantalla completa sin scroll)"
            >
              <BookOpen size={14} />
              <span>Abrir Pestaña Agenda</span>
              <ExternalLink size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Subheader Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'pendientes', label: 'Pendientes', count: pendingCount },
            { id: 'en_curso', label: 'En Curso', count: inProgressCount },
            { id: 'pausados', label: 'Pausados', count: pausedCount },
            { id: 'finalizados', label: 'Tachados', count: completedCount },
            { id: 'todos', label: 'Todos', count: allTasks.length },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => {
                setStatusFilter(f.id as any);
                setCurrentPage(0);
              }}
              className={`px-3 py-1 rounded-full font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === f.id
                  ? 'bg-amber-400 text-stone-950 font-black shadow-sm'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>{f.label}</span>
              <span className={`text-[10px] font-mono px-1 rounded-full ${
                statusFilter === f.id ? 'bg-black/20 text-black' : 'bg-white/10 text-white/60'
              }`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Notebook Mode Selector: Continuous Sheet vs Page Turning */}
        {displayMode === 'agenda' && (
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-black/30 p-0.5 rounded-lg border border-white/5">
              <button
                onClick={() => setSheetMode('todas')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  sheetMode === 'todas'
                    ? 'bg-stone-700 text-white'
                    : 'text-white/40 hover:text-white'
                }`}
                title="Mostrar todas las tareas en una sola hoja continua"
              >
                1 Hoja Continua
              </button>
              <button
                onClick={() => setSheetMode('paginada')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  sheetMode === 'paginada'
                    ? 'bg-stone-700 text-white'
                    : 'text-white/40 hover:text-white'
                }`}
                title="Girar carillas tipo agenda paginada"
              >
                Girar Hojas
              </button>
            </div>

            {sheetMode === 'paginada' && (
              <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg border border-white/5">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 0}
                  className="p-1 rounded text-white/60 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                  title="Hoja anterior"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="font-mono text-[10px] font-bold text-amber-300 px-1">
                  {currentPage + 1} / {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages - 1}
                  className="p-1 rounded text-white/60 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                  title="Hoja siguiente"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lost Time Analytics Banner (Collapsible) */}
      <AnimatePresence>
        {showTimeLossStats && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border border-amber-500/30 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="text-amber-400" size={18} />
                  <span className="font-black text-sm uppercase tracking-wider text-amber-300">
                    Análisis de Tiempos Perdidos y Cortes en Laboratorio
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-white/40">
                  {timeLossStats.tasksWithCutsCount} tareas interrumpidas
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <div className="text-[10px] uppercase font-bold text-white/40">Tiempo Perdido Total</div>
                  <div className="text-xl font-bold font-mono text-rose-400 mt-0.5">
                    {Math.floor(timeLossStats.totalLostMinutes / 60)}h {timeLossStats.totalLostMinutes % 60}m
                  </div>
                  <div className="text-[10px] text-white/30 mt-0.5">acumuladas en interrupciones</div>
                </div>

                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <div className="text-[10px] uppercase font-bold text-white/40">Causa Principal de Pérdida</div>
                  <div className="text-sm font-bold text-amber-300 mt-1 truncate">
                    {timeLossStats.sortedReasons[0]
                      ? REASONS[timeLossStats.sortedReasons[0].reason]?.label
                      : 'Sin cortes registrados'}
                  </div>
                  <div className="text-[10px] text-white/30">
                    {timeLossStats.sortedReasons[0]
                      ? `${timeLossStats.sortedReasons[0].minutes} min (${timeLossStats.sortedReasons[0].percentage}%)`
                      : '0 min'}
                  </div>
                </div>

                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <div className="text-[10px] uppercase font-bold text-emerald-400/80">¿En qué NO se pierde tiempo?</div>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                    {timeLossStats.zeroCutCompletedTasks}
                  </div>
                  <div className="text-[10px] text-white/30 mt-0.5">tareas concluidas fluidas sin ningún corte</div>
                </div>
              </div>

              {timeLossStats.sortedReasons.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="text-[10px] uppercase font-black tracking-widest text-white/40">
                    Ranking de Motivos de Interrupción:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {timeLossStats.sortedReasons.slice(0, 4).map(item => {
                      const cfg = REASONS[item.reason] || REASONS.otro;
                      return (
                        <div key={item.reason} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg text-xs">
                          <cfg.icon size={14} className={cfg.color} />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-[11px] font-bold text-white/80">
                              <span className="truncate">{cfg.label}</span>
                              <span className="font-mono text-amber-300">{item.minutes}m</span>
                            </div>
                            <div className="w-full bg-white/10 h-1 rounded-full mt-1 overflow-hidden">
                              <div
                                className="bg-amber-400 h-full rounded-full transition-all"
                                style={{ width: `${item.percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Agenda Paper or List Canvas */}
      {displayMode === 'agenda' ? (
        <div className="relative">
          {/* Agenda Notebook Paper Container */}
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-amber-900/30 bg-[#faf6ee]">
            {/* Top Binder Header */}
            <div className="bg-gradient-to-r from-stone-800 via-stone-750 to-stone-850 px-6 py-2.5 flex items-center justify-between text-white/80 border-b border-amber-900/40 select-none">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-inner" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80 shadow-inner" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80 shadow-inner" />
                <span className="text-[11px] font-black uppercase tracking-[2px] text-amber-200/90 ml-2">
                  Cuaderno de Tareas I+D
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-amber-200/70">
                <span>HOY: {new Date().toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                <span className="text-white/20">•</span>
                <span>Tinta Azul Permanente</span>
              </div>
            </div>

            {/* Notebook Paper Body - Ocupa toda la hoja */}
            <div className="relative flex min-h-[540px] lg:min-h-[660px] max-h-[850px] overflow-y-auto custom-scrollbar bg-[#fdfbf7]">
              {/* Spiral Binder along the left edge */}
              <div className="w-12 sm:w-16 bg-gradient-to-r from-stone-200 via-stone-100 to-stone-200 border-r border-stone-300 flex flex-col items-center py-6 gap-6 shrink-0 z-10 shadow-inner select-none">
                {Array.from({ length: 22 }).map((_, i) => (
                  <div key={i} className="relative flex items-center justify-center">
                    {/* Ring Hole */}
                    <div className="w-3.5 h-3.5 rounded-full bg-stone-900 shadow-inner border border-stone-700/60" />
                    {/* Wire Ring */}
                    <div className="absolute -top-1 w-6 h-2.5 rounded-full border-t-2 border-l border-r border-stone-400 bg-gradient-to-b from-stone-300 via-stone-200 to-transparent shadow-sm" />
                  </div>
                ))}
              </div>

              {/* Red margin line on the paper */}
              <div className="w-8 sm:w-12 border-r-2 border-rose-400/80 shrink-0 bg-transparent" />

              {/* Paper Content with faint notebook lines */}
              <div
                className="flex-1 p-5 sm:p-8 lg:p-10 flex flex-col justify-between"
                style={{
                  backgroundImage: 'repeating-linear-gradient(transparent, transparent 47px, rgba(147, 197, 253, 0.45) 48px)',
                  backgroundSize: '100% 48px',
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={sheetMode === 'paginada' ? `page-${currentPage}` : 'all-page'}
                    initial={{ opacity: 0, x: pageDirection === 'next' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: pageDirection === 'next' ? -20 : 20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {currentDisplayedTasks.length === 0 ? (
                      <div className="py-20 text-center">
                        <p
                          className="text-3xl text-stone-500 font-semibold"
                          style={{ fontFamily: '"Caveat", "Kalam", cursive' }}
                        >
                          ~ Hoja de agenda libre ~
                        </p>
                        <p className="text-sm text-stone-500 mt-2 font-mono">
                          Comienza a asentar pendientes abajo con la pluma de laboratorio.
                        </p>
                      </div>
                    ) : (
                      currentDisplayedTasks.map((task, idx) => {
                        const cuts = task.timeCuts || [];
                        const isCut = cuts.length > 0;
                        const isPaused = task.status === 'pausado';
                        const isCompleted = task.completed;
                        const isFlourishing = inkFlourishTaskId === task.id;

                        return (
                          <div
                            key={`${task.projectId}_${task.id}_${idx}`}
                            className={`group relative p-4 rounded-2xl transition-all border ${
                              isCompleted
                                ? 'bg-amber-100/35 border-stone-200/70'
                                : isPaused
                                ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                                : 'bg-white/75 hover:bg-white/95 border-stone-200/90 shadow-sm'
                            } ${isFlourishing ? 'ring-2 ring-blue-500 animate-pulse' : ''}`}
                          >
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                              {/* Left: Checkmark & Handwriting Text */}
                              <div className="flex items-start gap-4 flex-1 min-w-0">
                                {/* Hand-drawn style ink checkbox */}
                                <button
                                  onClick={() => handleToggleTask(task)}
                                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl border-2 mt-0.5 shrink-0 flex items-center justify-center transition-all ${
                                    isCompleted
                                      ? 'bg-blue-700 border-blue-700 text-white shadow-sm'
                                      : 'border-stone-400 bg-white hover:border-blue-600 shadow-xs'
                                  }`}
                                  title={isCompleted ? 'Desmarcar tarea' : 'Tachar tarea en tinta'}
                                >
                                  {isCompleted && (
                                    <motion.div
                                      initial={{ scale: 0, rotate: -20 }}
                                      animate={{ scale: 1, rotate: 0 }}
                                    >
                                      <Check size={20} strokeWidth={3.5} />
                                    </motion.div>
                                  )}
                                </button>

                                <div className="flex-1 min-w-0">
                                  {/* Project tag & Meta */}
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span
                                      onClick={() => onNavigateToProject && onNavigateToProject(task.projectId)}
                                      className="text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-md bg-stone-800 text-amber-300 cursor-pointer hover:bg-stone-900 transition-colors"
                                      title="Ir al proyecto en Tabla de Desarrollo"
                                    >
                                      {task.projectName}
                                    </span>

                                    {task.projectCode && (
                                      <span className="text-[11px] font-mono text-stone-600 font-semibold">
                                        #{task.projectCode}
                                      </span>
                                    )}

                                    {/* Status Badge */}
                                    {isCompleted ? (
                                      <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded bg-stone-300/70 text-stone-800 font-mono">
                                        ✓ Tachada / Finalizada
                                      </span>
                                    ) : isPaused ? (
                                      <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded bg-amber-400 text-stone-900 font-mono flex items-center gap-1">
                                        <Pause size={11} /> Pausada
                                      </span>
                                    ) : (
                                      <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono flex items-center gap-1">
                                        <Play size={11} /> En Curso
                                      </span>
                                    )}

                                    {/* Multiple Interruptions Badge */}
                                    {isCut && (
                                      <button
                                        onClick={() => setViewingCutsTask(task)}
                                        className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200 transition-all flex items-center gap-1"
                                        title="Ver detalles de los cortes registrados"
                                      >
                                        <AlertTriangle size={12} />
                                        <span>Cortada {cuts.length}x ({task.totalLostMinutes || cuts.reduce((a, c) => a + (c.durationMinutes || 0), 0)}m perdidos)</span>
                                      </button>
                                    )}
                                  </div>

                                  {/* Task Handwriting Text with Ink Strike-Through */}
                                  <p
                                    className={`text-2xl sm:text-3xl lg:text-[28px] font-bold leading-relaxed tracking-wide transition-all ${
                                      isCompleted
                                        ? 'text-stone-400 line-through decoration-rose-600 decoration-[3.5px] opacity-75'
                                        : 'text-[#1e3a8a]'
                                    }`}
                                    style={{
                                      fontFamily: '"Caveat", "Kalam", cursive',
                                    }}
                                  >
                                    {task.text}
                                  </p>
                                </div>
                              </div>

                              {/* Right: Time Tracker & Action Controls */}
                              <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-stone-200">
                                {/* Start & End Time Inputs */}
                                <div className="flex items-center gap-2 bg-stone-100/95 px-3 py-1.5 rounded-xl border border-stone-300 text-stone-800 text-xs sm:text-sm font-mono shadow-xs">
                                  <Clock size={14} className="text-stone-500" />
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] uppercase font-bold text-stone-400">Inicio:</span>
                                    <input
                                      type="time"
                                      value={task.startTime || ''}
                                      onChange={e => handleUpdateTaskTimes(task.projectId, task.id, { startTime: e.target.value })}
                                      className="bg-transparent text-stone-900 font-bold focus:outline-none w-16 text-center cursor-pointer"
                                      title="Hora de Inicio"
                                    />
                                  </div>
                                  <span className="text-stone-400 font-bold">-</span>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] uppercase font-bold text-stone-400">Fin:</span>
                                    <input
                                      type="time"
                                      value={task.endTime || ''}
                                      onChange={e => handleUpdateTaskTimes(task.projectId, task.id, { endTime: e.target.value })}
                                      className="bg-transparent text-stone-900 font-bold focus:outline-none w-16 text-center cursor-pointer"
                                      title="Hora de Fin"
                                    />
                                  </div>
                                </div>

                                {/* Action Buttons: Pause / Resume / Finish / Cut */}
                                <div className="flex items-center gap-1.5">
                                  {!isCompleted && (
                                    <>
                                      {isPaused ? (
                                        <button
                                          onClick={() => handleResumeTask(task.projectId, task.id)}
                                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                                          title="Reanudar tarea"
                                        >
                                          <Play size={13} /> Reanudar
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleOpenPauseModal(task.projectId, task.id)}
                                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                                          title="Registrar corte / pausa e indicar motivo"
                                        >
                                          <Pause size={13} /> Cortar / Pausar
                                        </button>
                                      )}

                                      <button
                                        onClick={() => handleSetTaskStatus(task.projectId, task.id, 'finalizado')}
                                        className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                                        title="Finalizar y tachar tarea"
                                      >
                                        <Check size={13} /> Fin
                                      </button>
                                    </>
                                  )}

                                  <button
                                    onClick={() => handleDeleteTask(task.projectId, task.id)}
                                    className="p-2 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    title="Quitar tarea de la hoja"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Inline Quick Add Task on the paper using ink pen */}
                <div className="mt-6 pt-4 border-t-2 border-dashed border-stone-300">
                  {isAddingInking ? (
                    <div className="bg-white/90 p-4 rounded-2xl border-2 border-blue-400 shadow-md space-y-3">
                      <div className="flex items-center justify-between text-xs text-blue-900 font-bold">
                        <span className="flex items-center gap-1.5">
                          <Sparkles size={14} className="text-blue-600" />
                          <span>Escribiendo nuevo pendiente en tinta de pluma</span>
                        </span>
                        <button
                          onClick={() => setIsAddingInking(false)}
                          className="text-stone-400 hover:text-stone-700"
                        >
                          Cancelar
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          value={targetDevId}
                          onChange={e => setTargetDevId(e.target.value)}
                          className="bg-stone-100 border border-stone-300 text-stone-800 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                        >
                          {activeDevs.map(d => (
                            <option key={d.id} value={d.id}>
                              {d.productName} ({d.code || 'I+D'})
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-2 bg-stone-100 border border-stone-300 rounded-xl px-2 py-1 text-xs font-mono">
                          <span className="text-[10px] text-stone-500 uppercase font-bold">Hora:</span>
                          <input
                            type="time"
                            value={newStartTime}
                            onChange={e => setNewStartTime(e.target.value)}
                            placeholder="09:00"
                            className="bg-transparent text-stone-800 font-bold focus:outline-none w-14"
                          />
                        </div>
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          value={newText}
                          onChange={e => setNewText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleAddNewTaskInInk();
                          }}
                          placeholder="Escribe la tarea aquí (ej: 'Prueba de textura en viscosímetro a 20°C')..."
                          className="w-full bg-transparent border-b-2 border-blue-500 text-2xl text-[#1e3a8a] placeholder-stone-400 py-1 focus:outline-none"
                          style={{ fontFamily: '"Caveat", "Kalam", cursive' }}
                          autoFocus
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setIsAddingInking(false)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-200 transition-all"
                        >
                          Descartar
                        </button>
                        <button
                          onClick={handleAddNewTaskInInk}
                          disabled={!newText.trim()}
                          className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white shadow-md disabled:opacity-40 transition-all flex items-center gap-1.5"
                        >
                          <Plus size={14} />
                          <span>Asentar en la Hoja</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setIsAddingInking(true);
                        if (!newStartTime) {
                          setNewStartTime(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
                        }
                      }}
                      className="w-full py-3.5 px-4 rounded-xl border border-dashed border-stone-400 hover:border-blue-600 hover:bg-blue-50/50 text-stone-600 hover:text-blue-900 transition-all flex items-center justify-center gap-2 group text-base font-bold shadow-xs"
                      style={{ fontFamily: '"Caveat", "Kalam", cursive', fontSize: '1.5rem' }}
                    >
                      <Plus size={20} className="text-blue-600 group-hover:scale-110 transition-transform" />
                      <span>+ Escribir nueva tarea en tinta en esta hoja</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Footer with Page Info */}
            <div className="bg-[#f0e9dc] px-6 py-2.5 border-t border-amber-900/20 flex items-center justify-between text-xs text-stone-600 font-mono">
              <span className="font-bold">{filteredTasks.length} tareas cargadas en total</span>
              {sheetMode === 'paginada' && (
                <span className="font-bold">
                  Carilla {currentPage + 1} de {totalPages}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Display Lista (Condensed modern cards) */
        <div className="space-y-3 max-h-[720px] overflow-y-auto custom-scrollbar pr-1">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-white/30 italic text-sm border border-dashed border-white/10 rounded-2xl">
              No hay tareas que coincidan con el filtro actual.
            </div>
          ) : (
            filteredTasks.map((task, idx) => {
              const cuts = task.timeCuts || [];
              const isCut = cuts.length > 0;
              const isPaused = task.status === 'pausado';

              return (
                <div
                  key={`${task.projectId}_${task.id}_${idx}`}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    task.completed
                      ? 'bg-white/5 border-white/5 opacity-60'
                      : isPaused
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleTask(task)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                        task.completed
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-white/30 hover:border-amber-400'
                      }`}
                    >
                      {task.completed && <Check size={12} />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono font-bold uppercase text-amber-400">
                          {task.projectName}
                        </span>
                        {task.status && (
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                            task.status === 'finalizado' ? 'bg-emerald-500/20 text-emerald-300' :
                            task.status === 'pausado' ? 'bg-amber-500/20 text-amber-300' :
                            'bg-blue-500/20 text-blue-300'
                          }`}>
                            {task.status}
                          </span>
                        )}
                        {isCut && (
                          <span className="text-[9px] font-mono text-rose-400 bg-rose-500/15 px-1.5 py-0.5 rounded">
                            {cuts.length} cortes ({task.totalLostMinutes || cuts.reduce((a, c) => a + (c.durationMinutes || 0), 0)}m)
                          </span>
                        )}
                      </div>
                      <p className={`text-sm truncate ${task.completed ? 'text-white/30 line-through' : 'text-white/90 font-medium'}`}>
                        {task.text}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <div className="text-right font-mono text-[11px] text-white/50">
                      {task.startTime && <span>{task.startTime}</span>}
                      {task.endTime && <span> - {task.endTime}</span>}
                    </div>

                    {!task.completed && (
                      isPaused ? (
                        <button
                          onClick={() => handleResumeTask(task.projectId, task.id)}
                          className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400"
                          title="Reanudar"
                        >
                          <Play size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenPauseModal(task.projectId, task.id)}
                          className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400"
                          title="Registrar Corte"
                        >
                          <Pause size={14} />
                        </button>
                      )
                    )}

                    <button
                      onClick={() => handleDeleteTask(task.projectId, task.id)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-rose-400"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL: Register Interruption / Pause Cut */}
      <AnimatePresence>
        {activePauseTaskId && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-stone-900 border border-amber-500/40 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl">
                  <Pause size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Registrar Corte de Tiempo</h3>
                  <p className="text-xs text-white/40">Indica el motivo por el cual se interrumpe la tarea</p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block uppercase font-bold text-white/50 mb-2">
                    ¿Cuál fue el motivo de la interrupción?
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(REASONS).map(([key, item]) => (
                      <button
                        key={key}
                        onClick={() => setPauseReason(key as TimeLossReason)}
                        className={`p-2.5 rounded-xl border flex items-center gap-3 transition-all text-left ${
                          pauseReason === key
                            ? 'bg-amber-500/20 border-amber-500 text-white font-bold'
                            : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        <item.icon size={16} className={item.color} />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block uppercase font-bold text-white/50 mb-1">
                    Tiempo estimado perdido (minutos)
                  </label>
                  <div className="flex items-center gap-2">
                    {[10, 15, 30, 45, 60].map(mins => (
                      <button
                        key={mins}
                        onClick={() => setPauseDurationEst(mins)}
                        className={`px-3 py-1 rounded-lg border font-mono font-bold ${
                          pauseDurationEst === mins
                            ? 'bg-amber-400 text-stone-950 border-amber-400'
                            : 'bg-white/5 border-white/10 text-white/60'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                    <input
                      type="number"
                      value={pauseDurationEst}
                      onChange={e => setPauseDurationEst(Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-center"
                      min={1}
                    />
                  </div>
                </div>

                <div>
                  <label className="block uppercase font-bold text-white/50 mb-1">
                    Nota / Comentario de la detención (opcional)
                  </label>
                  <input
                    type="text"
                    value={pauseNote}
                    onChange={e => setPauseNote(e.target.value)}
                    placeholder="Ej: A la espera de que mantenimiento libere el agitador..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setActivePauseTaskId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveCutAndPause}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 font-black shadow-lg"
                >
                  Pausar Tarea y Guardar Corte
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: View Cuts History */}
      <AnimatePresence>
        {viewingCutsTask && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-stone-900 border border-white/10 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-amber-400" size={20} />
                  <div>
                    <h3 className="font-bold text-white text-sm">Historial de Interrupciones</h3>
                    <p className="text-[10px] text-white/40">{viewingCutsTask.projectName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingCutsTask(null)}
                  className="text-white/40 hover:text-white text-xs"
                >
                  Cerrar
                </button>
              </div>

              <p className="text-xs text-amber-200/90 font-mono italic bg-white/5 p-2 rounded-lg">
                "{viewingCutsTask.text}"
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {(viewingCutsTask.timeCuts || []).map((cut, idx) => {
                  const cfg = REASONS[cut.reason] || REASONS.otro;
                  return (
                    <div key={cut.id || idx} className="p-3 bg-white/5 rounded-xl border border-white/5 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <cfg.icon size={14} className={cfg.color} />
                          {cfg.label}
                        </span>
                        <span className="font-mono text-amber-400 font-bold">
                          {cut.durationMinutes || 15} min
                        </span>
                      </div>
                      {cut.note && <p className="text-white/60 text-[11px] italic">"{cut.note}"</p>}
                      <div className="text-[9px] text-white/30 font-mono">
                        Registrado: {new Date(cut.pausedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setViewingCutsTask(null)}
                  className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
