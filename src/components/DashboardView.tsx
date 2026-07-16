import React, { useMemo } from 'react';
import { 
  GitMerge, 
  FlaskConical, 
  Scale, 
  Check, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  Activity,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { DevelopmentProject, Recipe, ProductArea } from '../types';

interface DashboardViewProps {
  developments: DevelopmentProject[];
  recipes: Recipe[];
}

const COLORS = ['#FF6B81', '#4D96FF', '#6BCB77', '#FFD93D', '#B197FC', '#4DBFFF', '#8E9AAF'];

export function DashboardView({ developments, recipes }: DashboardViewProps) {
  const activeDevs = developments.filter(d => d.status !== 'archivado');
  
  const areaStats = useMemo(() => {
    const stats: Record<string, number> = {};
    activeDevs.forEach(d => {
      stats[d.area] = (stats[d.area] || 0) + 1;
    });
    return Object.entries(stats).map(([name, value]) => ({ 
      name: name.charAt(0).toUpperCase() + name.slice(1), 
      value 
    }));
  }, [activeDevs]);

  const statusStats = useMemo(() => {
    const stats: Record<string, number> = {
      'Pendiente': developments.filter(d => d.status === 'pendiente').length,
      'En Progreso': developments.filter(d => d.status === 'en_progreso').length,
      'Finalizado': developments.filter(d => d.status === 'finalizado').length,
    };
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  }, [developments]);

  const priorityStats = useMemo(() => {
    const stats: Record<string, number> = {
      'Alta': developments.filter(d => d.priority === 'alta' && d.status !== 'archivado').length,
      'Media': developments.filter(d => d.priority === 'media' && d.status !== 'archivado').length,
      'Baja': developments.filter(d => d.priority === 'baja' && d.status !== 'archivado').length,
    };
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  }, [developments]);

  const upcomingDeadlines = useMemo(() => {
    return developments
      .filter(d => d.status !== 'archivado' && d.status !== 'finalizado')
      .flatMap(d => (d.tasks || [])
        .filter(t => !t.completed && t.deadline)
        .map(t => ({ 
          projectName: d.productName, 
          task: t.text, 
          deadline: t.deadline!,
          priority: d.priority
        }))
      )
      .sort((a, b) => {
        // Primary: Deadline (sooner first)
        if (a.deadline !== b.deadline) return a.deadline - b.deadline;
        // Secondary: Priority (High > Medium > Low)
        const priorityScore = { alta: 3, media: 2, baja: 1 };
        const scoreA = priorityScore[a.priority] || 0;
        const scoreB = priorityScore[b.priority] || 0;
        return scoreB - scoreA;
      })
      .slice(0, 8);
  }, [developments]);

  return (
    <div className="space-y-8 pb-10">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            label: 'Proyectos Activos', 
            value: activeDevs.length, 
            sub: 'Desarrollos en curso',
            icon: GitMerge, 
            color: 'text-rose-400' 
          },
          { 
            label: 'Base de Recetas', 
            value: recipes.length, 
            sub: 'Formulaciones técnicas',
            icon: FlaskConical, 
            color: 'text-blue-400' 
          },
          { 
            label: 'Vencimientos Próximos', 
            value: upcomingDeadlines.length, 
            sub: 'Tareas con fecha',
            icon: Calendar, 
            color: 'text-amber-400' 
          },
          { 
            label: 'Pendiente Cómputos', 
            value: recipes.filter(r => r.status === 'informacion_nutricional').length, 
            sub: 'Requiere atención',
            icon: Scale, 
            color: 'text-emerald-400' 
          },
        ].map((stat, i) => (
          <div key={i} className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-3xl relative overflow-hidden group">
            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[2px] text-white/30">{stat.label}</p>
                <p className="text-3xl font-light">{stat.value}</p>
                <p className="text-[10px] text-white/20 font-medium">{stat.sub}</p>
              </div>
              <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${stat.color} transition-transform group-hover:scale-110`}>
                <stat.icon size={24} />
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/[0.02] rounded-full blur-2xl group-hover:bg-white/[0.04] transition-colors" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Chart: Activity by Area */}
        <div className="xl:col-span-2 bg-[var(--surface)] border border-[var(--border)] p-8 rounded-3xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-[2px] flex items-center gap-2">
              <Activity size={18} className="text-[var(--accent)]" />
              Distribución por Áreas
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="rgba(255,255,255,0.3)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.3)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {areaStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart: Status Pie */}
        <div className="bg-[var(--surface)] border border-[var(--border)] p-8 rounded-3xl space-y-6">
          <h3 className="text-sm font-black uppercase tracking-[2px] flex items-center gap-2">
            <PieChartIcon size={18} className="text-[var(--accent)]" />
            Estado de Proyectos
          </h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {statusStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {statusStats.map((stat, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[(i + 2) % COLORS.length] }} />
                <span className="text-[10px] text-white/40 uppercase tracking-wider">{stat.name}: {stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart: Priority Pie */}
        <div className="bg-[var(--surface)] border border-[var(--border)] p-8 rounded-3xl space-y-6">
          <h3 className="text-sm font-black uppercase tracking-[2px] flex items-center gap-2">
            <TrendingUp size={18} className="text-[var(--accent)]" />
            Prioridad de Activos
          </h3>
          <div className="h-[200px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={8}
                  dataKey="value"
                >
                  <Cell fill="#ef4444" /> {/* Alta */}
                  <Cell fill="#f59e0b" /> {/* Media */}
                  <Cell fill="#3b82f6" /> {/* Baja */}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {priorityStats.map((stat, i) => {
               const colors = ['#ef4444', '#f59e0b', '#3b82f6'];
               return (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i] }} />
                    <span className="text-[10px] text-white/40 uppercase tracking-wider">{stat.name}</span>
                  </div>
                  <span className="text-[10px] font-bold text-white">{stat.value}</span>
                </div>
               );
            })}
          </div>
        </div>
      </div>

      {/* Deadlines & Recent Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--surface)] border border-[var(--border)] p-8 rounded-3xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-[2px] flex items-center gap-2">
              <Calendar size={18} className="text-[var(--accent)]" />
              Próximos Vencimientos
            </h3>
            <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Top 8 Prioritarias</span>
          </div>
          <div className="space-y-3">
            {upcomingDeadlines.length > 0 ? (
              upcomingDeadlines.map((item, i) => {
                const daysLeft = Math.ceil((item.deadline - Date.now()) / (1000 * 60 * 60 * 24));
                const isOverdue = daysLeft < 0;

                return (
                  <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    isOverdue 
                      ? 'bg-rose-500/10 border-rose-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]' 
                      : 'bg-white/5 border-white/5 hover:border-white/10'
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-10 rounded-full ${
                        item.priority === 'alta' ? 'bg-rose-500' : 
                        item.priority === 'media' ? 'bg-amber-500' : 'bg-blue-500'
                      }`} />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white">{item.projectName}</p>
                        <p className="text-[10px] text-white/40 max-w-[200px] truncate">{item.task}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                        isOverdue ? 'text-rose-500' : 'text-white/60'
                      }`}>
                        {isOverdue ? 'Atrasado' : `En ${daysLeft} días`}
                      </p>
                      <p className="text-[10px] font-bold text-white/20">
                        {new Date(item.deadline).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 opacity-20 italic text-sm">No hay vencimientos próximos.</div>
            )}
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] p-8 rounded-3xl space-y-6">
          <h3 className="text-sm font-black uppercase tracking-[2px] flex items-center gap-2">
            <AlertCircle size={18} className="text-[var(--accent)]" />
            Atención Requerida
          </h3>
          <div className="space-y-4">
            {recipes.filter(r => r.status === 'informacion_nutricional').length > 0 ? (
              recipes.filter(r => r.status === 'informacion_nutricional').slice(0, 5).map((recipe, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-[var(--accent)]/30 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <Scale size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-white">{recipe.name}</p>
                    <p className="text-[10px] text-white/40">Falta Cómputo Nutricional</p>
                  </div>
                  <button className="text-[10px] font-black uppercase tracking-[2px] text-white/40 group-hover:text-[var(--accent)] transition-colors">
                    Resolver
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-10 opacity-20 italic text-sm">Todo está al día.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
