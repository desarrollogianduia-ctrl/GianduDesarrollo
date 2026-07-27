import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  FlaskConical, 
  FileDown, 
  Trash2, 
  Save, 
  Check,
  ChevronRight,
  ClipboardList,
  Beaker,
  History,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { Recipe, RecipeCategory, DevelopmentProject } from '../types';

interface TrialManagerProps {
  recipes: Recipe[];
  developments: DevelopmentProject[];
  onSaveTrial: (trial: Recipe) => Promise<void>;
  onDeleteTrial: (id: string) => Promise<void>;
}

export function TrialManager({ recipes, developments, onSaveTrial, onDeleteTrial }: TrialManagerProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTrial, setEditingTrial] = useState<Partial<Recipe> & { projectId?: string } | null>(null);

  const trials = useMemo(() => {
    return recipes.filter(r => r.isTrial).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [recipes]);

  const generateTrialCode = (baseName: string) => {
    const year = new Date().getFullYear();
    const existingForYear = trials.filter(t => t.trialCode?.includes(`PR-${year}`));
    const nextNumber = String(existingForYear.length + 1).padStart(3, '0');
    return `PR-${year}-${nextNumber}A`;
  };

  const handleCreateNew = () => {
    setEditingTrial({
      name: '',
      category: 'semielaborado',
      isTrial: true,
      trialVersion: 'A',
      ingredients: [],
      procedure: '',
      observations: '',
      decoration: '',
      trialQuantity: 1,
      createdAt: Date.now(),
      projectId: ''
    });
    setIsFormOpen(true);
  };

  const handleExportToExcel = (trial: Recipe) => {
    const wsData = [
      ['INFORME DE PRUEBA DE LABORATORIO', ''],
      ['CÓDIGO:', trial.trialCode || 'N/A'],
      ['FECHA:', new Date(trial.createdAt || Date.now()).toLocaleDateString()],
      ['PRODUCTO:', trial.name],
      ['VERSIÓN:', trial.trialVersion],
      ['CANTIDAD PRUEBA:', `${trial.trialQuantity} kg/unidades`],
      [''],
      ['INGREDIENTES', 'CANTIDAD', 'UNIDAD'],
      ...(trial.ingredients?.map(ing => [ing.note || 'Ingrediente', ing.amount, 'g']) || []),
      [''],
      ['PROCEDIMIENTO'],
      [trial.procedure || 'Sin procedimiento detallado'],
      [''],
      ['OBSERVACIONES'],
      [trial.observations || 'Sin observaciones'],
      [''],
      ['DECORACIÓN FINAL'],
      [trial.decoration || 'Sin detalles de decoración']
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Prueba');
    XLSX.writeFile(wb, `${trial.trialCode || 'Prueba'}_${trial.name}.xlsx`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/[0.03] p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/20 flex items-center justify-center border border-[var(--accent)]/30 shadow-lg shadow-[var(--accent)]/10">
            <FlaskConical className="text-[var(--accent)]" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">I+D Lab</h1>
            <p className="text-white/40 text-sm font-medium">Gestión de Pruebas y Nuevos Desarrollos</p>
          </div>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-3 px-8 py-4 bg-[var(--accent)] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl shadow-[var(--accent)]/20 active:scale-95 group"
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          Nueva Prueba
        </button>
      </div>

      {/* Trial List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trials.map(trial => (
          <motion.div
            key={trial.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-white/5 border border-white/10 rounded-[2rem] p-6 hover:border-[var(--accent)]/40 transition-all relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="px-3 py-1 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-full text-[10px] font-black text-[var(--accent)] uppercase tracking-widest">
                {trial.trialCode}
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleExportToExcel(trial)}
                  className="p-2 text-white/20 hover:text-[var(--accent)] transition-colors"
                >
                  <FileDown size={18} />
                </button>
                <button 
                  onClick={() => onDeleteTrial(trial.id)}
                  className="p-2 text-white/20 hover:text-rose-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[var(--accent)] transition-colors line-clamp-1">
              {trial.name}
            </h3>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="flex flex-col">
                <span className="text-[9px] text-white/30 uppercase font-bold tracking-widest">Versión</span>
                <span className="text-xs font-black text-white/80">{trial.trialVersion}</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[9px] text-white/30 uppercase font-bold tracking-widest">Ingredientes</span>
                <span className="text-xs font-black text-white/80">{trial.ingredients?.length || 0}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingTrial(trial);
                  setIsFormOpen(true);
                }}
                className="flex-1 py-3 bg-white/5 hover:bg-[var(--accent)]/10 border border-white/10 rounded-xl text-xs font-bold text-white/60 hover:text-[var(--accent)] transition-all flex items-center justify-center gap-2"
              >
                Ver Detalles <ChevronRight size={14} />
              </button>
              <button
                onClick={async () => {
                  if (window.confirm("¿Deseas convertir esta prueba en una Formulación Técnica oficial?")) {
                    const technicalRecipe: Recipe = {
                      ...trial,
                      id: `recipe_${Date.now()}`,
                      isTrial: false,
                      isTrialFormula: false,
                      status: 'finalizado',
                      createdAt: Date.now(),
                      updatedAt: Date.now()
                    };
                    await onSaveTrial(technicalRecipe);
                    alert("¡Prueba convertida con éxito! Ahora puedes verla en Formulación Técnica.");
                  }
                }}
                className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-emerald-500 transition-all flex items-center justify-center"
                title="Convertir a Formulación Técnica"
              >
                <Check size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Trial Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-5xl bg-[#0a0a0a] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[var(--accent)]/10 rounded-xl border border-[var(--accent)]/20">
                    <FlaskConical size={24} className="text-[var(--accent)]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight uppercase">
                      {editingTrial?.id ? 'Editar Prueba' : 'Nueva Prueba de Laboratorio'}
                    </h2>
                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">
                      {editingTrial?.trialCode || 'Asignación Automática'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-10 overflow-y-auto space-y-10 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Basic Info */}
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-widest font-black text-white/30 ml-1">Relación con Tabla de Desarrollo</label>
                      <select
                        value={editingTrial?.projectId || ''}
                        onChange={(e) => {
                          const proj = developments.find(p => p.id === e.target.value);
                          if (proj) {
                            setEditingTrial(prev => ({
                              ...prev,
                              projectId: proj.id,
                              name: proj.productName,
                              trialCode: proj.code,
                              trialVersion: proj.trialLetter,
                              category: proj.area === 'semielaborados' ? 'semielaborado' : 
                                       proj.area === 'pasteleria' ? 'pasteleria' :
                                       proj.area === 'chocolates' ? 'chocolateria' :
                                       proj.area === 'helados' ? 'helados' : 'sin_definir'
                            }));
                          } else {
                            setEditingTrial(prev => ({ ...prev, projectId: '' }));
                          }
                        }}
                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:border-[var(--accent)]/50 transition-colors appearance-none"
                      >
                        <option value="">-- Seleccionar Proyecto --</option>
                        {developments.map(p => (
                          <option key={p.id} value={p.id} className="bg-[#0a0a0a]">
                            [{p.code}] {p.productName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-widest font-black text-white/30 ml-1">Nombre del Producto</label>
                      <input
                        type="text"
                        value={editingTrial?.name || ''}
                        onChange={(e) => setEditingTrial(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:border-[var(--accent)]/50 transition-colors"
                        placeholder="Ej: Gelato de Pistacho Premium"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <label className="text-[10px] uppercase tracking-widest font-black text-white/30 ml-1">Categoría</label>
                        <select
                          value={editingTrial?.category || 'semielaborado'}
                          onChange={(e) => setEditingTrial(prev => ({ ...prev, category: e.target.value as RecipeCategory }))}
                          className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:border-[var(--accent)]/50 transition-colors appearance-none"
                        >
                          <option value="semielaborado">Semielaborado</option>
                          <option value="final">Producto Final</option>
                          <option value="pasteleria">Pastelería</option>
                          <option value="chocolateria">Chocolatería</option>
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] uppercase tracking-widest font-black text-white/30 ml-1">Cant. Prueba (kg)</label>
                        <input
                          type="number"
                          value={editingTrial?.trialQuantity || 0}
                          onChange={(e) => setEditingTrial(prev => ({ ...prev, trialQuantity: parseFloat(e.target.value) }))}
                          className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:border-[var(--accent)]/50 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Ingredients Section */}
                  <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-widest font-black text-white/30 ml-1">Ingredientes & Cantidades</label>
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3">
                      {(editingTrial?.ingredients || []).map((ing, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            type="text"
                            value={ing.note || ''}
                            onChange={(e) => {
                              const newIngs = [...(editingTrial?.ingredients || [])];
                              newIngs[idx].note = e.target.value;
                              setEditingTrial(prev => prev ? { ...prev, ingredients: newIngs } : null);
                            }}
                            placeholder="Ingrediente"
                            className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs"
                          />
                          <input
                            type="number"
                            value={ing.amount}
                            onChange={(e) => {
                              const newIngs = [...(editingTrial?.ingredients || [])];
                              newIngs[idx].amount = parseFloat(e.target.value);
                              setEditingTrial(prev => prev ? { ...prev, ingredients: newIngs } : null);
                            }}
                            className="w-20 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs"
                          />
                          <button
                            onClick={() => {
                              const newIngs = editingTrial?.ingredients?.filter((_, i) => i !== idx);
                              setEditingTrial(prev => prev ? { ...prev, ingredients: newIngs } : null);
                            }}
                            className="p-2 text-rose-500/50 hover:text-rose-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const newIngs = [...(editingTrial?.ingredients || []), { ingredientId: 'pending', amount: 0, note: '' }];
                          setEditingTrial(prev => prev ? { ...prev, ingredients: newIngs } : null);
                        }}
                        className="w-full py-2 bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-lg text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest hover:bg-[var(--accent)]/10 transition-all"
                      >
                        + Agregar Ingrediente
                      </button>
                    </div>
                  </div>
                </div>

                {/* Technical Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-3">
                    <h3 className="text-[10px] uppercase tracking-widest font-black text-[var(--accent)] flex items-center gap-2">
                      <ClipboardList size={14} /> Procedimiento
                    </h3>
                    <textarea
                      value={editingTrial?.procedure || ''}
                      onChange={(e) => setEditingTrial(prev => ({ ...prev, procedure: e.target.value }))}
                      className="w-full h-40 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:border-[var(--accent)]/50 transition-colors resize-none"
                      placeholder="Describir los pasos de elaboración..."
                    />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-[10px] uppercase tracking-widest font-black text-[var(--accent)] flex items-center gap-2">
                      <Info size={14} /> Observaciones
                    </h3>
                    <textarea
                      value={editingTrial?.observations || ''}
                      onChange={(e) => setEditingTrial(prev => ({ ...prev, observations: e.target.value }))}
                      className="w-full h-40 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:border-[var(--accent)]/50 transition-colors resize-none"
                      placeholder="Notas sobre sabor, textura, color..."
                    />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-[10px] uppercase tracking-widest font-black text-[var(--accent)] flex items-center gap-2">
                      <Layers size={14} /> Decoración Final
                    </h3>
                    <textarea
                      value={editingTrial?.decoration || ''}
                      onChange={(e) => setEditingTrial(prev => ({ ...prev, decoration: e.target.value }))}
                      className="w-full h-40 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:border-[var(--accent)]/50 transition-colors resize-none"
                      placeholder="Detalles sobre el acabado visual..."
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-white/5 bg-white/[0.02] flex justify-end gap-4">
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="px-8 py-4 bg-white/5 text-white/40 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!editingTrial?.name) return;
                    
                    const isNew = !editingTrial.id;
                    const trialCode = editingTrial.trialCode || generateTrialCode(editingTrial.name);
                    
                    const finalTrial: Recipe = {
                      id: editingTrial.id || `trial_${Date.now()}`,
                      name: editingTrial.name || '',
                      category: editingTrial.category || 'semielaborado',
                      type: editingTrial.category === 'final' ? 'final' : 'semielaborado',
                      ingredients: editingTrial.ingredients || [],
                      isTrial: true,
                      trialVersion: editingTrial.trialVersion || 'A',
                      trialCode,
                      projectId: editingTrial.projectId,
                      procedure: editingTrial.procedure,
                      observations: editingTrial.observations,
                      decoration: editingTrial.decoration,
                      trialQuantity: editingTrial.trialQuantity,
                      createdAt: editingTrial.createdAt || Date.now(),
                      updatedAt: Date.now(),
                      stock: editingTrial.stock || 0,
                      status: 'formulacion',
                      servingSize: 0,
                      portionsPerPackage: 0,
                      totalYield: 0,
                      finalYield: 0
                    };

                    await onSaveTrial(finalTrial);
                    setIsFormOpen(false);
                  } }
                  className="px-10 py-4 bg-[var(--accent)] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl shadow-[var(--accent)]/20 active:scale-95"
                >
                  {editingTrial?.id ? 'Actualizar' : 'Guardar Prueba'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
