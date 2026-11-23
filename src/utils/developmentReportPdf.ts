import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  DevelopmentCategoryType,
  DevelopmentProject,
  Ingredient,
  ProductArea,
  ProjectPriority,
  ProjectStatus,
  Recipe,
} from '../types';

export const DEVELOPMENT_TYPE_OPTIONS: {
  id: DevelopmentCategoryType;
  label: string;
  description: string;
}[] = [
  {
    id: 'nuevo_producto',
    label: 'Nuevo Producto',
    description: 'Lanzamiento o desarrollo desde cero para catálogo o temporada.',
  },
  {
    id: 'mejora_producto',
    label: 'Mejora / Reformulación',
    description: 'Ajuste sensorial, estabilidad, textura o vida útil de producto existente.',
  },
  {
    id: 'reemplazo_insumo',
    label: 'Reemplazo de Materia Prima',
    description: 'Sustitución de ingrediente o proveedor manteniendo perfil técnico.',
  },
  {
    id: 'optimizacion_costos',
    label: 'Optimización de Costos',
    description: 'Eficiencia formulativa o ajuste de mermas y rendimientos.',
  },
  {
    id: 'escalado_industrial',
    label: 'Escalado Industrial',
    description: 'Validación de proceso en equipos de planta y prueba productiva.',
  },
  {
    id: 'terceros',
    label: 'Desarrollo para Terceros',
    description: 'Formulación a medida o marca blanca para clientes externos.',
  },
  {
    id: 'otro',
    label: 'Otro Tipo',
    description: 'Especificar clasificación personalizada.',
  },
];

export const AREA_LABELS: Record<ProductArea, string> = {
  pasteleria: 'Pastelería',
  paletas: 'Paletas',
  chocolates: 'Chocolatería / Chocolates',
  helados: 'Helados',
  popolo: 'Popolo',
  semielaborados: 'Semielaborados',
  vitrina: 'Vitrina',
  terceros: 'Terceros',
};

export const PRIORITY_LABELS: Record<ProjectPriority, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En Progreso',
  en_cola: 'En Cola',
  pausado: 'Pausado',
  finalizado: 'Finalizado',
  archivado: 'Archivado',
};

export interface DossierDraft {
  developmentType: DevelopmentCategoryType;
  developmentTypeCustom: string;
  dossierRequester: string;
  dossierReason: string;
  dossierProblem: string;
  dossierSolution: string;
  dossierConclusion: string;
}

export interface DevelopmentReportOptions {
  includeRecipes: boolean;
  includeSensory: boolean;
  includeProdTrials: boolean;
  includeTasks: boolean;
  deduplicateInheritedNotes: boolean;
}

export interface ResolvedIngredientLine {
  name: string;
  amount: number;
  percentage: number;
  note?: string;
  isSubRecipe: boolean;
}

export interface TrialReportEntry {
  trial: DevelopmentProject;
  trialLetter: string;
  statusLabel: string;
  createdDateStr: string;
  executionDateStr: string;
  testingDateStr: string;
  finishedDateStr: string;
  prodTrialDurationStr: string | null;
  prodTrialMinutes: number;
  taskCount: number;
  completedTaskCount: number;
  taskMinutes: number;
  lostMinutes: number;
  cleanNotes: string;
  inheritedOnly: boolean;
  linkedRecipe: Recipe | null;
  recipeIngredients: ResolvedIngredientLine[];
  recipeTotalGrams: number;
}

export interface DevelopmentReportData {
  baseCode: string;
  productName: string;
  sectorLabel: string;
  priorityLabel: string;
  overallStatusLabel: string;
  typeLabel: string;
  trialCount: number;
  trialLettersSummary: string;
  estimatedTime: string;
  startedAtStr: string;
  finishedAtStr: string | null;
  elapsedDaysLabel: string;
  totalTaskMinutes: number;
  totalLostMinutes: number;
  totalProdTrialMinutes: number;
  requester: string;
  reason: string;
  problem: string;
  solution: string;
  conclusion: string;
  trials: TrialReportEntry[];
}

export function formatMinutesReadable(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return '0 min';
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins} min`;
}

export function computeTimeDiffMinutes(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (Number.isNaN(sh) || Number.isNaN(sm) || Number.isNaN(eh) || Number.isNaN(em)) return 0;
  let diff = eh * 60 + em - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return diff > 0 ? diff : 0;
}

export function formatDateShort(ts?: number): string {
  if (!ts) return '-';
  return new Date(ts).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatIsoDateShort(iso?: string): string {
  if (!iso) return '-';
  if (iso.includes('-') && iso.split('-').length === 3) {
    return iso.split('-').reverse().join('/');
  }
  return iso;
}

export function getSiblingTrialsForProject(
  anchor: DevelopmentProject,
  allDevelopments: DevelopmentProject[]
): DevelopmentProject[] {
  const matches = allDevelopments.filter((d) => {
    if (anchor.sequenceNumber !== undefined && d.sequenceNumber !== undefined) {
      return d.area === anchor.area && d.sequenceNumber === anchor.sequenceNumber;
    }
    return d.id === anchor.id;
  });
  const list = matches.length > 0 ? matches : [anchor];
  return [...list].sort((a, b) =>
    (a.trialLetter || 'A').localeCompare(b.trialLetter || 'A')
  );
}

export function extractBaseCode(dev: DevelopmentProject): string {
  if (!dev.code) return 'SIN-CODIGO';
  const letter = dev.trialLetter || 'A';
  if (dev.code.endsWith(letter) && dev.code.length > 4) {
    const prefix = dev.code.slice(0, -letter.length);
    if (/\d$/.test(prefix)) return prefix;
  }
  return dev.code;
}

export function extractInitialDossierDraft(
  anchor: DevelopmentProject,
  siblings: DevelopmentProject[]
): DossierDraft {
  // Prefer values from the latest sibling or anchor that has them
  const ordered = [...siblings].reverse();
  const findVal = <K extends keyof DevelopmentProject>(key: K): DevelopmentProject[K] | undefined => {
    if (anchor[key]) return anchor[key];
    for (const s of ordered) {
      if (s[key]) return s[key];
    }
    return undefined;
  };

  const areaFallbackType: DevelopmentCategoryType =
    anchor.area === 'terceros' ? 'terceros' : 'nuevo_producto';

  return {
    developmentType: (findVal('developmentType') as DevelopmentCategoryType) || areaFallbackType,
    developmentTypeCustom: (findVal('developmentTypeCustom') as string) || '',
    dossierRequester: (findVal('dossierRequester') as string) || '',
    dossierReason: (findVal('dossierReason') as string) || '',
    dossierProblem: (findVal('dossierProblem') as string) || '',
    dossierSolution: (findVal('dossierSolution') as string) || '',
    dossierConclusion: (findVal('dossierConclusion') as string) || '',
  };
}

export function buildDevelopmentReportSummary(
  anchor: DevelopmentProject,
  siblings: DevelopmentProject[],
  draft: DossierDraft,
  recipes: Recipe[],
  ingredients: Ingredient[],
  options: DevelopmentReportOptions
): DevelopmentReportData {
  const sortedTrials = [...siblings].sort((a, b) =>
    (a.trialLetter || 'A').localeCompare(b.trialLetter || 'A')
  );
  const latestTrial = sortedTrials[sortedTrials.length - 1] || anchor;

  const baseCode = extractBaseCode(anchor);
  const sectorLabel = AREA_LABELS[latestTrial.area] || latestTrial.area || '-';
  const priorityLabel = PRIORITY_LABELS[latestTrial.priority] || latestTrial.priority || '-';
  const overallStatusLabel = STATUS_LABELS[latestTrial.status] || latestTrial.status || '-';

  const foundTypeOpt = DEVELOPMENT_TYPE_OPTIONS.find((o) => o.id === draft.developmentType);
  const typeLabel =
    draft.developmentType === 'otro' && draft.developmentTypeCustom.trim()
      ? draft.developmentTypeCustom.trim()
      : foundTypeOpt?.label || 'Nuevo Producto';

  const startTimestamps = sortedTrials
    .map((t) => t.startedAt || t.createdAt)
    .filter((v): v is number => typeof v === 'number' && v > 0);
  const earliestStart = startTimestamps.length > 0 ? Math.min(...startTimestamps) : anchor.createdAt;

  const isAllFinished = sortedTrials.every(
    (t) => t.status === 'finalizado' || t.status === 'archivado'
  );
  const finishedTimestamps = sortedTrials
    .map((t) => t.finishedAt)
    .filter((v): v is number => typeof v === 'number' && v > 0);
  const latestFinish =
    isAllFinished && finishedTimestamps.length > 0 ? Math.max(...finishedTimestamps) : null;

  const referenceEnd = latestFinish || Date.now();
  const diffDays = Math.max(0, Math.round((referenceEnd - earliestStart) / (1000 * 60 * 60 * 24)));
  const elapsedDaysLabel =
    diffDays === 0 ? 'Mismo día (< 24h)' : diffDays === 1 ? '1 día' : `${diffDays} días`;

  const estimatedTime =
    latestTrial.estimatedTime ||
    sortedTrials.find((t) => t.estimatedTime && t.estimatedTime.trim())?.estimatedTime ||
    'No especificado';

  let totalTaskMinutes = 0;
  let totalLostMinutes = 0;
  let totalProdTrialMinutes = 0;

  let previousRawNotes = '';

  const trials: TrialReportEntry[] = sortedTrials.map((trial, idx) => {
    const prodMinutes = computeTimeDiffMinutes(trial.prodTrialStartTime, trial.prodTrialEndTime);
    totalProdTrialMinutes += prodMinutes;

    const tasks = trial.tasks || [];
    let trialTaskMin = 0;
    let trialLostMin = 0;
    tasks.forEach((tk) => {
      const workMin =
        tk.totalWorkMinutes || computeTimeDiffMinutes(tk.startTime, tk.endTime);
      const cutMin =
        tk.totalLostMinutes ||
        (tk.timeCuts || []).reduce((acc, c) => acc + (c.durationMinutes || 0), 0);
      trialTaskMin += workMin;
      trialLostMin += cutMin;
    });
    totalTaskMinutes += trialTaskMin;
    totalLostMinutes += trialLostMin;

    // Deduplicate inherited notes if requested
    const rawNotes = (trial.notes || '').trim();
    let cleanNotes = rawNotes;
    let inheritedOnly = false;
    if (options.deduplicateInheritedNotes && idx > 0 && previousRawNotes) {
      if (rawNotes === previousRawNotes) {
        cleanNotes = '';
        inheritedOnly = true;
      } else if (rawNotes.startsWith(previousRawNotes)) {
        cleanNotes = rawNotes.slice(previousRawNotes.length).trim();
      }
    }
    if (rawNotes) {
      previousRawNotes = rawNotes;
    }

    const linkedRecipe =
      recipes.find((r) => r.id === trial.recipeId) ||
      recipes.find((r) => r.trialCode && r.trialCode === trial.code) ||
      null;

    let recipeTotalGrams = 0;
    let recipeIngredients: ResolvedIngredientLine[] = [];
    if (linkedRecipe) {
      recipeTotalGrams = (linkedRecipe.ingredients || []).reduce(
        (sum, ri) => sum + (Number(ri.amount) || 0),
        0
      );
      recipeIngredients = (linkedRecipe.ingredients || []).map((ri) => {
        const subRec = ri.isRecipe
          ? recipes.find((r) => r.id === ri.ingredientId)
          : undefined;
        const ing = !ri.isRecipe
          ? ingredients.find((i) => i.id === ri.ingredientId)
          : undefined;
        const amt = Number(ri.amount) || 0;
        return {
          name: subRec?.name || ing?.name || ri.note || 'Ingrediente sin referencia',
          amount: amt,
          percentage: recipeTotalGrams > 0 ? (amt / recipeTotalGrams) * 100 : 0,
          note: ri.note,
          isSubRecipe: Boolean(ri.isRecipe),
        };
      });
    }

    return {
      trial,
      trialLetter: trial.trialLetter || String.fromCharCode(65 + idx),
      statusLabel: STATUS_LABELS[trial.status] || trial.status,
      createdDateStr: formatDateShort(trial.startedAt || trial.createdAt),
      executionDateStr: formatDateShort(trial.trialExecutionDate),
      testingDateStr: formatDateShort(trial.testingDate),
      finishedDateStr: formatDateShort(trial.finishedAt),
      prodTrialDurationStr: prodMinutes > 0 ? formatMinutesReadable(prodMinutes) : null,
      prodTrialMinutes: prodMinutes,
      taskCount: tasks.length,
      completedTaskCount: tasks.filter((tk) => tk.completed || tk.status === 'finalizado').length,
      taskMinutes: trialTaskMin,
      lostMinutes: trialLostMin,
      cleanNotes,
      inheritedOnly,
      linkedRecipe,
      recipeIngredients,
      recipeTotalGrams,
    };
  });

  return {
    baseCode,
    productName: latestTrial.productName || anchor.productName,
    sectorLabel,
    priorityLabel,
    overallStatusLabel,
    typeLabel,
    trialCount: trials.length,
    trialLettersSummary: trials.map((t) => t.trialLetter).join(', '),
    estimatedTime,
    startedAtStr: formatDateShort(earliestStart),
    finishedAtStr: latestFinish ? formatDateShort(latestFinish) : null,
    elapsedDaysLabel,
    totalTaskMinutes,
    totalLostMinutes,
    totalProdTrialMinutes,
    requester: draft.dossierRequester.trim(),
    reason: draft.dossierReason.trim(),
    problem: draft.dossierProblem.trim(),
    solution: draft.dossierSolution.trim(),
    conclusion: draft.dossierConclusion.trim(),
    trials,
  };
}

/**
 * Normalizes characters so jsPDF built-in Helvetica (WinAnsi) renders clean Spanish text
 * without garbled emoji or unsupported Unicode symbols.
 */
function pdfSafe(input?: string | number | null): string {
  if (input === undefined || input === null) return '';
  return String(input)
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/•/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    // Keep ASCII + Latin-1 Supplement (áéíóúñÁÉÍÓÚÑ°± etc.) + newlines
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
}

export function generateDevelopmentPdf(
  data: DevelopmentReportData,
  options: DevelopmentReportOptions
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 18;
  let y = margin;

  const ACCENT: [number, number, number] = [190, 18, 60]; // Rose-700 editorial accent
  const INK: [number, number, number] = [15, 23, 42]; // Slate-900
  const MUTED: [number, number, number] = [100, 116, 139]; // Slate-500
  const BORDER: [number, number, number] = [226, 232, 240]; // Slate-200
  const TINT: [number, number, number] = [248, 250, 252]; // Slate-50

  const ensureSpace = (needed: number) => {
    if (y + needed > bottomLimit) {
      doc.addPage();
      y = margin + 4;
    }
  };

  const drawSectionHeader = (num: string, title: string) => {
    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...ACCENT);
    doc.text(pdfSafe(num), margin, y);

    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    doc.text(pdfSafe(title.toUpperCase()), margin + 8, y);

    y += 2.5;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.35);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  };

  const drawNarrativeBlock = (label: string, body: string, emptyPlaceholder: string) => {
    const text = pdfSafe(body) || pdfSafe(emptyPlaceholder);
    const isEmpty = !body.trim();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lines: string[] = doc.splitTextToSize(text, contentWidth - 8);
    const boxHeight = Math.max(14, lines.length * 4.3 + 9.5);

    ensureSpace(boxHeight + 3);

    doc.setFillColor(...TINT);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.25);
    doc.roundedRect(margin, y, contentWidth, boxHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(pdfSafe(label.toUpperCase()), margin + 4, y + 4.8);

    doc.setFont('helvetica', isEmpty ? 'italic' : 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...(isEmpty ? MUTED : INK));
    doc.text(lines, margin + 4, y + 9.5);

    y += boxHeight + 3.5;
  };

  // --- PAGE 1 TOP HEADER ---
  doc.setFillColor(...INK);
  doc.rect(margin, y, contentWidth, 1.2, 'F');
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...ACCENT);
  doc.text(pdfSafe('GIANDUIA I+D  ·  DOSSIER TÉCNICO DE DESARROLLO'), margin, y);

  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(pdfSafe(data.baseCode), pageWidth - margin, y, { align: 'right' });
  y += 6;

  doc.setFont('times', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  const titleLines: string[] = doc.splitTextToSize(pdfSafe(data.productName), contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7.5 + 1;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  const subMetaParts = [
    `Sector: ${data.sectorLabel}`,
    `Tipo: ${data.typeLabel}`,
    `Pruebas realizadas: ${data.trialCount} (${data.trialLettersSummary})`,
    `Emisión: ${formatDateShort(Date.now())}`,
  ];
  doc.text(pdfSafe(subMetaParts.join('   |   ')), margin, y);
  y += 5;

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // --- SUMMARY METADATA GRID ---
  const timeSummaryParts: string[] = [];
  if (data.estimatedTime && data.estimatedTime !== 'No especificado') {
    timeSummaryParts.push(`Est: ${data.estimatedTime}`);
  }
  timeSummaryParts.push(`Transcurrido: ${data.elapsedDaysLabel}`);
  if (data.totalProdTrialMinutes > 0) {
    timeSummaryParts.push(`Planta: ${formatMinutesReadable(data.totalProdTrialMinutes)}`);
  }
  if (data.totalTaskMinutes > 0) {
    timeSummaryParts.push(`Tareas: ${formatMinutesReadable(data.totalTaskMinutes)}`);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 2.8,
      lineColor: BORDER,
      lineWidth: 0.25,
      textColor: INK,
      valign: 'middle',
    },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: TINT, textColor: MUTED, cellWidth: 34 },
      1: { cellWidth: 56 },
      2: { fontStyle: 'bold', fillColor: TINT, textColor: MUTED, cellWidth: 34 },
      3: { cellWidth: 56 },
    },
    body: [
      [
        'Código Base',
        pdfSafe(data.baseCode),
        'N° de Pruebas',
        pdfSafe(`${data.trialCount} (${data.trialLettersSummary})`),
      ],
      [
        'Nombre',
        pdfSafe(data.productName),
        'Tipo de Desarrollo',
        pdfSafe(data.typeLabel),
      ],
      [
        'Sector / Área',
        pdfSafe(data.sectorLabel),
        'Prioridad',
        pdfSafe(data.priorityLabel),
      ],
      [
        'Estado Actual',
        pdfSafe(data.overallStatusLabel),
        'Inicio / Cierre',
        pdfSafe(
          `${data.startedAtStr}  ->  ${data.finishedAtStr || 'En curso'}`
        ),
      ],
      [
        'Tiempo Total',
        pdfSafe(timeSummaryParts.join(' · ')),
        'Solicitante / Resp.',
        pdfSafe(data.requester || 'Equipo I+D Gianduia'),
      ],
    ],
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // --- SECTION 1: NARRATIVE CONTEXT ---
  drawSectionHeader('01', 'Contexto, Problema y Resolución');

  drawNarrativeBlock(
    'Por qué se realizó (Motivo / Objetivo)',
    data.reason,
    'Sin motivo especificado en la ficha técnica.'
  );
  drawNarrativeBlock(
    'Cuál era el problema o desafío inicial',
    data.problem,
    'Sin problema inicial documentado.'
  );
  drawNarrativeBlock(
    'Enfoque técnico y evolución entre pruebas',
    data.solution,
    'Ver detalle evolutivo en las pruebas listadas a continuación.'
  );
  drawNarrativeBlock(
    'Conclusión y resultado final',
    data.conclusion,
    'Pendiente de conclusión final.'
  );

  y += 2;

  // --- SECTION 2: TRIALS COMPARISON TABLE ---
  drawSectionHeader('02', `Resumen de Pruebas Realizadas (${data.trialCount})`);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'striped',
    headStyles: {
      fillColor: INK,
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      cellPadding: 2.5,
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.4,
      lineColor: BORDER,
      lineWidth: 0.2,
      textColor: INK,
      overflow: 'linebreak',
    },
    alternateRowStyles: {
      fillColor: TINT,
    },
    head: [
      [
        'Versión',
        'Código',
        'Estado',
        'Inicio',
        'Realización / Testeo',
        'Receta / Fórmula',
        'Ensayo Prod.',
      ],
    ],
    body: data.trials.map((t) => [
      pdfSafe(`Prueba ${t.trialLetter}`),
      pdfSafe(t.trial.code),
      pdfSafe(t.statusLabel),
      pdfSafe(t.createdDateStr),
      pdfSafe(`${t.executionDateStr} / ${t.testingDateStr}`),
      pdfSafe(
        t.linkedRecipe
          ? `${t.linkedRecipe.name} (${t.linkedRecipe.isTrialFormula ? 'Ensayo' : 'Técnica'})`
          : 'Sin receta'
      ),
      pdfSafe(t.prodTrialDurationStr || formatIsoDateShort(t.trial.prodTrialDate)),
    ]),
  });

  y = (doc as any).lastAutoTable.finalY + 9;

  // --- SECTION 3: DETAILED BREAKDOWN PER TRIAL ---
  drawSectionHeader('03', 'Detalle Técnico Completo por Prueba');

  data.trials.forEach((entry) => {
    ensureSpace(26);

    // Trial header strip
    doc.setFillColor(...INK);
    doc.roundedRect(margin, y, contentWidth, 8.5, 1.2, 1.2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(
      pdfSafe(`PRUEBA ${entry.trialLetter}  ·  ${entry.trial.code}`),
      margin + 3.5,
      y + 5.6
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(226, 232, 240);
    doc.text(
      pdfSafe(`${entry.statusLabel.toUpperCase()}  ·  Inicio ${entry.createdDateStr}`),
      pageWidth - margin - 3.5,
      y + 5.6,
      { align: 'right' }
    );
    y += 11;

    // Dates / timing compact bar
    const timingLine = [
      `Realización: ${entry.executionDateStr}`,
      `Testeo: ${entry.testingDateStr}`,
      `Cierre: ${entry.finishedDateStr}`,
      entry.taskCount > 0 ? `Tareas: ${entry.completedTaskCount}/${entry.taskCount}` : null,
      entry.lostMinutes > 0 ? `Demoras: ${formatMinutesReadable(entry.lostMinutes)}` : null,
    ]
      .filter(Boolean)
      .join('   ·   ');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(...MUTED);
    doc.text(pdfSafe(timingLine), margin + 1, y);
    y += 4.5;

    // Trial Notes
    if (entry.cleanNotes) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...ACCENT);
      doc.text(pdfSafe('OBSERVACIONES Y SEGUIMIENTO:'), margin + 1, y);
      y += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...INK);
      const noteLines: string[] = doc.splitTextToSize(pdfSafe(entry.cleanNotes), contentWidth - 4);
      // Render lines with page break protection
      noteLines.forEach((line) => {
        ensureSpace(5);
        doc.text(line, margin + 2, y);
        y += 4.2;
      });
      y += 2;
    } else if (entry.inheritedOnly) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(pdfSafe('Sin nuevas anotaciones adicionales respecto a la prueba anterior.'), margin + 2, y);
      y += 5;
    }

    // Sensory Analysis
    const sa = entry.trial.sensoryAnalysis;
    const hasSensory =
      sa && (sa.temperature || sa.texture || sa.flavor || sa.hardness || sa.decoration);
    if (options.includeSensory && hasSensory && sa) {
      ensureSpace(18);
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: {
          fillColor: TINT,
          textColor: MUTED,
          fontSize: 7,
          fontStyle: 'bold',
          cellPadding: 1.8,
        },
        styles: {
          font: 'helvetica',
          fontSize: 7.8,
          cellPadding: 2,
          lineColor: BORDER,
          lineWidth: 0.2,
          textColor: INK,
        },
        head: [['Temperatura', 'Textura', 'Sabor', 'Dureza', 'Decoración']],
        body: [
          [
            pdfSafe(sa.temperature || '-'),
            pdfSafe(sa.texture || '-'),
            pdfSafe(sa.flavor || '-'),
            pdfSafe(sa.hardness || '-'),
            pdfSafe(sa.decoration || '-'),
          ],
        ],
      });
      y = (doc as any).lastAutoTable.finalY + 4;
    }

    // Productive Trial Info
    const hasProdTrial =
      entry.trial.prodTrialDate ||
      entry.trial.prodTrialEquipment ||
      entry.trial.prodTrialStartTime ||
      entry.trial.prodTrialEndTime ||
      entry.trial.prodTrialNotes;
    if (options.includeProdTrials && hasProdTrial) {
      ensureSpace(18);
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 7.8,
          cellPadding: 2,
          lineColor: BORDER,
          lineWidth: 0.2,
          textColor: INK,
        },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: TINT, textColor: MUTED, cellWidth: 38 },
          1: { cellWidth: contentWidth - 38 },
        },
        body: [
          [
            'Ensayo Productivo',
            pdfSafe(
              [
                entry.trial.prodTrialDate ? `Fecha: ${formatIsoDateShort(entry.trial.prodTrialDate)}` : null,
                entry.trial.prodTrialEquipment ? `Equipos: ${entry.trial.prodTrialEquipment}` : null,
                entry.trial.prodTrialStartTime || entry.trial.prodTrialEndTime
                  ? `Horario: ${entry.trial.prodTrialStartTime || '--:--'} a ${entry.trial.prodTrialEndTime || '--:--'}${entry.prodTrialDurationStr ? ` (${entry.prodTrialDurationStr})` : ''}`
                  : null,
              ]
                .filter(Boolean)
                .join('  ·  ') || 'Datos parciales registrados'
            ),
          ],
          ...(entry.trial.prodTrialNotes
            ? [['Obs. Industriales', pdfSafe(entry.trial.prodTrialNotes)]]
            : []),
        ],
      });
      y = (doc as any).lastAutoTable.finalY + 4;
    }

    // Linked Recipe & Ingredients
    if (options.includeRecipes && entry.linkedRecipe) {
      ensureSpace(22);
      const rec = entry.linkedRecipe;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...ACCENT);
      doc.text(
        pdfSafe(
          `FORMULACIÓN VINCULADA: ${rec.name}  (${rec.isTrialFormula ? 'Fórmula de Ensayo' : 'Receta Técnica Oficial'} · Rinde final: ${rec.finalYield || rec.totalYield || 0} g)`
        ),
        margin + 1,
        y
      );
      y += 3.5;

      if (entry.recipeIngredients.length > 0) {
        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          theme: 'striped',
          headStyles: {
            fillColor: [51, 65, 85],
            textColor: [255, 255, 255],
            fontSize: 7,
            fontStyle: 'bold',
            cellPadding: 1.8,
          },
          styles: {
            font: 'helvetica',
            fontSize: 7.5,
            cellPadding: 1.8,
            lineColor: BORDER,
            lineWidth: 0.15,
            textColor: INK,
          },
          columnStyles: {
            0: { cellWidth: contentWidth - 46 },
            1: { halign: 'right', cellWidth: 24 },
            2: { halign: 'right', cellWidth: 22 },
          },
          head: [['Ingrediente / Semielaborado', 'Cantidad (g)', '% Fórmula']],
          body: [
            ...entry.recipeIngredients.map((ing) => [
              pdfSafe(ing.isSubRecipe ? `${ing.name} [Sub-receta]` : ing.name),
              pdfSafe(ing.amount.toFixed(1)),
              pdfSafe(`${ing.percentage.toFixed(1)}%`),
            ]),
            [
              { content: 'TOTAL FÓRMULA', styles: { fontStyle: 'bold' } },
              { content: pdfSafe(entry.recipeTotalGrams.toFixed(1)), styles: { fontStyle: 'bold', halign: 'right' } },
              { content: '100.0%', styles: { fontStyle: 'bold', halign: 'right' } },
            ],
          ],
        });
        y = (doc as any).lastAutoTable.finalY + 3;
      }

      if (rec.procedure) {
        ensureSpace(10);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.3);
        doc.setTextColor(...MUTED);
        doc.text('Procedimiento:', margin + 1, y);
        y += 3.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.8);
        doc.setTextColor(...INK);
        const procLines: string[] = doc.splitTextToSize(pdfSafe(rec.procedure), contentWidth - 4);
        procLines.forEach((line) => {
          ensureSpace(4.5);
          doc.text(line, margin + 2, y);
          y += 3.8;
        });
        y += 2;
      }
    }

    // Tasks Summary for this Trial
    if (options.includeTasks && (entry.trial.tasks || []).length > 0) {
      ensureSpace(18);
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: {
          fillColor: TINT,
          textColor: MUTED,
          fontSize: 7,
          fontStyle: 'bold',
          cellPadding: 1.8,
        },
        styles: {
          font: 'helvetica',
          fontSize: 7.5,
          cellPadding: 1.8,
          lineColor: BORDER,
          lineWidth: 0.15,
          textColor: INK,
        },
        head: [['Tarea de Seguimiento', 'Estado', 'Área / Resp.', 'Horario / Cortes']],
        body: (entry.trial.tasks || []).map((tk) => {
          const cutsCount = (tk.timeCuts || []).length;
          const timeInfo = [
            tk.startTime ? `${tk.startTime}${tk.endTime ? `-${tk.endTime}` : ''}` : null,
            cutsCount > 0 ? `${cutsCount} corte(s)` : null,
          ]
            .filter(Boolean)
            .join(' · ');
          return [
            pdfSafe(tk.text),
            pdfSafe(tk.completed || tk.status === 'finalizado' ? 'Finalizada' : tk.status === 'pausado' ? 'Pausada' : 'Pendiente'),
            pdfSafe([tk.area, tk.assignee].filter(Boolean).join(' / ') || '-'),
            pdfSafe(timeInfo || '-'),
          ];
        }),
      });
      y = (doc as any).lastAutoTable.finalY + 4;
    }

    y += 4;
  });

  // --- RUNNING FOOTER ON ALL PAGES ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.25);
    doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(
      pdfSafe(`Gianduia I+D · Informe Técnico de Desarrollo · ${data.baseCode} · ${data.productName}`),
      margin,
      pageHeight - 8.5
    );
    doc.text(
      pdfSafe(`Página ${i} de ${totalPages}`),
      pageWidth - margin,
      pageHeight - 8.5,
      { align: 'right' }
    );
  }

  const safeSlug = (data.baseCode + '_' + data.productName)
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 55);
  doc.save(`Informe_Desarrollo_${safeSlug}.pdf`);
}
