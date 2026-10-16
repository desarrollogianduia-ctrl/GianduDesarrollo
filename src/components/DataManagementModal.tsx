import React, { useState, ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Download, 
  Upload, 
  FileJson, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  Database,
  Info,
  BookOpen,
  Sparkles,
  Loader2,
  Layers
} from "lucide-react";
import * as XLSX from "xlsx";
import { Ingredient, Recipe, DevelopmentProject } from "../types";

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredients: Ingredient[];
  recipes: Recipe[];
  developments: DevelopmentProject[];
  onImport: (data: {
    ingredients?: Ingredient[];
    recipes?: Recipe[];
    developments?: DevelopmentProject[];
  }) => Promise<void>;
  isImporting: boolean;
}

interface ImportPreview {
  ingredients: number;
  recipes: number;
  developments: number;
  source: string;
  type: "json" | "excel";
  data: {
    ingredients?: Ingredient[];
    recipes?: Recipe[];
    developments?: DevelopmentProject[];
  };
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({
  isOpen,
  onClose,
  ingredients,
  recipes,
  developments,
  onImport,
  isImporting
}) => {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExportJSON = () => {
    const data = {
      version: "1.1",
      timestamp: Date.now(),
      ingredients,
      recipes,
      developments,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gianduia-lab-export-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Ingredients Sheet
    const wsIngredients = XLSX.utils.json_to_sheet(ingredients.map(ing => ({
      ID: ing.id,
      Nombre: ing.name,
      Marca: ing.brand || "",
      RNPA: ing.rnpa || "",
      Categoria: ing.category,
      GrupoFuncional: ing.functionalGroup || "",
      Energia_kcal: ing.energy,
      Carbohidratos_g: ing.carbs,
      AzucaresTotales_g: ing.totalSugars !== undefined ? ing.totalSugars : ing.sugars,
      AzucaresAnadidos_g: ing.addedSugars || 0,
      Azucares_g: ing.totalSugars !== undefined ? ing.totalSugars : ing.sugars,
      Proteinas_g: ing.proteins,
      GrasasTotales_g: ing.totalFats,
      GrasasSaturadas_g: ing.saturatedFats,
      Fibra_g: ing.fiber,
      Sodio_mg: ing.sodium,
      SinTACC: ing.isGlutenFree ? "SI" : "NO"
    })));
    XLSX.utils.book_append_sheet(wb, wsIngredients, "Ingredientes");

    // Recipes Sheet
    const wsRecipes = XLSX.utils.json_to_sheet(recipes.map(r => ({
      ID: r.id,
      Nombre: r.name,
      Tipo: r.type,
      Estado: r.status,
      RindeFinal_g: r.finalYield,
      Porciones: r.portionsPerPackage,
      CodigoTrial: r.trialCode || ""
    })));
    XLSX.utils.book_append_sheet(wb, wsRecipes, "Recetas");

    // Developments Sheet
    const wsDevs = XLSX.utils.json_to_sheet(developments.map(d => ({
      ID: d.id,
      Codigo: d.code,
      Producto: d.productName,
      Area: d.area,
      Prioridad: d.priority,
      Estado: d.status,
      FechaCreacion: new Date(d.createdAt).toLocaleDateString()
    })));
    XLSX.utils.book_append_sheet(wb, wsDevs, "Desarrollos");

    XLSX.writeFile(wb, `gianduia-lab-export-${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  // Normalizes raw recipes from any format and extracts/links raw material ingredients
  const normalizeImportedRecipes = (rawRecipes: any[], existingIngs: Ingredient[]): { recipes: Recipe[], newIngredients: Ingredient[] } => {
    const ingMap = new Map<string, string>();
    existingIngs.forEach(ing => {
      if (ing.name) ingMap.set(ing.name.toLowerCase().trim(), ing.id);
    });

    const createdIngredients: Ingredient[] = [];

    const processedRecipes: Recipe[] = rawRecipes.map((r: any) => {
      const rawIngs = Array.isArray(r.ingredients) ? r.ingredients : [];
      const recipeIngredients = rawIngs.map((ingItem: any) => {
        let ingId = ingItem.ingredientId;
        if (!ingId && ingItem.name) {
          const lowerName = String(ingItem.name).toLowerCase().trim();
          if (ingMap.has(lowerName)) {
            ingId = ingMap.get(lowerName)!;
          } else {
            ingId = `ing_${Math.random().toString(36).substring(2, 9)}`;
            const newIng: Ingredient = {
              id: ingId,
              name: String(ingItem.name).trim(),
              energy: 0,
              energyKJ: 0,
              carbs: 0,
              sugars: 0,
              totalSugars: 0,
              addedSugars: 0,
              proteins: 0,
              totalFats: 0,
              saturatedFats: 0,
              transFats: 0,
              fiber: 0,
              sodium: 0,
              category: "especifico",
              isGlutenFree: false
            };
            createdIngredients.push(newIng);
            ingMap.set(lowerName, ingId);
          }
        }
        return {
          ingredientId: ingId || `ing_${Math.random().toString(36).substring(2, 9)}`,
          amount: Number(ingItem.amount) || 0,
          note: ingItem.unit || ingItem.note || "",
          isRecipe: ingItem.isRecipe || false
        };
      });

      const totalWeight = recipeIngredients.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
      const finalWeight = Number(r.finalYield) || (totalWeight > 0 ? totalWeight : 1000);

      return {
        id: r.id || `rec_${Math.random().toString(36).substring(2, 9)}`,
        name: r.name || "Receta sin nombre",
        description: r.description || "",
        type: (r.type || "semielaborado").toLowerCase() as any,
        category: (r.category || "semielaborado").toLowerCase() as any,
        ingredients: recipeIngredients,
        servingSize: Number(r.servingSize) || 100,
        totalYield: Number(r.totalYield) || totalWeight,
        finalYield: finalWeight,
        portionsPerPackage: Number(r.portionsPerPackage) || 1,
        status: (r.status || "formulacion") as any,
        ownerId: r.ownerId || "gianduia_system",
        createdAt: Number(r.createdAt) || Date.now(),
        updatedAt: Date.now()
      };
    });

    return { recipes: processedRecipes, newIngredients: createdIngredients };
  };

  const handleLoadGianduiaLibrary = async () => {
    setIsLoadingLibrary(true);
    setError(null);
    try {
      const res = await fetch("/api/recipes/library");
      if (!res.ok) throw new Error("No se pudo obtener el recetario desde el servidor");
      const data = await res.json();

      if (!Array.isArray(data.recipes) || data.recipes.length === 0) {
        throw new Error("No se encontraron recetas en los lotes técnicos");
      }

      const { recipes: normRecipes, newIngredients: normIngs } = normalizeImportedRecipes(data.recipes, ingredients);

      setPreview({
        ingredients: normIngs.length,
        recipes: normRecipes.length,
        developments: 0,
        source: `Catálogo Oficial Gianduia (${data.totalFiles} lotes / ${normRecipes.length} recetas)`,
        type: "json",
        data: {
          ingredients: normIngs,
          recipes: normRecipes,
          developments: []
        }
      });
    } catch (err: any) {
      console.error("Gianduia Library error:", err);
      setError("Error al cargar el catálogo de Gianduia: " + (err.message || String(err)));
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setError(null);
    setPreview(null);

    try {
      const allNewIngredients: Ingredient[] = [];
      const allRecipes: Recipe[] = [];
      const allDevs: DevelopmentProject[] = [];
      let sourceName = fileList.length === 1 ? fileList[0].name : `${fileList.length} archivos seleccionados`;
      let fileType: "json" | "excel" = "json";

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const fileName = file.name;
        const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

        if (isExcel) {
          fileType = "excel";
          const buffer = await file.arrayBuffer();
          const data = new Uint8Array(buffer);
          const workbook = XLSX.read(data, { type: "array" });

          workbook.SheetNames.forEach(name => {
            const sheet = workbook.Sheets[name];
            const rows: any[] = XLSX.utils.sheet_to_json(sheet);

            if (name.toLowerCase().includes("ingredient") || name.toLowerCase().includes("insumo")) {
              rows.forEach((row: any) => {
                const c = Number(row.Carbohidratos_g || row.carbs || 0);
                const p = Number(row.Proteinas_g || row.proteins || 0);
                const f = Number(row.GrasasTotales_g || row.totalFats || 0);
                const atwater = (c * 4) + (p * 4) + (f * 9);
                const energyVal = Number(row.Energia_kcal || row.energy || atwater);
                const totSug = Number(row.AzucaresTotales_g ?? row.Azucares_g ?? row.totalSugars ?? row.sugars ?? 0);
                const addSug = Number(row.AzucaresAnadidos_g ?? row.addedSugars ?? 0);

                allNewIngredients.push({
                  id: row.ID || row.id || `ing_${Math.random().toString(36).substring(2, 9)}`,
                  name: row.Nombre || row.name || row.Name || "Sin nombre",
                  energy: energyVal,
                  energyKJ: Number(row.Energia_kJ || row.energyKJ || Math.round(energyVal * 4.184)),
                  carbs: c,
                  sugars: totSug,
                  totalSugars: totSug,
                  addedSugars: addSug,
                  proteins: p,
                  totalFats: f,
                  saturatedFats: Number(row.GrasasSaturadas_g || row.saturatedFats || 0),
                  transFats: Number(row.GrasasTrans_g || row.transFats || 0),
                  fiber: Number(row.Fibra_g || row.fiber || 0),
                  sodium: Number(row.Sodio_mg || row.sodium || 0),
                  category: row.Categoria || row.category || "generico",
                  isGlutenFree: row.SinTACC === "SI" || row.isGlutenFree === true
                });
              });
            } else if (name.toLowerCase().includes("receta") || name.toLowerCase().includes("recipe")) {
              rows.forEach((row: any) => {
                allRecipes.push({
                  id: row.ID || row.id || `rec_${Math.random().toString(36).substring(2, 9)}`,
                  name: row.Nombre || row.name || row.Name || "Sin nombre",
                  type: (row.Tipo || row.type || "semielaborado") as any,
                  category: (row.Categoria || row.category || "semielaborado") as any,
                  status: (row.Estado || row.status || "formulacion") as any,
                  finalYield: Number(row.RindeFinal_g || row.finalYield || 1000),
                  totalYield: Number(row.RindeFinal_g || row.finalYield || 1000),
                  servingSize: 100,
                  portionsPerPackage: Number(row.Porciones || row.portionsPerPackage || 1),
                  ingredients: []
                });
              });
            }
          });
        } else {
          // JSON
          const text = await file.text();
          const parsed = JSON.parse(text);

          if (Array.isArray(parsed)) {
            const first = parsed[0] || {};
            if (first.ingredients || first.finalYield || first.servings || first.category) {
              const { recipes: normRecipes, newIngredients: normIngs } = normalizeImportedRecipes(parsed, [...ingredients, ...allNewIngredients]);
              allRecipes.push(...normRecipes);
              allNewIngredients.push(...normIngs);
            } else if (first.energy !== undefined || first.carbs !== undefined || first.proteins !== undefined) {
              allNewIngredients.push(...parsed);
            } else if (first.productName !== undefined) {
              allDevs.push(...parsed);
            }
          } else if (typeof parsed === "object" && parsed !== null) {
            if (Array.isArray(parsed.ingredients)) {
              allNewIngredients.push(...parsed.ingredients);
            }
            if (Array.isArray(parsed.recipes)) {
              const { recipes: normRecipes, newIngredients: normIngs } = normalizeImportedRecipes(parsed.recipes, [...ingredients, ...allNewIngredients]);
              allRecipes.push(...normRecipes);
              allNewIngredients.push(...normIngs);
            }
            if (Array.isArray(parsed.developments)) {
              allDevs.push(...parsed.developments);
            }
          }
        }
      }

      setPreview({
        ingredients: allNewIngredients.length,
        recipes: allRecipes.length,
        developments: allDevs.length,
        source: sourceName,
        type: fileType,
        data: {
          ingredients: allNewIngredients,
          recipes: allRecipes,
          developments: allDevs
        }
      });
    } catch (err: any) {
      console.error("Import processing error:", err);
      setError("Error al procesar el/los archivo(s): " + (err.message || String(err)));
    }

    e.target.value = "";
  };

  const handleConfirmImport = async () => {
    if (!preview) return;
    await onImport(preview.data);
    setPreview(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--border)]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[var(--accent)]/10 rounded-2xl flex items-center justify-center text-[var(--accent)]">
                  <Database size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-wider">
                    Gestión de Datos
                  </h2>
                  <p className="text-xs text-[var(--text-s)] font-bold uppercase tracking-widest opacity-50">
                    Importar / Exportar Información
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full transition-colors text-[var(--text-s)] hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8">
              {!preview ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Export Section */}
                  <div className="space-y-6">
                    <h3 className="text-sm font-black text-white uppercase tracking-[2px] flex items-center gap-2">
                      <Download size={16} className="text-emerald-400" />
                      Exportar
                    </h3>
                    <div className="space-y-4">
                      <button
                        onClick={handleExportJSON}
                        className="w-full flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-amber-400/10 rounded-xl text-amber-400">
                            <FileJson size={24} />
                          </div>
                          <div className="text-left">
                            <span className="block text-sm font-bold text-white uppercase tracking-wider">JSON</span>
                            <span className="block text-[10px] text-[var(--text-s)] uppercase tracking-widest">Backup Completo</span>
                          </div>
                        </div>
                        <ArrowRight size={18} className="text-white/20 group-hover:text-amber-400 transition-colors" />
                      </button>

                      <button
                        onClick={handleExportExcel}
                        className="w-full flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-emerald-400/10 rounded-xl text-emerald-400">
                            <FileSpreadsheet size={24} />
                          </div>
                          <div className="text-left">
                            <span className="block text-sm font-bold text-white uppercase tracking-wider">Excel</span>
                            <span className="block text-[10px] text-[var(--text-s)] uppercase tracking-widest">Lectura / Análisis</span>
                          </div>
                        </div>
                        <ArrowRight size={18} className="text-white/20 group-hover:text-emerald-400 transition-colors" />
                      </button>
                    </div>
                  </div>

                  {/* Import Section */}
                  <div className="space-y-6">
                    <h3 className="text-sm font-black text-white uppercase tracking-[2px] flex items-center gap-2">
                      <Upload size={16} className="text-rose-400" />
                      Importar
                    </h3>
                    <div className="relative group">
                      <input
                        type="file"
                        multiple
                        accept=".json,.xlsx,.xls"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="p-8 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-4 bg-white/[0.02] group-hover:bg-white/[0.05] group-hover:border-[var(--accent)] transition-all">
                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-[var(--text-s)] group-hover:text-[var(--accent)] group-hover:scale-110 transition-all">
                          <Upload size={24} />
                        </div>
                        <div className="text-center">
                          <span className="block text-xs font-bold text-white uppercase tracking-widest mb-1">Subir Archivo(s)</span>
                          <span className="block text-[9px] text-[var(--text-s)] uppercase tracking-widest">JSON (individual o múltiples) o Excel</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-1">
                      <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-white/5"></div>
                        <span className="flex-shrink mx-3 text-[9px] font-black uppercase tracking-[2px] text-white/30">O catálogo del sistema</span>
                        <div className="flex-grow border-t border-white/5"></div>
                      </div>
                      <button
                        type="button"
                        onClick={handleLoadGianduiaLibrary}
                        disabled={isLoadingLibrary}
                        className="w-full mt-2 p-4 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 hover:from-amber-500/20 hover:via-rose-500/20 hover:to-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 rounded-2xl flex items-center justify-between transition-all group"
                      >
                        <div className="flex items-center gap-3 text-left">
                          <div className="p-2.5 bg-amber-400/20 text-amber-400 rounded-xl group-hover:scale-110 transition-transform">
                            {isLoadingLibrary ? <Loader2 size={18} className="animate-spin" /> : <BookOpen size={18} />}
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-white uppercase tracking-wider">
                              Catálogo Histórico Gianduia
                            </span>
                            <span className="block text-[9px] text-white/50 tracking-wider">
                              256 Recetas Técnicas (27 Lotes Organizados)
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-400 group-hover:translate-x-1 transition-transform">
                          <span>{isLoadingLibrary ? "Cargando..." : "Cargar"}</span>
                          <ArrowRight size={14} />
                        </div>
                      </button>
                    </div>

                    {error && (
                      <div className="flex items-start gap-2 p-3 bg-rose-400/10 border border-rose-400/20 rounded-xl">
                        <AlertTriangle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest">
                          {error}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Import Preview */
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-white uppercase tracking-[2px] flex items-center gap-2">
                      <Info size={16} className="text-amber-400" />
                      Vista Previa de Importación
                    </h3>
                    <button 
                      onClick={() => setPreview(null)}
                      className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest hover:underline"
                    >
                      Cambiar Archivo
                    </button>
                  </div>

                  <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                    <div className="flex items-center justify-between pb-4 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        {preview.type === "json" ? <FileJson className="text-amber-400" size={20} /> : <FileSpreadsheet className="text-emerald-400" size={20} />}
                        <span className="text-xs font-bold text-white truncate max-w-[200px]">{preview.source}</span>
                      </div>
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{preview.type}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-white/5 rounded-xl text-center border border-white/5">
                        <span className="block text-[8px] text-[var(--text-s)] font-black uppercase tracking-[2px] mb-2 opacity-50">Ingredientes</span>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-sm font-bold text-white/40">{ingredients.length}</span>
                          <ArrowRight size={10} className="text-white/20" />
                          <span className="text-2xl font-black text-white">{preview.ingredients}</span>
                        </div>
                      </div>
                      <div className="p-4 bg-white/5 rounded-xl text-center border border-white/5">
                        <span className="block text-[8px] text-[var(--text-s)] font-black uppercase tracking-[2px] mb-2 opacity-50">Recetas</span>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-sm font-bold text-white/40">{recipes.length}</span>
                          <ArrowRight size={10} className="text-white/20" />
                          <span className="text-2xl font-black text-white">{preview.recipes}</span>
                        </div>
                      </div>
                      <div className="p-4 bg-white/5 rounded-xl text-center border border-white/5">
                        <span className="block text-[8px] text-[var(--text-s)] font-black uppercase tracking-[2px] mb-2 opacity-50">Desarrollos</span>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-sm font-bold text-white/40">{developments.length}</span>
                          <ArrowRight size={10} className="text-white/20" />
                          <span className="text-2xl font-black text-white">{preview.developments}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-amber-400/5 rounded-xl border border-amber-400/10">
                      <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest leading-relaxed">
                        Los datos se agregarán a tu base de datos actual. Si existen IDs duplicados, los registros locales o en la nube serán actualizados con la información del archivo.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmImport}
                    disabled={isImporting}
                    className={`w-full py-5 bg-[var(--accent)] text-white rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all ${isImporting ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02] active:scale-95 shadow-[var(--accent)]/30"}`}
                  >
                    {isImporting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 size={20} />
                        <span className="font-bold uppercase tracking-[2px] text-sm">Confirmar Importación</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-4 bg-white/[0.02] border-t border-[var(--border)] flex justify-between items-center">
              <p className="text-[9px] text-[var(--text-s)] font-bold uppercase tracking-widest opacity-30">
                Gianduia Lab Data Engine v1.1
              </p>
              {!preview && (
                <button
                  onClick={onClose}
                  className="text-[10px] font-bold text-white hover:text-[var(--accent)] uppercase tracking-widest transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
