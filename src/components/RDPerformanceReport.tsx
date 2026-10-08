/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
  ComposedChart
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Clock, 
  FlaskConical, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Layers,
  Award,
  Zap,
  Filter,
  BarChart3,
  Timer,
  CheckCircle,
  History,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  X,
  Plus,
  Minus,
  Maximize2,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  ChevronDown,
  LayoutGrid,
  Info
} from 'lucide-react';
import { DevelopmentProject, Recipe, Ingredient, ProductArea, ProjectPriority, ProjectStatus } from '../types';
import { 
  format, 
  differenceInDays, 
  startOfMonth, 
  endOfMonth, 
  eachMonthOfInterval, 
  subMonths, 
  isWithinInterval, 
  getMonth, 
  getYear,
  startOfYear,
  endOfYear,
  isAfter,
  isBefore,
  addMonths
} from 'date-fns';
import { es } from 'date-fns/locale';

interface RDPerformanceReportProps {
  developments: DevelopmentProject[];
  recipes: Recipe[];
  ingredients: Ingredient[];
}

export const RDPerformanceReport: React.FC<RDPerformanceReportProps> = ({
  developments,
  recipes,
  ingredients
}) => {
  // Advanced State for Filtering
  const [dateRange, setDateRange] = useState({
    start: subMonths(new Date(), 11), // Default to last 12 months
    end: new Date()
  });
  
  const [selectedAreas, setSelectedAreas] = useState<ProductArea[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<ProjectPriority[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<ProjectStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'efficiency' | 'trends' | 'outliers' | 'reschedules'>('overview');

  // --- Data Processing Engine ---

  // 1. Lifecycle Grouping
  const allLifecycles = useMemo(() => {
    const lifecycles: Record<string, DevelopmentProject[]> = {};
    
    developments.forEach(dev => {
      const key = dev.productName.toLowerCase().trim();
      if (!lifecycles[key]) {
        lifecycles[key] = [];
      }
      lifecycles[key].push(dev);
    });

    return Object.entries(lifecycles).map(([name, versions]) => {
      const sorted = [...versions].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const finished = sorted.find(v => v.status === 'finalizado' || v.finishedAt);
      
      const duration = finished && first.createdAt 
        ? differenceInDays(finished.finishedAt || finished.updatedAt, first.createdAt)
        : null;

      return {
        id: first.id,
        name: first.productName,
        area: first.area,
        trialsCount: versions.length,
        createdAt: first.createdAt,
        finishedAt: finished ? (finished.finishedAt || finished.updatedAt) : null,
        status: last.status,
        priority: last.priority,
        duration,
        versions: sorted,
        lastUpdated: last.updatedAt,
        rescheduleHistory: last.rescheduleHistory
      };
    });
  }, [developments]);

  // 2. Complex Filtering Logic
  const filteredLifecycles = useMemo(() => {
    return allLifecycles.filter(p => {
      const date = new Date(p.createdAt);
      const inRange = isWithinInterval(date, { start: startOfMonth(dateRange.start), end: endOfMonth(dateRange.end) });
      const areaMatch = selectedAreas.length === 0 || selectedAreas.includes(p.area);
      const priorityMatch = selectedPriorities.length === 0 || selectedPriorities.includes(p.priority);
      const statusMatch = selectedStatuses.length === 0 || selectedStatuses.includes(p.status);
      const searchMatch = searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      return inRange && areaMatch && priorityMatch && statusMatch && searchMatch;
    });
  }, [allLifecycles, dateRange, selectedAreas, selectedPriorities, selectedStatuses, searchQuery]);

  // Reschedule Analysis
  const reschedules = useMemo(() => {
    const list: { name: string, type: 'trial' | 'task', previousDate: number, newDate: number, reason: string, timestamp: number }[] = [];
    
    filteredLifecycles.forEach(p => {
      if (p.rescheduleHistory) {
        p.rescheduleHistory.forEach(r => list.push({ ...r, name: p.name, type: 'trial' }));
      }
      p.versions.forEach(v => {
        if (v.tasks) {
          v.tasks.forEach(t => {
            if (t.rescheduleHistory) {
              t.rescheduleHistory.forEach(r => list.push({ ...r, name: `${p.name} - ${t.text}`, type: 'task' }));
            }
          });
        }
      });
    });

    return list.sort((a,b) => b.timestamp - a.timestamp);
  }, [filteredLifecycles]);

  const filteredTrials = useMemo(() => {
    return developments.filter(d => {
      const date = new Date(d.createdAt);
      const inRange = isWithinInterval(date, { start: startOfMonth(dateRange.start), end: endOfMonth(dateRange.end) });
      const areaMatch = selectedAreas.length === 0 || selectedAreas.includes(d.area);
      const priorityMatch = selectedPriorities.length === 0 || selectedPriorities.includes(d.priority);
      const statusMatch = selectedStatuses.length === 0 || selectedStatuses.includes(d.status);
      const searchMatch = searchQuery === '' || d.productName.toLowerCase().includes(searchQuery.toLowerCase());
      
      return inRange && areaMatch && priorityMatch && statusMatch && searchMatch;
    });
  }, [developments, dateRange, selectedAreas, selectedPriorities, selectedStatuses, searchQuery]);

  // 3. Analytics Computations
  const analytics = useMemo(() => {
    const total = filteredLifecycles.length;
    const trials = filteredTrials.length;
    const completed = filteredLifecycles.filter(p => p.finishedAt).length;
    
    const durations = filteredLifecycles.map(p => p.duration).filter((d): d is number => d !== null);
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    
    // Efficiency by Area
    const areaStats: Record<string, { count: number, finished: number, totalTrials: number, totalDuration: number, durationCount: number }> = {};
    filteredLifecycles.forEach(p => {
      if (!areaStats[p.area]) areaStats[p.area] = { count: 0, finished: 0, totalTrials: 0, totalDuration: 0, durationCount: 0 };
      areaStats[p.area].count++;
      areaStats[p.area].totalTrials += p.trialsCount;
      if (p.finishedAt) areaStats[p.area].finished++;
      if (p.duration !== null) {
        areaStats[p.area].totalDuration += p.duration;
        areaStats[p.area].durationCount++;
      }
    });

    const areaMetrics = Object.entries(areaStats).map(([name, s]) => ({
      name: name.toUpperCase(),
      projects: s.count,
      trialsPerProject: s.count > 0 ? s.totalTrials / s.count : 0,
      closureRate: s.count > 0 ? (s.finished / s.count) * 100 : 0,
      avgDuration: s.durationCount > 0 ? s.totalDuration / s.durationCount : 0
    })).sort((a, b) => b.projects - a.projects);

    // Monthly Trend Data
    const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
    const monthlyTrend = months.map(m => {
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);
      const initiated = filteredLifecycles.filter(p => isWithinInterval(new Date(p.createdAt), { start: mStart, end: mEnd })).length;
      const finished = filteredLifecycles.filter(p => p.finishedAt && isWithinInterval(new Date(p.finishedAt), { start: mStart, end: mEnd })).length;
      const trialCount = filteredTrials.filter(t => isWithinInterval(new Date(t.createdAt), { start: mStart, end: mEnd })).length;
      
      return {
        month: format(m, 'MMM yy', { locale: es }),
        proyectos: initiated,
        completados: finished,
        pruebas: trialCount
      };
    });

    // Trials vs Duration Scatter
    const scatterData = filteredLifecycles
      .filter(p => p.duration !== null)
      .map(p => ({
        name: p.name,
        trials: p.trialsCount,
        duration: p.duration as number,
        area: p.area,
        priority: p.priority
      }));

    // Outliers (projects taking > 2x average duration)
    const outliers = filteredLifecycles
      .filter(p => p.duration !== null && p.duration > avgDuration * 1.5)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0));

    return {
      total,
      trials,
      completed,
      avgDuration,
      areaMetrics,
      monthlyTrend,
      scatterData,
      outliers,
      avgTrials: total > 0 ? trials / total : 0,
      conversionRate: total > 0 ? (completed / total) * 100 : 0
    };
  }, [filteredLifecycles, filteredTrials, dateRange]);

  const COLORS = ['#FF6B81', '#4D96FF', '#6BCB77', '#FFD93D', '#9D50BB', '#F45D01', '#2EC4B6', '#E71D36'];
  const PRIORITY_COLORS = { alta: '#ef4444', media: '#f59e0b', baja: '#10b981' };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* 1. Header & Navigation */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-2 text-[var(--accent)] font-bold text-[10px] uppercase tracking-[4px] mb-2">
            <BarChart3 size={14} /> Executive Insights Hub
          </div>
          <h1 className="text-4xl font-light italic font-serif text-white tracking-tight">Reporte Estratégico I+D</h1>
          <p className="text-white/40 text-sm mt-1 max-w-xl">
            Análisis multidimensional de eficiencia, ciclos de innovación y flujos de trabajo del laboratorio.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
          {[
            { id: 'overview', label: 'Panorama', icon: LayoutGrid },
            { id: 'efficiency', label: 'Eficiencia', icon: Timer },
            { id: 'trends', label: 'Tendencias', icon: LineChartIcon },
            { id: 'outliers', label: 'Atípicos', icon: AlertCircle },
            { id: 'reschedules', label: 'Reprogramaciones', icon: History },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              <tab.icon size={14} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Advanced Control Center */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 bg-[var(--surface)] border border-white/5 p-6 rounded-[32px] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
        
        {/* Date Range Selector */}
        <div className="space-y-2 relative z-10">
          <label className="text-[9px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
            <Calendar size={12} /> Rango del Periodo
          </label>
          <div className="flex items-center gap-2">
            <select 
              value={`${dateRange.start.getFullYear()}-${dateRange.start.getMonth()}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-').map(Number);
                setDateRange(prev => ({ ...prev, start: new Date(y, m, 1) }));
              }}
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-bold text-white outline-none focus:border-[var(--accent)] transition-all"
            >
              {Array.from({ length: 24 }).map((_, i) => {
                const d = subMonths(new Date(), 23 - i);
                return <option key={i} value={`${d.getFullYear()}-${d.getMonth()}`}>{format(d, 'MMM yyyy', { locale: es }).toUpperCase()}</option>
              })}
            </select>
            <span className="text-white/20"><ArrowUpRight size={14} /></span>
            <select 
              value={`${dateRange.end.getFullYear()}-${dateRange.end.getMonth()}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-').map(Number);
                setDateRange(prev => ({ ...prev, end: new Date(y, m, 1) }));
              }}
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-bold text-white outline-none focus:border-[var(--accent)] transition-all"
            >
              {Array.from({ length: 24 }).map((_, i) => {
                const d = subMonths(new Date(), 23 - i);
                return <option key={i} value={`${d.getFullYear()}-${d.getMonth()}`}>{format(d, 'MMM yyyy', { locale: es }).toUpperCase()}</option>
              })}
            </select>
          </div>
        </div>

        {/* Area Multi-select */}
        <div className="space-y-2 relative z-10">
          <label className="text-[9px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
            <Layers size={12} /> Áreas Críticas
          </label>
          <div className="flex flex-wrap gap-1.5 p-2 bg-black/40 border border-white/10 rounded-xl min-h-[40px]">
            {['helados', 'pasteleria', 'chocolates', 'paletas', 'popolo', 'vitrina'].map(area => {
              const isSelected = selectedAreas.includes(area as ProductArea);
              return (
                <button
                  key={area}
                  onClick={() => setSelectedAreas(prev => isSelected ? prev.filter(a => a !== area) : [...prev, area as ProductArea])}
                  className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border ${isSelected ? 'bg-[var(--accent)]/20 border-[var(--accent)] text-[var(--accent)]' : 'border-white/10 text-white/20 hover:border-white/30'}`}
                >
                  {area}
                </button>
              );
            })}
            {selectedAreas.length > 0 && (
              <button onClick={() => setSelectedAreas([])} className="p-1 text-white/20 hover:text-white"><X size={12}/></button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="space-y-2 relative z-10">
          <label className="text-[9px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
            <Search size={12} /> Filtrar por Producto
          </label>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar nombre..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-[11px] font-bold text-white outline-none focus:border-[var(--accent)] transition-all placeholder:text-white/10"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
          </div>
        </div>

        {/* Quick Stats Summary */}
        <div className="flex items-center justify-end gap-4 relative z-10">
           <div className="text-right">
              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Dataset Actual</p>
              <h4 className="text-2xl font-mono font-bold text-white">{filteredLifecycles.length} <span className="text-xs text-white/20 font-light">proyectos</span></h4>
           </div>
           <div className="w-12 h-12 bg-[var(--accent)]/10 rounded-2xl flex items-center justify-center text-[var(--accent)]">
              <Activity size={24} />
           </div>
        </div>
      </div>

      {/* 3. Main Display Area */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div 
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Iteraciones Promedio', value: analytics.avgTrials.toFixed(1), sub: 'Versiones por proyecto', icon: FlaskConical, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                { label: 'Ciclo de Cierre', value: `${Math.round(analytics.avgDuration)} d`, sub: 'Lead time promedio', icon: Timer, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                { label: 'Conversión I+D', value: `${Math.round(analytics.conversionRate)}%`, sub: 'Tasa de éxito / finalización', icon: CheckCircle, color: 'text-purple-400', bg: 'bg-purple-400/10' },
                { label: 'Pruebas Ejecutadas', value: analytics.trials, sub: 'Volumen total de carga', icon: Zap, color: 'text-blue-400', bg: 'bg-blue-400/10' },
              ].map((item, i) => (
                <div key={i} className="bg-[var(--surface)] border border-white/5 p-6 rounded-[32px] group hover:border-[var(--accent)]/30 transition-all shadow-xl">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-2xl ${item.bg} ${item.color}`}>
                      <item.icon size={24} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-3xl font-light text-white font-mono">{item.value}</h3>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{item.label}</p>
                    <p className="text-[11px] text-white/20 italic">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Area Comparison Bar */}
            <div className="bg-[var(--surface)] border border-white/5 rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
               <div className="flex items-center justify-between mb-8">
                 <div className="space-y-1">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <LayoutGrid size={18} className="text-purple-400" /> Rendimiento por Área
                    </h3>
                    <p className="text-xs text-white/30">Volumen vs Tasa de Cierre vs Tiempo Promedio</p>
                 </div>
               </div>
               <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={analytics.areaMetrics}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 'bold' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
                      <Bar dataKey="projects" name="Proyectos Totales" fill="rgba(255,255,255,0.05)" radius={[10, 10, 0, 0]} barSize={50} />
                      <Line type="monotone" dataKey="closureRate" name="% Cierre" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
                      <Line type="monotone" dataKey="avgDuration" name="Días Promedio" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} />
                      <Legend />
                    </ComposedChart>
                  </ResponsiveContainer>
               </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'efficiency' && (
          <motion.div 
            key="efficiency"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Scatter Chart: Trials vs Duration */}
                <div className="bg-[var(--surface)] border border-white/5 rounded-[32px] p-8 shadow-2xl">
                   <div className="space-y-1 mb-8">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <TrendingUp size={18} className="text-amber-400" /> Correlación Iteración / Tiempo
                      </h3>
                      <p className="text-xs text-white/30">¿Más pruebas significan proyectos más lentos?</p>
                   </div>
                   <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis type="number" dataKey="trials" name="Pruebas" unit=" iter" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                          <YAxis type="number" dataKey="duration" name="Duración" unit=" d" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                          <ZAxis type="number" range={[50, 400]} />
                          <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '12px' }} />
                          <Scatter name="Proyectos" data={analytics.scatterData} fill="var(--accent)" fillOpacity={0.6}>
                             {analytics.scatterData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.priority as keyof typeof PRIORITY_COLORS] || 'var(--accent)'} />
                             ))}
                          </Scatter>
                          <Legend />
                        </ScatterChart>
                      </ResponsiveContainer>
                   </div>
                   <div className="flex justify-center gap-6 mt-4">
                      {Object.entries(PRIORITY_COLORS).map(([p, color]) => (
                        <div key={p} className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                           <span className="text-[9px] font-black uppercase text-white/40 tracking-widest">{p}</span>
                        </div>
                      ))}
                   </div>
                </div>

                {/* Avg Trials per Area */}
                <div className="bg-[var(--surface)] border border-white/5 rounded-[32px] p-8 shadow-2xl">
                   <div className="space-y-1 mb-8">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <FlaskConical size={18} className="text-blue-400" /> Esfuerzo de Formulación por Área
                      </h3>
                      <p className="text-xs text-white/30">Promedio de versiones necesarias antes del cierre</p>
                   </div>
                   <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={analytics.areaMetrics} layout="vertical" margin={{ left: 40 }}>
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 'bold' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '12px' }} />
                            <Bar dataKey="trialsPerProject" name="Versiones Promedio" radius={[0, 6, 6, 0]} barSize={15}>
                               {analytics.areaMetrics.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                               ))}
                            </Bar>
                         </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>
             </div>
          </motion.div>
        )}

        {activeTab === 'trends' && (
          <motion.div 
            key="trends"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-8"
          >
             <div className="bg-[var(--surface)] border border-white/5 rounded-[32px] p-8 shadow-2xl overflow-hidden relative">
                <div className="flex items-center justify-between mb-12">
                   <div className="space-y-1">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <LineChartIcon size={18} className="text-blue-400" /> Evolución Temporal del Lab
                      </h3>
                      <p className="text-xs text-white/30">Monitoreo de carga de trabajo y tasa de salida de proyectos</p>
                   </div>
                </div>
                <div className="h-[450px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.monthlyTrend}>
                        <defs>
                          <linearGradient id="gradProjects" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="gradFinished" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 'bold' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '16px' }} />
                        <Area type="monotone" dataKey="proyectos" name="Nuevos Proyectos" stroke="var(--accent)" strokeWidth={4} fill="url(#gradProjects)" />
                        <Area type="monotone" dataKey="completados" name="Cierres de Proyecto" stroke="#10b981" strokeWidth={4} fill="url(#gradFinished)" />
                        <Line type="monotone" dataKey="pruebas" name="Pruebas Totales" stroke="#4d96ff" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                        <Legend iconType="circle" />
                      </AreaChart>
                   </ResponsiveContainer>
                </div>
             </div>
          </motion.div>
        )}

        {activeTab === 'outliers' && (
          <motion.div 
            key="outliers"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Critical Projects (High Trials) */}
                <div className="bg-[var(--surface)] border border-white/5 rounded-[32px] p-8 shadow-2xl">
                   <div className="flex items-center justify-between mb-8">
                      <div className="space-y-1">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          <FlaskConical size={18} className="text-red-400" /> Proyectos con Alta Iteración
                        </h3>
                        <p className="text-xs text-white/30">Requieren más de 5 versiones antes de ser satisfactorios</p>
                      </div>
                   </div>
                   <div className="space-y-3">
                      {filteredLifecycles
                        .filter(p => p.trialsCount > 5)
                        .sort((a,b) => b.trialsCount - a.trialsCount)
                        .slice(0, 5)
                        .map((p, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-red-500/30 transition-all">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 font-bold font-mono text-xs">
                                   {p.trialsCount}
                                </div>
                                <div>
                                   <p className="text-xs font-bold text-white group-hover:text-red-400 transition-colors">{p.name}</p>
                                   <p className="text-[9px] text-white/30 uppercase tracking-widest font-black">{p.area}</p>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className="text-[10px] font-mono text-white/40">{format(new Date(p.createdAt), 'dd/MM/yy')}</p>
                                <p className={`text-[8px] uppercase font-black px-1.5 py-0.5 rounded ${p.priority === 'alta' ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/30'}`}>{p.priority}</p>
                             </div>
                          </div>
                      ))}
                      {filteredLifecycles.filter(p => p.trialsCount > 5).length === 0 && (
                        <div className="py-10 text-center text-white/20 italic text-xs">No hay proyectos con iteración crítica.</div>
                      )}
                   </div>
                </div>

                {/* Slow Projects (Long Duration) */}
                <div className="bg-[var(--surface)] border border-white/5 rounded-[32px] p-8 shadow-2xl">
                   <div className="flex items-center justify-between mb-8">
                      <div className="space-y-1">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          <Timer size={18} className="text-amber-400" /> Ciclos Excesivamente Largos
                        </h3>
                        <p className="text-xs text-white/30">Proyectos que superan el 150% del promedio global</p>
                      </div>
                   </div>
                   <div className="space-y-3">
                      {analytics.outliers.slice(0, 5).map((p, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-amber-500/30 transition-all">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold font-mono text-xs">
                                   {p.duration}d
                                </div>
                                <div>
                                   <p className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">{p.name}</p>
                                   <p className="text-[9px] text-white/30 uppercase tracking-widest font-black">{p.area}</p>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className="text-[10px] font-mono text-white/40">{format(new Date(p.createdAt), 'dd/MM/yy')}</p>
                                <p className="text-[8px] font-black text-white/20 uppercase">Promedio: {Math.round(analytics.avgDuration)}d</p>
                             </div>
                          </div>
                      ))}
                      {analytics.outliers.length === 0 && (
                        <div className="py-10 text-center text-white/20 italic text-xs">No hay proyectos con duración fuera de rango.</div>
                      )}
                   </div>
                </div>
             </div>
          </motion.div>
        )}

        {activeTab === 'reschedules' && (
          <motion.div 
            key="reschedules"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-[var(--surface)] border border-white/5 p-6 rounded-[32px] shadow-xl">
                   <div className="flex justify-between items-start mb-6">
                      <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                         <History size={24} />
                      </div>
                      <div className="text-[8px] font-black text-white/20 uppercase tracking-[2px]">Métrica Reschedule</div>
                   </div>
                   <div className="space-y-1">
                      <h3 className="text-3xl font-light text-white font-mono">{reschedules.length}</h3>
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Total Cambios de Fecha</p>
                      <p className="text-[11px] text-white/20 italic">En el periodo filtrado</p>
                   </div>
                </div>

                <div className="lg:col-span-2 bg-[var(--surface)] border border-white/5 rounded-[32px] p-8 shadow-2xl overflow-hidden">
                   <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                     <AlertCircle size={18} className="text-rose-400" /> Registro de Postergaciones
                   </h3>
                   <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-4">
                      {reschedules.map((r, i) => (
                        <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                           <div className="flex justify-between items-start">
                              <div>
                                 <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase mb-1 inline-block ${r.type === 'trial' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                    {r.type === 'trial' ? 'PRUEBA' : 'TAREA'}
                                 </span>
                                 <h4 className="text-xs font-bold text-white">{r.name}</h4>
                              </div>
                              <div className="text-right">
                                 <p className="text-[10px] font-mono text-white/40">Cambio: {format(r.timestamp, 'dd/MM/yy HH:mm')}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-3 py-2 border-y border-white/5">
                              <div className="flex-1">
                                 <p className="text-[8px] uppercase text-white/20 font-black mb-0.5">Anterior</p>
                                 <p className="text-[10px] font-mono text-white/40 line-through">{(window as any).formatTinyDate(r.previousDate)}</p>
                              </div>
                              <ArrowUpRight size={14} className="text-[var(--accent)]" />
                              <div className="flex-1">
                                 <p className="text-[8px] uppercase text-[var(--accent)] font-black mb-0.5">Nueva</p>
                                 <p className="text-[10px] font-mono text-white font-bold">{(window as any).formatTinyDate(r.newDate)}</p>
                              </div>
                           </div>
                           <div>
                              <p className="text-[8px] uppercase text-white/20 font-black mb-1">Motivo:</p>
                              <p className="text-[11px] text-white/70 italic bg-black/20 p-2 rounded-lg border border-white/5">"{r.reason}"</p>
                           </div>
                        </div>
                      ))}
                      {reschedules.length === 0 && (
                        <div className="py-20 text-center text-white/10 italic text-sm">
                           No se registran reprogramaciones en este dataset.
                        </div>
                      )}
                   </div>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Detailed Data Table (Syncs with Filters) */}
      <div className="bg-[var(--surface)] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">Dataset de Performance Individual</h3>
            <p className="text-xs text-white/30 mt-1">Evolución cuantitativa por producto único en el periodo</p>
          </div>
          <div className="flex items-center gap-4">
             <button className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/30 hover:text-white transition-all">
                <Info size={16} />
             </button>
             <div className="px-4 py-2 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full text-[10px] font-black uppercase tracking-widest border border-[var(--accent)]/20">
              {filteredLifecycles.length} Resultados
            </div>
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5">
                <th className="px-8 py-5 text-[9px] uppercase font-black text-white/40 tracking-[0.2em]">Producto / Código</th>
                <th className="px-8 py-5 text-[9px] uppercase font-black text-white/40 tracking-[0.2em]">Área</th>
                <th className="px-8 py-5 text-[9px] uppercase font-black text-white/40 tracking-[0.2em] text-center">Iteraciones</th>
                <th className="px-8 py-5 text-[9px] uppercase font-black text-white/40 tracking-[0.2em] text-center">Iniciado</th>
                <th className="px-8 py-5 text-[9px] uppercase font-black text-white/40 tracking-[0.2em] text-center">Ciclo (Días)</th>
                <th className="px-8 py-5 text-[9px] uppercase font-black text-white/40 tracking-[0.2em] text-right">Estado Actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLifecycles
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                .map((p, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-white font-bold group-hover:text-[var(--accent)] transition-colors">{p.name}</span>
                      <span className="text-[10px] font-mono text-white/20 uppercase tracking-tighter">
                        {p.versions[p.versions.length-1].code}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-2 py-1 bg-white/5 rounded text-[9px] font-black uppercase text-white/40 border border-white/5">{p.area}</span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mx-auto text-xs font-mono font-bold text-amber-500">
                      {p.trialsCount}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className="text-[11px] font-mono text-white/60">
                      {p.createdAt ? format(p.createdAt, 'dd/MM/yy') : '-'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`text-[11px] font-bold ${p.duration ? 'text-emerald-400' : 'text-white/20'}`}>
                        {p.duration !== null ? `${p.duration} d` : 'Incompleto'}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        p.status === 'finalizado' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                        p.status === 'en_progreso' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                        p.status === 'pausado' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                        'bg-white/5 border-white/10 text-white/40'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLifecycles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-white/20 italic">
                    No se encontraron resultados con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
