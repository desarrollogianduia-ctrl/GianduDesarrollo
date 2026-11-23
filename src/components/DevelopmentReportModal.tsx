import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Check,
  Download,
  FileText,
  Loader2,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import {
  DevelopmentCategoryType,
  DevelopmentProject,
  Ingredient,
  Recipe,
} from '../types';
import {
  buildDevelopmentReportSummary,
  DEVELOPMENT_TYPE_OPTIONS,
  DevelopmentReportOptions,
  DossierDraft,
  extractInitialDossierDraft,
  formatIsoDateShort,
  formatMinutesReadable,
  generateDevelopmentPdf,
  getSiblingTrialsForProject,
} from '../utils/developmentReportPdf';

interface DevelopmentReportModalProps {
  project: DevelopmentProject;
  allDevelopments: DevelopmentProject[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  onClose: () => void;
  onSaveDossier: (
    trialsToUpdate: DevelopmentProject[],
    draft: DossierDraft
  ) => Promise<void>;
}

export const DevelopmentReportModal: React.FC<DevelopmentReportModalProps> = ({
  project,
  allDevelopments,
  recipes,
  ingredients,
  onClose,
  onSaveDossier,
}) => {
  const siblings = useMemo(
    () => getSiblingTrialsForProject(project, allDevelopments),
    [project, allDevelopments]
  );

  const [draft, setDraft] = useState<DossierDraft>(() =>
    extractInitialDossierDraft(project, siblings)
  );

  const [options, setOptions] = useState<DevelopmentReportOptions>({
    includeRecipes: true,
    includeSensory: true,
    includeProdTrials: true,
    includeTasks: true,
    deduplicateInheritedNotes: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const updateDraft = <K extends keyof DossierDraft>(
    key: K,
    value: DossierDraft[K]
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
    setSaveSuccess(false);
  };

  const reportData = useMemo(
    () =>
      buildDevelopmentReportSummary(
        project,
        siblings,
        draft,
        recipes,
        ingredients,
        options
      ),
    [project, siblings, draft, recipes, ingredients, options]
  );

  const completenessCount = useMemo(() => {
    const checks = [
      Boolean(draft.developmentType),
      Boolean(draft.dossierReason.trim()),
      Boolean(draft.dossierProblem.trim()),
      Boolean(draft.dossierSolution.trim()),
      Boolean(draft.dossierConclusion.trim()),
    ];
    return checks.filter(Boolean).length;
  }, [draft]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveDossier(siblings, draft);
      setIsDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (isDirty) {
      setIsSaving(true);
      try {
        await onSaveDossier(siblings, draft);
        setIsDirty(false);
      } finally {
        setIsSaving(false);
      }
    }
    generateDevelopmentPdf(reportData, options);
  };

  const handlePrefillFromNotes = () => {
    const firstNotes = siblings.find((t) => t.notes?.trim())?.notes?.trim() || '';
    const lastNotes =
      [...siblings].reverse().find((t) => t.notes?.trim())?.notes?.trim() || '';
    const prodObs = siblings
      .map((t) =>
        t.prodTrialNotes?.trim()
          ? `Prueba ${t.trialLetter || 'A'}: ${t.prodTrialNotes.trim()}`
          : null
      )
      .filter(Boolean)
      .join('\n');

    setDraft((prev) => ({
      ...prev,
      dossierReason:
        prev.dossierReason.trim() ||
        `Desarrollo e iteración técnica de ${reportData.productName} para el sector ${reportData.sectorLabel}.`,
      dossierProblem:
        prev.dossierProblem.trim() ||
        (firstNotes
          ? firstNotes.split('\n')[0].slice(0, 320)
          : ''),
      dossierSolution:
        prev.dossierSolution.trim() ||
        (prodObs || lastNotes.slice(0, 420)),
    }));
    setIsDirty(true);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[120] flex items-center justify-center p-3 sm:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="bg-[var(--surface)] border border-[var(--border)] w-full max-w-[1380px] h-[92vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Top Modal Bar */}
        <div className="px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 bg-[#121212] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] shrink-0">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 text-xs text-white/50 font-mono">
                <span>{reportData.baseCode}</span>
                <span aria-hidden="true">·</span>
                <span>{reportData.sectorLabel}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {reportData.trialCount}{' '}
                  {reportData.trialCount === 1 ? 'prueba' : 'pruebas'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-medium text-white truncate">
                Informe Técnico de Desarrollo: {reportData.productName}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-white/15 bg-white/5 hover:bg-white/10 text-white transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : saveSuccess ? (
                <Check size={14} className="text-emerald-400" />
              ) : (
                <Save size={14} />
              )}
              <span>{saveSuccess ? 'Ficha Guardada' : 'Guardar Ficha'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)] hover:brightness-110 text-white transition-all flex items-center gap-2 whitespace-nowrap shrink-0 shadow-lg shadow-[var(--accent)]/20 disabled:opacity-50"
            >
              <Download size={14} />
              <span>Descargar PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              title="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main 2-Column Workspace */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12">
          {/* Left Pane: Structured Dossier Form */}
          <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-white/10 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-[#141414]">
            {/* Completeness bar & auto summary */}
            <div className="space-y-3 pb-5 border-b border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white/80">
                  Ficha Estandarizada del Informe
                </span>
                <span className="text-xs font-mono tabular-nums text-white/50">
                  {completenessCount} / 5 completos
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-300"
                  style={{ width: `${(completenessCount / 5) * 100}%` }}
                />
              </div>

              {/* Automatic metadata readout */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 text-xs">
                <div>
                  <span className="text-white/40 block text-[11px]">Código y Pruebas</span>
                  <span className="font-mono text-white tabular-nums">
                    {reportData.baseCode} · {reportData.trialCount} ({reportData.trialLettersSummary})
                  </span>
                </div>
                <div>
                  <span className="text-white/40 block text-[11px]">Sector y Prioridad</span>
                  <span className="text-white">
                    {reportData.sectorLabel} · {reportData.priorityLabel}
                  </span>
                </div>
                <div>
                  <span className="text-white/40 block text-[11px]">Tiempo Transcurrido</span>
                  <span className="font-mono text-white tabular-nums">
                    {reportData.elapsedDaysLabel} ({reportData.startedAtStr})
                  </span>
                </div>
                <div>
                  <span className="text-white/40 block text-[11px]">Tiempo Estimado</span>
                  <span className="text-white">{reportData.estimatedTime}</span>
                </div>
              </div>
            </div>

            {/* 01. Classification */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-white">
                01. Clasificación del Desarrollo
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-white/60 block">
                    Tipo de Desarrollo
                  </label>
                  <select
                    value={draft.developmentType}
                    onChange={(e) =>
                      updateDraft(
                        'developmentType',
                        e.target.value as DevelopmentCategoryType
                      )
                    }
                    className="w-full bg-[var(--bg)] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[var(--accent)]"
                  >
                    {DEVELOPMENT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} className="bg-[#121212]">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-white/60 block">
                    Solicitante / Responsable
                  </label>
                  <input
                    type="text"
                    value={draft.dossierRequester}
                    onChange={(e) => updateDraft('dossierRequester', e.target.value)}
                    placeholder="Ej: Producción / Comercial / I+D"
                    className="w-full bg-[var(--bg)] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[var(--accent)] placeholder:text-white/25"
                  />
                </div>
              </div>

              {draft.developmentType === 'otro' && (
                <div className="space-y-1.5">
                  <label className="text-xs text-white/60 block">
                    Especificar Tipo
                  </label>
                  <input
                    type="text"
                    value={draft.developmentTypeCustom}
                    onChange={(e) =>
                      updateDraft('developmentTypeCustom', e.target.value)
                    }
                    placeholder="Ej: Ajuste estacional o validación de empaque"
                    className="w-full bg-[var(--bg)] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[var(--accent)]"
                  />
                </div>
              )}
            </div>

            {/* 02. Structured Narrative Fields */}
            <div className="space-y-4 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold text-white">
                  02. Contexto y Explicación Técnica
                </h4>
                <button
                  type="button"
                  onClick={handlePrefillFromNotes}
                  className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-1 whitespace-nowrap shrink-0"
                  title="Completa campos vacíos usando los datos actuales del desarrollo"
                >
                  <Sparkles size={12} />
                  <span>Pre-cargar desde notas</span>
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-white/70 block font-medium">
                  Por qué se hizo (Motivo / Objetivo)
                </label>
                <textarea
                  rows={3}
                  value={draft.dossierReason}
                  onChange={(e) => updateDraft('dossierReason', e.target.value)}
                  placeholder="Ej: Se solicitó desarrollar una nueva línea de relleno con menor actividad de agua para extender la vida útil en vitrina..."
                  className="w-full bg-[var(--bg)] border border-white/15 rounded-xl p-3 text-xs leading-relaxed text-white outline-none focus:border-[var(--accent)] resize-y placeholder:text-white/25"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-white/70 block font-medium">
                  Cuál era el problema o desafío inicial
                </label>
                <textarea
                  rows={3}
                  value={draft.dossierProblem}
                  onChange={(e) => updateDraft('dossierProblem', e.target.value)}
                  placeholder="Ej: La fórmula anterior presentaba cristalización de azúcares a los 10 días y desprendimiento en cámara de frío..."
                  className="w-full bg-[var(--bg)] border border-white/15 rounded-xl p-3 text-xs leading-relaxed text-white outline-none focus:border-[var(--accent)] resize-y placeholder:text-white/25"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-white/70 block font-medium">
                  Qué se ajustó y evolución de las pruebas
                </label>
                <textarea
                  rows={3}
                  value={draft.dossierSolution}
                  onChange={(e) => updateDraft('dossierSolution', e.target.value)}
                  placeholder="Ej: En la Prueba A se sustituyó parte de sacarosa por glucosa DE40; en la Prueba B se ajustó porcentaje de grasa láctea y temperatura de sembrado..."
                  className="w-full bg-[var(--bg)] border border-white/15 rounded-xl p-3 text-xs leading-relaxed text-white outline-none focus:border-[var(--accent)] resize-y placeholder:text-white/25"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-white/70 block font-medium">
                  Conclusión y resolución final
                </label>
                <textarea
                  rows={3}
                  value={draft.dossierConclusion}
                  onChange={(e) => updateDraft('dossierConclusion', e.target.value)}
                  placeholder="Ej: Se aprueba la versión B por textura y estabilidad térmica. Queda habilitada para formulación técnica y primera corrida en planta."
                  className="w-full bg-[var(--bg)] border border-white/15 rounded-xl p-3 text-xs leading-relaxed text-white outline-none focus:border-[var(--accent)] resize-y placeholder:text-white/25"
                />
              </div>
            </div>

            {/* 03. PDF Content Options */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <h4 className="text-xs font-semibold text-white">
                03. Datos Recopilados en el PDF
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {[
                  {
                    key: 'includeRecipes' as const,
                    label: 'Incluir recetas / ingredientes y % de cada prueba',
                  },
                  {
                    key: 'includeSensory' as const,
                    label: 'Incluir evaluación sensorial (temp., textura, sabor, dureza)',
                  },
                  {
                    key: 'includeProdTrials' as const,
                    label: 'Incluir ensayos productivos (fecha, equipos y horarios)',
                  },
                  {
                    key: 'includeTasks' as const,
                    label: 'Incluir tareas de seguimiento y cortes de tiempo',
                  },
                  {
                    key: 'deduplicateInheritedNotes' as const,
                    label: 'Evitar repetir texto de notas heredado entre pruebas',
                  },
                ].map((opt) => (
                  <label
                    key={opt.key}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 cursor-pointer text-xs text-white/80"
                  >
                    <input
                      type="checkbox"
                      checked={options[opt.key]}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          [opt.key]: e.target.checked,
                        }))
                      }
                      className="accent-[var(--accent)] w-4 h-4 rounded"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right Pane: Live A4 Editorial Preview */}
          <div className="lg:col-span-7 overflow-y-auto custom-scrollbar bg-[#09090b] p-4 sm:p-8">
            <div className="max-w-[780px] mx-auto bg-white text-slate-900 rounded-md shadow-2xl border border-slate-200 p-7 sm:p-10 space-y-7">
              {/* Document Header */}
              <div className="border-t-4 border-slate-900 pt-4 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-rose-700">
                    Gianduia I+D · Dossier Técnico de Desarrollo
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                    {reportData.baseCode}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-slate-900 leading-tight">
                  {reportData.productName}
                </h1>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                  <span>Sector: {reportData.sectorLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span>Tipo: {reportData.typeLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {reportData.trialCount}{' '}
                    {reportData.trialCount === 1
                      ? 'prueba realizada'
                      : 'pruebas realizadas'}{' '}
                    ({reportData.trialLettersSummary})
                  </span>
                </div>
              </div>

              {/* Technical Metadata Table */}
              <div className="border border-slate-200 rounded-md overflow-hidden">
                <table className="w-full text-xs border-collapse">
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="bg-slate-50 px-3 py-2 font-semibold text-slate-500 w-32 border-r border-slate-200">
                        Código Base
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-900 tabular-nums border-r border-slate-200">
                        {reportData.baseCode}
                      </td>
                      <td className="bg-slate-50 px-3 py-2 font-semibold text-slate-500 w-32 border-r border-slate-200">
                        N° de Pruebas
                      </td>
                      <td className="px-3 py-2 text-slate-900 tabular-nums">
                        {reportData.trialCount} ({reportData.trialLettersSummary})
                      </td>
                    </tr>
                    <tr>
                      <td className="bg-slate-50 px-3 py-2 font-semibold text-slate-500 border-r border-slate-200">
                        Sector
                      </td>
                      <td className="px-3 py-2 text-slate-900 border-r border-slate-200">
                        {reportData.sectorLabel}
                      </td>
                      <td className="bg-slate-50 px-3 py-2 font-semibold text-slate-500 border-r border-slate-200">
                        Prioridad
                      </td>
                      <td className="px-3 py-2 text-slate-900">
                        {reportData.priorityLabel}
                      </td>
                    </tr>
                    <tr>
                      <td className="bg-slate-50 px-3 py-2 font-semibold text-slate-500 border-r border-slate-200">
                        Tipo
                      </td>
                      <td className="px-3 py-2 text-slate-900 border-r border-slate-200">
                        {reportData.typeLabel}
                      </td>
                      <td className="bg-slate-50 px-3 py-2 font-semibold text-slate-500 border-r border-slate-200">
                        Estado Actual
                      </td>
                      <td className="px-3 py-2 text-slate-900">
                        {reportData.overallStatusLabel}
                      </td>
                    </tr>
                    <tr>
                      <td className="bg-slate-50 px-3 py-2 font-semibold text-slate-500 border-r border-slate-200">
                        Tiempo
                      </td>
                      <td className="px-3 py-2 text-slate-900 tabular-nums border-r border-slate-200">
                        {reportData.elapsedDaysLabel}
                        {reportData.estimatedTime !== 'No especificado'
                          ? ` · Est: ${reportData.estimatedTime}`
                          : ''}
                        {reportData.totalProdTrialMinutes > 0
                          ? ` · Planta: ${formatMinutesReadable(reportData.totalProdTrialMinutes)}`
                          : ''}
                      </td>
                      <td className="bg-slate-50 px-3 py-2 font-semibold text-slate-500 border-r border-slate-200">
                        Inicio / Cierre
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-900 tabular-nums">
                        {reportData.startedAtStr} →{' '}
                        {reportData.finishedAtStr || 'En curso'}
                      </td>
                    </tr>
                    {reportData.requester && (
                      <tr>
                        <td className="bg-slate-50 px-3 py-2 font-semibold text-slate-500 border-r border-slate-200">
                          Solicitante
                        </td>
                        <td colSpan={3} className="px-3 py-2 text-slate-900">
                          {reportData.requester}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Section 01: Narrative */}
              <div className="space-y-3">
                <div className="flex items-baseline gap-2 border-b border-slate-200 pb-1.5">
                  <span className="text-xs font-bold text-rose-700 font-mono">01</span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Contexto, Problema y Resolución
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    {
                      label: 'Por qué se realizó (Motivo / Objetivo)',
                      val: reportData.reason,
                      fallback: 'Completar en el formulario izquierdo para incluir el motivo.',
                    },
                    {
                      label: 'Cuál era el problema o desafío inicial',
                      val: reportData.problem,
                      fallback: 'Completar en el formulario izquierdo para documentar el problema.',
                    },
                    {
                      label: 'Enfoque técnico y evolución entre pruebas',
                      val: reportData.solution,
                      fallback: 'Completar o detallar ajustes aplicados a lo largo de las versiones.',
                    },
                    {
                      label: 'Conclusión y resultado final',
                      val: reportData.conclusion,
                      fallback: 'Pendiente de conclusión final.',
                    },
                  ].map((blk) => (
                    <div
                      key={blk.label}
                      className="bg-slate-50 border border-slate-200 rounded p-3 space-y-1"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {blk.label}
                      </p>
                      <p
                        className={`text-xs whitespace-pre-wrap leading-relaxed ${
                          blk.val ? 'text-slate-800' : 'text-slate-400 italic'
                        }`}
                      >
                        {blk.val || blk.fallback}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 02: Comparison Table */}
              <div className="space-y-3">
                <div className="flex items-baseline gap-2 border-b border-slate-200 pb-1.5">
                  <span className="text-xs font-bold text-rose-700 font-mono">02</span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Resumen de Pruebas Realizadas ({reportData.trialCount})
                  </h2>
                </div>

                <div className="border border-slate-200 rounded-md overflow-x-auto">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white">
                        <th className="px-2.5 py-2 font-semibold">Versión</th>
                        <th className="px-2.5 py-2 font-semibold">Código</th>
                        <th className="px-2.5 py-2 font-semibold">Estado</th>
                        <th className="px-2.5 py-2 font-semibold">Inicio</th>
                        <th className="px-2.5 py-2 font-semibold">Receta</th>
                        <th className="px-2.5 py-2 font-semibold">Ensayo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {reportData.trials.map((t) => (
                        <tr key={t.trial.id} className="even:bg-slate-50">
                          <td className="px-2.5 py-2 font-semibold text-slate-900 whitespace-nowrap">
                            Prueba {t.trialLetter}
                          </td>
                          <td className="px-2.5 py-2 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                            {t.trial.code}
                          </td>
                          <td className="px-2.5 py-2 text-slate-700 whitespace-nowrap">
                            {t.statusLabel}
                          </td>
                          <td className="px-2.5 py-2 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                            {t.createdDateStr}
                          </td>
                          <td className="px-2.5 py-2 text-slate-700">
                            {t.linkedRecipe ? t.linkedRecipe.name : 'Sin receta'}
                          </td>
                          <td className="px-2.5 py-2 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                            {t.prodTrialDurationStr ||
                              formatIsoDateShort(t.trial.prodTrialDate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 03: Detail per Trial */}
              <div className="space-y-4">
                <div className="flex items-baseline gap-2 border-b border-slate-200 pb-1.5">
                  <span className="text-xs font-bold text-rose-700 font-mono">03</span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Detalle Completo por Prueba
                  </h2>
                </div>

                {reportData.trials.map((entry) => {
                  const sa = entry.trial.sensoryAnalysis;
                  const hasSensory =
                    sa &&
                    (sa.temperature ||
                      sa.texture ||
                      sa.flavor ||
                      sa.hardness ||
                      sa.decoration);
                  const hasProdTrial =
                    entry.trial.prodTrialDate ||
                    entry.trial.prodTrialEquipment ||
                    entry.trial.prodTrialStartTime ||
                    entry.trial.prodTrialEndTime ||
                    entry.trial.prodTrialNotes;

                  return (
                    <div
                      key={entry.trial.id}
                      className="border border-slate-200 rounded-md overflow-hidden"
                    >
                      <div className="bg-slate-900 text-white px-3.5 py-2 flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold font-mono tabular-nums">
                          PRUEBA {entry.trialLetter} · {entry.trial.code}
                        </span>
                        <span className="text-slate-300 text-[11px] tabular-nums">
                          {entry.statusLabel} · Inicio {entry.createdDateStr}
                        </span>
                      </div>

                      <div className="p-3.5 space-y-3 text-xs">
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 font-mono tabular-nums">
                          <span>Realización: {entry.executionDateStr}</span>
                          <span>·</span>
                          <span>Testeo: {entry.testingDateStr}</span>
                          <span>·</span>
                          <span>Cierre: {entry.finishedDateStr}</span>
                          {entry.taskCount > 0 && (
                            <>
                              <span>·</span>
                              <span>
                                Tareas: {entry.completedTaskCount}/{entry.taskCount}
                              </span>
                            </>
                          )}
                        </div>

                        {entry.cleanNotes ? (
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                              Observaciones y Seguimiento
                            </p>
                            <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                              {entry.cleanNotes}
                            </p>
                          </div>
                        ) : entry.inheritedOnly ? (
                          <p className="text-slate-400 italic text-[11px]">
                            Sin nuevas anotaciones adicionales respecto a la prueba anterior.
                          </p>
                        ) : null}

                        {options.includeSensory && hasSensory && sa && (
                          <div className="border border-slate-200 rounded overflow-hidden">
                            <table className="w-full text-[11px] border-collapse">
                              <thead>
                                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                  <th className="px-2 py-1.5 text-left">Temp.</th>
                                  <th className="px-2 py-1.5 text-left">Textura</th>
                                  <th className="px-2 py-1.5 text-left">Sabor</th>
                                  <th className="px-2 py-1.5 text-left">Dureza</th>
                                  <th className="px-2 py-1.5 text-left">Decoración</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="px-2 py-1.5 text-slate-800">
                                    {sa.temperature || '-'}
                                  </td>
                                  <td className="px-2 py-1.5 text-slate-800">
                                    {sa.texture || '-'}
                                  </td>
                                  <td className="px-2 py-1.5 text-slate-800">
                                    {sa.flavor || '-'}
                                  </td>
                                  <td className="px-2 py-1.5 text-slate-800">
                                    {sa.hardness || '-'}
                                  </td>
                                  <td className="px-2 py-1.5 text-slate-800">
                                    {sa.decoration || '-'}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}

                        {options.includeProdTrials && hasProdTrial && (
                          <div className="bg-slate-50 border border-slate-200 rounded p-2.5 space-y-1 text-[11px]">
                            <p className="font-semibold text-slate-700">
                              Ensayo Productivo:{' '}
                              <span className="font-normal text-slate-600">
                                {[
                                  entry.trial.prodTrialDate
                                    ? `Fecha ${formatIsoDateShort(entry.trial.prodTrialDate)}`
                                    : null,
                                  entry.trial.prodTrialEquipment
                                    ? `Equipos: ${entry.trial.prodTrialEquipment}`
                                    : null,
                                  entry.trial.prodTrialStartTime ||
                                  entry.trial.prodTrialEndTime
                                    ? `Horario ${entry.trial.prodTrialStartTime || '--:--'} a ${entry.trial.prodTrialEndTime || '--:--'}${entry.prodTrialDurationStr ? ` (${entry.prodTrialDurationStr})` : ''}`
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(' · ') || 'Registrado'}
                              </span>
                            </p>
                            {entry.trial.prodTrialNotes && (
                              <p className="text-slate-600 whitespace-pre-wrap">
                                {entry.trial.prodTrialNotes}
                              </p>
                            )}
                          </div>
                        )}

                        {options.includeRecipes && entry.linkedRecipe && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                              Fórmula: {entry.linkedRecipe.name} (
                              {entry.linkedRecipe.isTrialFormula
                                ? 'Ensayo'
                                : 'Receta Técnica'}{' '}
                              · Rinde:{' '}
                              {entry.linkedRecipe.finalYield ||
                                entry.linkedRecipe.totalYield ||
                                0}{' '}
                              g)
                            </p>
                            {entry.recipeIngredients.length > 0 && (
                              <div className="border border-slate-200 rounded overflow-hidden">
                                <table className="w-full text-[11px] border-collapse">
                                  <thead>
                                    <tr className="bg-slate-700 text-white">
                                      <th className="px-2.5 py-1 text-left font-medium">
                                        Ingrediente / Semielaborado
                                      </th>
                                      <th className="px-2.5 py-1 text-right font-medium">
                                        Cantidad (g)
                                      </th>
                                      <th className="px-2.5 py-1 text-right font-medium">
                                        % Fórmula
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200">
                                    {entry.recipeIngredients.map((ing, idx) => (
                                      <tr key={idx} className="even:bg-slate-50">
                                        <td className="px-2.5 py-1 text-slate-800">
                                          {ing.name}
                                          {ing.isSubRecipe ? ' [Sub-receta]' : ''}
                                        </td>
                                        <td className="px-2.5 py-1 text-right font-mono tabular-nums text-slate-700">
                                          {ing.amount.toFixed(1)}
                                        </td>
                                        <td className="px-2.5 py-1 text-right font-mono tabular-nums text-slate-700">
                                          {ing.percentage.toFixed(1)}%
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}

                        {options.includeTasks && (entry.trial.tasks || []).length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              Tareas Registradas
                            </p>
                            <ul className="space-y-0.5 text-[11px] text-slate-700">
                              {(entry.trial.tasks || []).map((tk, tIdx) => (
                                <li key={`${entry.trial.id}_${tk.id}_${tIdx}`}>
                                  - [{tk.completed ? 'Hecha' : 'Pendiente'}] {tk.text}
                                  {tk.startTime
                                    ? ` (${tk.startTime}${tk.endTime ? `-${tk.endTime}` : ''})`
                                    : ''}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
