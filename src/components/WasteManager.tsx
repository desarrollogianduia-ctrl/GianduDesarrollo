import React, { useState, useMemo } from 'react';
import { 
  Trash2, 
  Plus, 
  Search, 
  Calendar, 
  AlertTriangle, 
  ArrowRight,
  Filter,
  Package,
  History,
  FileText,
  X,
  Clock,
  Layers,
  ThermometerSnowflake
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WasteEntry, Recipe, Ingredient, WasteReason, ProductArea, WasteStatus } from '../types';

interface WasteManagerProps {
  wastes: WasteEntry[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  onSaveWaste: (waste: WasteEntry) => Promise<void>;
  onDeleteWaste: (id: string) => Promise<void>;
  userId: string;
}

const REASONS: { id: WasteReason; label: string; color: string }[] = [
  { id: 'proceso_calor', label: 'Proceso de Calor', color: 'text-rose-400 bg-rose-400/10' },
  { id: 'proceso_fisico', label: 'Proceso Físico', color: 'text-amber-400 bg-amber-400/10' },
  { id: 'otro', label: 'Otro', color: 'text-gray-400 bg-gray-400/10' },
];

const PRIORITIES: { id: 'alta' | 'media' | 'baja'; label: string; color: string }[] = [
  { id: 'alta', label: 'Prioridad Alta', color: 'text-rose-500' },
  { id: 'media', label: 'Prioridad Media', color: 'text-amber-500' },
  { id: 'baja', label: 'Prioridad Baja', color: 'text-blue-500' },
];

const AREAS: { id: ProductArea; label: string; icon: any }[] = [
  { id: 'pasteleria', label: 'Pastelería', icon: Layers },
  { id: 'paletas', label: 'Paletas', icon: Package },
  { id: 'chocolates', label: 'Chocolatería', icon: Package },
  { id: 'helados', label: 'Helados', icon: ThermometerSnowflake },
  { id: 'popolo', label: 'Popolo', icon: Package },
  { id: 'semielaborados', label: 'Semielaborados', icon: Package },
  { id: 'vitrina', label: 'Vitrina', icon: History },
  { id: 'terceros', label: 'Terceros', icon: Package },
];

const CONTAINER_TYPES = {
  helados: ['Balde 10L', 'Vascheta 5L', 'Pote 1L', 'Pote 1/2L', 'Otro'],
  pasteleria: ['Bandeja', 'Unidad Individual', 'Caja', 'Peso Neto', 'Otro'],
  default: ['Unidad', 'Caja', 'Bolsa', 'Otro']
};

export function WasteManager({ wastes, recipes, ingredients, onSaveWaste, onDeleteWaste, userId }: WasteManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [closingWaste, setClosingWaste] = useState<WasteEntry | null>(null);
  const [activeTab, setActiveTab] = useState<'pendientes' | 'completados'>('pendientes');
  const [viewMode, setViewMode] = useState<'mermas' | 'tiempos'>('mermas');
  const [searchQuery, setSearchQuery] = useState('');
  const [reasonFilter, setReasonFilter] = useState<WasteReason | 'todos'>('todos');
  const [areaFilter, setAreaFilter] = useState<ProductArea | 'todos'>('todos');

  const [formData, setFormData] = useState<Partial<WasteEntry>>({
    date: Date.now(),
    amount: 0,
    unit: 'kg',
    reason: 'proceso_calor',
    area: 'helados',
    notes: '',
    productionTime: 0,
    priority: 'media',
    status: 'pendiente',
    initialWeight: 0,
    finalWeight: 0,
    categoryDetails: {
      containerType: '',
      shift: 'mañana',
      inclusionAmount: 0
    }
  });

  const [itemSearch, setItemSearch] = useState('');
  const [closingData, setClosingData] = useState({
    finalWeight: 0,
    productionTime: 0,
    notes: '',
    stages: [] as { id: string; name: string; timeMinutes: number; observations: string; improvement: string }[]
  });

  const filteredItems = useMemo(() => {
    const query = itemSearch.toLowerCase();
    const allItems = [
      ...recipes.map(r => ({ id: r.id, name: r.name, type: 'recipe' as const })),
      ...ingredients.map(i => ({ id: i.id, name: i.name, type: 'ingredient' as const }))
    ];
    return allItems.filter(item => item.name.toLowerCase().includes(query)).slice(0, 10);
  }, [itemSearch, recipes, ingredients]);

  const sortedWastes = useMemo(() => {
    return wastes
      .filter(w => {
        const matchesStatus = (activeTab === 'pendientes' && w.status === 'pendiente') || 
                            (activeTab === 'completados' && w.status === 'completado');
        const matchesSearch = w.productName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesReason = reasonFilter === 'todos' || w.reason === reasonFilter;
        const matchesArea = areaFilter === 'todos' || w.area === areaFilter;
        
        // Filter by viewMode: if tiempos, only show those with productionTime (or just all for now but prioritize view)
        return matchesStatus && matchesSearch && matchesReason && matchesArea;
      })
      .sort((a, b) => {
        if (activeTab === 'pendientes') {
          const priorityMap = { alta: 3, media: 2, baja: 1 };
          return (priorityMap[b.priority] || 0) - (priorityMap[a.priority] || 0);
        }
        return b.date - a.date;
      });
  }, [wastes, activeTab, searchQuery, reasonFilter, areaFilter]);

  const handleCompleteControl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingWaste) return;

    const totalTime = closingData.stages.length > 0 
      ? closingData.stages.reduce((acc, s) => acc + (s.timeMinutes || 0), 0)
      : closingData.productionTime;

    const amount = (closingWaste.initialWeight || 0) - closingData.finalWeight;
    const completedWaste: WasteEntry = {
      ...closingWaste,
      finalWeight: closingData.finalWeight,
      productionTime: totalTime,
      stages: closingData.stages,
      amount: amount > 0 ? amount : 0,
      status: 'completado',
      date: Date.now(),
      notes: closingData.notes || closingWaste.notes
    };

    try {
      await onSaveWaste(completedWaste);
      setClosingWaste(null);
      setClosingData({ finalWeight: 0, productionTime: 0, notes: '', stages: [] });
    } catch (error) {
      console.error(error);
      alert('Error al cerrar el control.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId || !formData.productName) {
      alert('Por favor, selecciona un producto.');
      return;
    }

    const calculatedAmount = (formData.initialWeight || 0) - (formData.finalWeight || 0);

    const newWaste: WasteEntry = {
      id: `waste_${Date.now()}`,
      date: formData.date || Date.now(),
      productId: formData.productId,
      productName: formData.productName,
      amount: calculatedAmount > 0 ? calculatedAmount : 0,
      unit: formData.unit || 'kg',
      reason: formData.reason as WasteReason,
      area: formData.area as ProductArea,
      ownerId: userId,
      status: formData.status as WasteStatus || 'pendiente',
      priority: formData.priority as any,
      productionTime: formData.productionTime,
      initialWeight: formData.initialWeight,
      finalWeight: formData.finalWeight,
      notes: formData.notes,
      categoryDetails: formData.categoryDetails,
    };

    try {
      await onSaveWaste(newWaste);
      setIsAdding(false);
      setFormData({
        date: Date.now(),
        amount: 0,
        unit: 'kg',
        reason: 'proceso_calor',
        area: 'helados',
        notes: '',
        productionTime: 0,
        priority: 'media',
        status: 'pendiente',
        initialWeight: 0,
        finalWeight: 0,
        categoryDetails: { containerType: '', shift: 'mañana', inclusionAmount: 0 }
      });
      setItemSearch('');
    } catch (error) {
      console.error(error);
      alert('Error al guardar el registro de merma.');
    }
  };

  const currentContainerOptions = useMemo(() => {
    const area = formData.area as string;
    if (area === 'helados') return CONTAINER_TYPES.helados;
    if (area === 'pasteleria') return CONTAINER_TYPES.pasteleria;
    return CONTAINER_TYPES.default;
  }, [formData.area]);

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="pane-title flex items-center gap-2">
            <Trash2 size={14} className="text-rose-400" />
            <span>Gestión de Costos Operativos</span>
          </div>
          <h2 className="text-4xl font-light italic font-serif">Mermas & Tiempos</h2>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="btn-primary flex items-center gap-3 px-6 py-3 shadow-lg shadow-rose-500/20"
        >
          <Plus size={20} />
          <span className="font-bold tracking-widest uppercase text-[11px]">Programar Control</span>
        </button>
      </header>

      {/* View Mode and Status Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-6 bg-white/5 p-4 rounded-[28px] border border-white/10">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('mermas')}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${
              viewMode === 'mermas' ? 'bg-white/10 text-white shadow-xl' : 'text-white/30 hover:text-white'
            }`}
          >
            <Trash2 size={14} />
            Mermas y Siembras
          </button>
          <button
            onClick={() => setViewMode('tiempos')}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${
              viewMode === 'tiempos' ? 'bg-white/10 text-white shadow-xl' : 'text-white/30 hover:text-white'
            }`}
          >
            <Clock size={14} />
            Control de Tiempos
          </button>
        </div>

        <div className="h-8 w-px bg-white/10 mx-2 hidden md:block" />

        <div className="flex gap-2 p-1 bg-black/20 rounded-xl">
          <button
            onClick={() => setActiveTab('pendientes')}
            className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'pendientes' ? 'bg-rose-500 text-white shadow-lg' : 'text-white/30 hover:text-white'
            }`}
          >
            Pendientes ({wastes.filter(w => w.status === 'pendiente').length})
          </button>
          <button
            onClick={() => setActiveTab('completados')}
            className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'completados' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white'
            }`}
          >
            Completados
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/5 border border-white/5 p-6 rounded-[24px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Trash2 size={40} />
          </div>
          <p className="text-[10px] uppercase font-bold text-white/40 tracking-[0.2em] mb-2">Total Registros</p>
          <p className="text-3xl font-light text-rose-400">{sortedWastes.length}</p>
        </div>
        <div className="bg-white/5 border border-white/5 p-6 rounded-[24px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Clock size={40} />
          </div>
          <p className="text-[10px] uppercase font-bold text-white/40 tracking-[0.2em] mb-2">Tiempo Total (Min)</p>
          <p className="text-3xl font-light text-blue-400">
            {sortedWastes.reduce((acc, curr) => acc + (curr.productionTime || 0), 0)}
          </p>
        </div>
        <div className="bg-white/5 border border-white/5 p-6 rounded-[24px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <AlertTriangle size={40} />
          </div>
          <p className="text-[10px] uppercase font-bold text-white/40 tracking-[0.2em] mb-2">Causa Principal</p>
          <p className="text-xl font-light text-amber-400 truncate">
            {sortedWastes.length > 0 
              ? (() => {
                  const counts = sortedWastes.reduce((acc, curr) => {
                    acc[curr.reason] = (acc[curr.reason] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);
                  const topReasonId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
                  return REASONS.find(r => r.id === topReasonId)?.label || 'Varios';
                })()
              : '-'
            }
          </p>
        </div>
        <div className="bg-white/5 border border-white/5 p-6 rounded-[24px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Layers size={40} />
          </div>
          <p className="text-[10px] uppercase font-bold text-white/40 tracking-[0.2em] mb-2">Área Impactada</p>
          <p className="text-xl font-light text-purple-400">
            {areaFilter === 'todos' ? (activeTab === 'pendientes' ? 'Pendientes' : 'Global') : AREAS.find(a => a.id === areaFilter)?.label}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-white/5 border border-white/10 p-6 rounded-[32px]">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
          <input
            type="text"
            placeholder="Buscar por producto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-rose-500/50 transition-all"
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
            <Filter size={16} className="text-white/40" />
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value as any)}
              className="bg-transparent border-none text-xs font-bold uppercase tracking-wider text-[var(--accent)] focus:ring-0 cursor-pointer"
            >
              <option value="todos">Motivo: Todos</option>
              {REASONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
            <Package size={16} className="text-white/40" />
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value as any)}
              className="bg-transparent border-none text-xs font-bold uppercase tracking-wider text-purple-400 focus:ring-0 cursor-pointer"
            >
              <option value="todos">Area: Todas</option>
              {AREAS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-8 py-5 text-[10px] uppercase font-black tracking-[0.2em] text-white/30">Prioridad / Fecha</th>
                <th className="px-8 py-5 text-[10px] uppercase font-black tracking-[0.2em] text-white/30">Producto / Proceso</th>
                {viewMode === 'mermas' ? (
                  <>
                    <th className="px-8 py-5 text-[10px] uppercase font-black tracking-[0.2em] text-white/30">Peso Inicial / Final</th>
                    <th className="px-8 py-5 text-[10px] uppercase font-black tracking-[0.2em] text-white/30">Merma / Siembra</th>
                  </>
                ) : (
                  <>
                    <th className="px-8 py-5 text-[10px] uppercase font-black tracking-[0.2em] text-white/30">Tiempo de Proceso</th>
                    <th className="px-8 py-5 text-[10px] uppercase font-black tracking-[0.2em] text-white/30">Eficiencia / Notas</th>
                  </>
                )}
                <th className="px-8 py-5 text-[10px] uppercase font-black tracking-[0.2em] text-white/30">Área / Motivo</th>
                <th className="px-8 py-5 text-[10px] uppercase font-black tracking-[0.2em] text-white/30 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence>
                {sortedWastes.map((waste) => (
                  <motion.tr
                    key={waste.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="group hover:bg-white/[0.02] transition-all"
                  >
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                        <div className={`text-[9px] uppercase font-black tracking-widest ${PRIORITIES.find(p => p.id === (waste.priority || 'media'))?.color}`}>
                          {PRIORITIES.find(p => p.id === (waste.priority || 'media'))?.label}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar size={12} className="text-white/20" />
                          <span className="text-xs font-medium text-white/40">{new Date(waste.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white group-hover:text-rose-400 transition-colors">
                          {waste.productName}
                        </span>
                        {waste.categoryDetails?.containerType && (
                          <span className="text-[9px] text-white/30 uppercase tracking-widest mt-1 font-black">
                            {waste.categoryDetails.containerType}
                          </span>
                        )}
                      </div>
                    </td>
                    {viewMode === 'mermas' ? (
                      <>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-white/60">Ini: {waste.initialWeight} {waste.unit}</span>
                            {waste.status === 'completado' ? (
                              <span className="text-xs text-white/60">Fin: {waste.finalWeight} {waste.unit}</span>
                            ) : (
                              <span className="text-[10px] text-amber-400 italic">Esperando cierre...</span>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1">
                            <span className={`text-sm font-mono px-3 py-1 rounded-lg border w-fit ${waste.status === 'completado' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-white/5 border-white/10 text-white/20'}`}>
                              {waste.status === 'completado' ? `${waste.amount} ${waste.unit}` : '--'}
                            </span>
                            {waste.categoryDetails?.inclusionAmount !== undefined && waste.categoryDetails.inclusionAmount > 0 && (
                              <span className="text-[10px] text-blue-400 uppercase font-black tracking-tighter">
                                Siembra: {waste.categoryDetails.inclusionAmount}g/kg
                              </span>
                            )}
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-xl ${waste.status === 'completado' ? 'bg-blue-500/10 text-blue-400' : 'bg-white/5 text-white/20'}`}>
                              <Clock size={16} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-mono font-bold">
                                {waste.status === 'completado' ? `${waste.productionTime} min` : 'Pendiente'}
                              </span>
                              {waste.stages && waste.stages.length > 0 && (
                                <span className="text-[9px] text-blue-400 font-black uppercase tracking-widest">
                                  {waste.stages.length} Etapas
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="max-w-[200px]">
                            {waste.stages && waste.stages.length > 0 ? (
                              <div className="space-y-1">
                                {waste.stages.slice(0, 2).map((s, idx) => (
                                  <div key={idx} className="flex justify-between text-[9px] text-white/40 border-b border-white/5 pb-1">
                                    <span className="truncate mr-2">{s.name}</span>
                                    <span>{s.timeMinutes}m</span>
                                  </div>
                                ))}
                                {waste.stages.length > 2 && (
                                  <span className="text-[8px] text-blue-400/60 uppercase font-bold italic">... y {waste.stages.length - 2} más</span>
                                )}
                              </div>
                            ) : (
                              <p className="text-[10px] text-white/40 italic line-clamp-2">
                                {waste.notes || 'Sin observaciones'}
                              </p>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-xs text-white/60">
                          {AREAS.find(a => a.id === waste.area)?.label}
                        </span>
                        <span className={`text-[9px] font-black uppercase tracking-widest mt-1 ${REASONS.find(r => r.id === waste.reason)?.color} w-fit px-2 rounded`}>
                          {REASONS.find(r => r.id === waste.reason)?.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        {waste.status === 'pendiente' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setClosingWaste(waste);
                              setClosingData({
                                finalWeight: 0,
                                productionTime: waste.productionTime || 0,
                                notes: waste.notes || '',
                                stages: []
                              });
                            }}
                            className="btn-primary py-2 px-4 text-[9px] tracking-widest flex items-center gap-2 group/btn"
                          >
                            <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                            CERRAR CONTROL
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (window.confirm('¿Eliminar este registro?')) {
                              onDeleteWaste(waste.id);
                            }
                          }}
                          className="p-2 text-white/20 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for adding new waste */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-[#121212] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-10 space-y-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <header className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-black tracking-[0.3em] text-rose-400">Programación de Control</p>
                    <h3 className="text-2xl font-light italic font-serif">Programar Nueva Prueba</h3>
                  </div>
                  <button onClick={() => setIsAdding(false)} className="p-2 text-white/40 hover:text-white transition-colors">
                    <X size={24} />
                  </button>
                </header>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Priority and Area */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Prioridad del Control</label>
                      <div className="flex gap-2">
                        {PRIORITIES.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, priority: p.id })}
                            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                              formData.priority === p.id 
                                ? 'bg-white/10 border-white/20 text-white shadow-lg' 
                                : 'bg-white/5 border-transparent text-white/20 hover:border-white/10'
                            }`}
                          >
                            {p.label.split(' ')[1]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Área / Sector</label>
                      <select
                        value={formData.area}
                        onChange={(e) => setFormData({ ...formData, area: e.target.value as ProductArea })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-rose-500/50 transition-all appearance-none"
                      >
                        {AREAS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Item Selection */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Producto a Controlar</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-4 text-white/20" size={18} />
                      <input
                        type="text"
                        placeholder="Buscar producto o receta..."
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-rose-500/50 transition-all"
                      />
                      {itemSearch && filteredItems.length > 0 && !formData.productId && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden z-10 shadow-2xl">
                          {filteredItems.map(item => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, productId: item.id, productName: item.name });
                                setItemSearch(item.name);
                              }}
                              className="w-full px-6 py-3 text-left text-sm hover:bg-white/5 flex items-center justify-between group"
                            >
                              <span>{item.name}</span>
                              <span className="text-[9px] uppercase tracking-widest font-bold opacity-30 group-hover:opacity-100 group-hover:text-rose-400">
                                {item.type === 'recipe' ? 'Receta' : 'Insumo'}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      {formData.productId && (
                        <div className="absolute right-4 top-4">
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, productId: undefined, productName: undefined });
                              setItemSearch('');
                            }}
                            className="bg-rose-500/20 text-rose-400 p-1 rounded-lg"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Weights and Process */}
                  <div className="grid grid-cols-2 gap-6 p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Peso Antes del Proceso (Kg)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={formData.initialWeight || ''}
                        onChange={(e) => setFormData({ ...formData, initialWeight: parseFloat(e.target.value) })}
                        placeholder="Ej: 10.500"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-rose-500/50 transition-all font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Motivo / Tipo de Proceso</label>
                      <select
                        value={formData.reason}
                        onChange={(e) => setFormData({ ...formData, reason: e.target.value as WasteReason })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-rose-500/50 transition-all appearance-none"
                      >
                        {REASONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Reason and Area */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Motivo Merma</label>
                      <select
                        value={formData.reason}
                        onChange={(e) => setFormData({ ...formData, reason: e.target.value as WasteReason })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-rose-500/50 transition-all appearance-none"
                      >
                        {REASONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Área / Sector</label>
                      <select
                        value={formData.area}
                        onChange={(e) => setFormData({ ...formData, area: e.target.value as ProductArea })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-rose-500/50 transition-all appearance-none"
                      >
                        {AREAS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Area Specific Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/[0.02] p-6 rounded-3xl border border-white/5">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Tipo de Contenedor / Formato</label>
                      <select
                        value={formData.categoryDetails?.containerType}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          categoryDetails: { ...formData.categoryDetails, containerType: e.target.value } 
                        })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-6 text-sm focus:outline-none focus:border-rose-500/50 transition-all appearance-none"
                      >
                        <option value="">Seleccionar...</option>
                        {currentContainerOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Turno de Trabajo</label>
                      <select
                        value={formData.categoryDetails?.shift}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          categoryDetails: { ...formData.categoryDetails, shift: e.target.value as any } 
                        })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-6 text-sm focus:outline-none focus:border-rose-500/50 transition-all appearance-none"
                      >
                        <option value="mañana">Mañana</option>
                        <option value="tarde">Tarde</option>
                        <option value="noche">Noche</option>
                      </select>
                    </div>
                    {formData.area === 'helados' && (
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] uppercase font-bold text-blue-400 ml-1">Cantidad de Siembra (Siembra g/kg)</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            value={formData.categoryDetails?.inclusionAmount || ''}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              categoryDetails: { ...formData.categoryDetails, inclusionAmount: parseFloat(e.target.value) } 
                            })}
                            placeholder="Ej: 150g de trozos por kg de helado"
                            className="w-full bg-blue-500/5 border border-blue-500/20 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-400/40 tracking-widest uppercase">g / kg</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Instrucciones o Notas de Control</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Ej: Medir merma tras cocción en horno o tras mantecado de helado..."
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-rose-500/50 transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full btn-primary py-5 rounded-[20px] flex items-center justify-center gap-3 group"
                  >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                    <span className="font-black uppercase tracking-[0.2em] text-xs">Programar Control Ciclo</span>
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal for closing a control */}
      <AnimatePresence>
        {closingWaste && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setClosingWaste(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-xl bg-[#121212] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleCompleteControl} className="p-10 space-y-8">
                <header className="space-y-1">
                  <div className="flex items-center gap-2 text-rose-400 text-[10px] font-black uppercase tracking-widest">
                    <History size={14} />
                    Finalizar Control Operativo
                  </div>
                  <h3 className="text-2xl font-light italic font-serif">Resultados de {closingWaste.productName}</h3>
                </header>

                <div className="grid grid-cols-2 gap-6 p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <div className="space-y-1">
                    <p className="text-[10px] text-white/40 uppercase font-black">Peso Inicial</p>
                    <p className="text-xl font-mono text-white/80">{closingWaste.initialWeight} {closingWaste.unit}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] text-white/40 uppercase font-black">Prioridad</p>
                    <p className={`text-xl font-black uppercase tracking-tighter ${PRIORITIES.find(p => p.id === closingWaste.priority)?.color}`}>
                      {closingWaste.priority}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  {viewMode === 'mermas' ? (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Peso Final / Resultante (Kg)</label>
                        <input
                          type="number"
                          step="0.001"
                          required
                          autoFocus
                          value={closingData.finalWeight || ''}
                          onChange={(e) => setClosingData({ ...closingData, finalWeight: parseFloat(e.target.value) })}
                          placeholder="Ej: 9.850"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-rose-500/50 transition-all font-mono"
                        />
                        {closingData.finalWeight > 0 && (
                          <p className="text-[10px] text-rose-400 font-bold ml-1">
                            Merma Calculada: {((closingWaste.initialWeight || 0) - closingData.finalWeight).toFixed(3)} {closingWaste.unit}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Tiempo Real de Proceso (Min)</label>
                        <input
                          type="number"
                          required
                          value={closingData.productionTime || ''}
                          onChange={(e) => setClosingData({ ...closingData, productionTime: parseInt(e.target.value) || 0 })}
                          placeholder="Ej: 30"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] uppercase font-bold text-blue-400">Desglose de Etapas de Producción</label>
                        <button
                          type="button"
                          onClick={() => setClosingData({
                            ...closingData,
                            stages: [...closingData.stages, { id: `stage_${Date.now()}`, name: '', timeMinutes: 0, observations: '', improvement: '' }]
                          })}
                          className="text-[10px] font-black uppercase text-blue-400 hover:text-blue-300 flex items-center gap-2"
                        >
                          <Plus size={12} />
                          Añadir Etapa
                        </button>
                      </div>

                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {closingData.stages.map((stage, index) => (
                          <motion.div
                            key={stage.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl space-y-4 relative group"
                          >
                            <button
                              type="button"
                              onClick={() => setClosingData({
                                ...closingData,
                                stages: closingData.stages.filter(s => s.id !== stage.id)
                              })}
                              className="absolute top-4 right-4 text-white/10 hover:text-rose-500 transition-colors"
                            >
                              <X size={16} />
                            </button>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="md:col-span-2 space-y-1">
                                <p className="text-[9px] uppercase font-black text-white/20">Nombre de la Etapa {index + 1}</p>
                                <input
                                  type="text"
                                  value={stage.name}
                                  onChange={(e) => {
                                    const newStages = [...closingData.stages];
                                    newStages[index].name = e.target.value;
                                    setClosingData({ ...closingData, stages: newStages });
                                  }}
                                  placeholder="Ej: Preparación, Horneado, Envasado..."
                                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-blue-500/50"
                                />
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] uppercase font-black text-white/20">Tiempo (Min)</p>
                                <input
                                  type="number"
                                  value={stage.timeMinutes || ''}
                                  onChange={(e) => {
                                    const newStages = [...closingData.stages];
                                    newStages[index].timeMinutes = parseInt(e.target.value) || 0;
                                    setClosingData({ ...closingData, stages: newStages });
                                  }}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-blue-500/50"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <p className="text-[9px] uppercase font-black text-white/20">Motivo de Demora / Observación</p>
                                <textarea
                                  value={stage.observations}
                                  onChange={(e) => {
                                    const newStages = [...closingData.stages];
                                    newStages[index].observations = e.target.value;
                                    setClosingData({ ...closingData, stages: newStages });
                                  }}
                                  rows={2}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-[11px] focus:outline-none focus:border-blue-500/50 resize-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] uppercase font-black text-blue-400/40">Propuesta de Mejora</p>
                                <textarea
                                  value={stage.improvement}
                                  onChange={(e) => {
                                    const newStages = [...closingData.stages];
                                    newStages[index].improvement = e.target.value;
                                    setClosingData({ ...closingData, stages: newStages });
                                  }}
                                  rows={2}
                                  className="w-full bg-blue-500/5 border border-blue-500/10 rounded-xl py-3 px-4 text-[11px] focus:outline-none focus:border-blue-500/50 resize-none"
                                />
                              </div>
                            </div>
                          </motion.div>
                        ))}
                        {closingData.stages.length === 0 && (
                          <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-[32px] text-white/20 text-[10px] uppercase font-black tracking-widest">
                            No hay etapas añadidas. Haz click en "Añadir Etapa" para comenzar el desglose.
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-end px-2">
                        <div className="text-right">
                          <p className="text-[9px] uppercase font-black text-white/20">Tiempo Total Calculado</p>
                          <p className="text-2xl font-mono text-blue-400">
                            {closingData.stages.reduce((acc, s) => acc + (s.timeMinutes || 0), 0)} min
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Observaciones Finales</label>
                    <textarea
                      value={closingData.notes}
                      onChange={(e) => setClosingData({ ...closingData, notes: e.target.value })}
                      placeholder="Indique cualquier anomalía detectada..."
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-rose-500/50 transition-all resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setClosingWaste(null)}
                    className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/5 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] btn-primary py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-500/20"
                  >
                    {viewMode === 'mermas' ? 'Confirmar y Guardar Merma' : 'Confirmar y Guardar Tiempos'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
