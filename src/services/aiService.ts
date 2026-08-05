import { Ingredient, RecipeIngredient, NutrientValues } from "../types";

export interface ExtractedRecipe {
  name: string;
  ingredients: {
    name: string;
    amount: number;
    unit: string;
  }[];
}

export interface NutritionalSearchResult extends Partial<NutrientValues> {
  sourcesUsed: string;
  confidenceNote: string;
}

async function safeJson(response: Response, errorMessage: string) {
  const text = await response.text();
  const contentType = response.headers.get("content-type");
  
  if (contentType && contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error(`JSON parse error. Text: ${text.slice(0, 200)}`);
      throw new Error(`${errorMessage} (Error al procesar JSON: ${text.slice(0, 50)})`);
    }
  } else {
    console.error(`Non-JSON response. Status: ${response.status}. Text: ${text.slice(0, 200)}`);
    // If it's a 404 or 500 HTML page, return a friendly message
    if (text.includes("<!doctype html>") || text.includes("<html")) {
      const titleMatch = text.match(/<title>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1] : "Página HTML";
      throw new Error(`${errorMessage} (Servidor devolvió HTML: ${title})`);
    }
    throw new Error(`${errorMessage} (Status ${response.status}): ${text.slice(0, 100)}`);
  }
}

/**
 * Searches for nutritional information of an ingredient using the backend proxy.
 */
export async function searchNutritionalInfo(ingredientName: string): Promise<NutritionalSearchResult> {
  const response = await fetch("/api/ai/nutritional-info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ingredientName }),
  });

  if (!response.ok) {
    return await safeJson(response, "No se pudo obtener la información nutricional");
  }

  return await safeJson(response, "Error al leer datos nutricionales");
}

/**
 * Predictive assistant chat that leverages system data
 */
export async function chatAssistant(
  message: string,
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  context: {
    developments: any[];
    recipes: any[];
    ingredients: any[];
    knowledge?: any[];
  }
) {
  const systemPrompt = `Actúa como un Ingeniero Senior de I+D en Alimentos especializado en la industria de Gianduia (Pastelería, Helados, Chocolatería, Semielaborados).
  
  Tu objetivo es ayudar a predecir resultados de desarrollos, analizar formulaciones técnicas y proporcionar insights basados en datos históricos del sistema y documentos de conocimiento específicos.
  
  CONTEXTO DEL SISTEMA:
  - Desarrollos actuales: ${JSON.stringify(context.developments.slice(0, 10))} (se muestran los últimos 10)
  - Recetas de referencia: ${JSON.stringify(context.recipes.slice(0, 10))}
  
  BASE DE CONOCIMIENTO (NORMATIVAS, INSIGHTS Y FICHAS TÉCNICAS):
  ${context.knowledge && context.knowledge.length > 0 
    ? context.knowledge.map(doc => `[Tipo: ${doc.type || 'Gral'}, Categoría: ${doc.category}] ${doc.title}: ${doc.content}`).join('\n---\n') 
    : 'No hay documentos de conocimiento adicionales cargados.'}
  
  REGLAS CRÍTICAS:
  1. PRIORIZA LA BASE DE CONOCIMIENTO: Si hay una ficha técnica o un insight guardado sobre un ingrediente o proceso (ej. "Cómo funcionan las proteínas en rellenos"), úsalo como verdad absoluta para tus predicciones.
  2. Usa un lenguaje técnico avanzado: Habla de sólidos, PAC (Poder Anticongelante), POD (Poder Edulcorante), overrun, estructuras grasas, etc.
  3. Si te preguntan si algo funcionará, evalúa los ingredientes y proporciones. Sé específico sobre qué correcciones harías.
  4. Responde siempre en ESPAÑOL.
  5. Si el usuario te pide guardar algo, explícale que puede usar el botón de "Guardar Highlights" para que esos datos entren en tu base de memoria permanente.
  `;

  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, systemPrompt }),
  });

  if (!response.ok) {
    return await safeJson(response, "No se pudo comunicar con el asistente");
  }

  const data = await safeJson(response, "Error al leer respuesta del asistente");
  return data.text;
}

/**
 * Extracts technical highlights from a conversation
 */
export async function extractKnowledgeInsights(conversation: string): Promise<{ title: string; insights: string[] }> {
  const response = await fetch("/api/ai/extract-insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation }),
  });

  if (!response.ok) {
    return await safeJson(response, "No se pudieron extraer los insights");
  }

  return await safeJson(response, "Error al leer insights");
}

/**
 * Generates a technical sheet for an ingredient using AI research
 */
export async function generateIngredientTechSheet(ingredientName: string): Promise<{ title: string; technicalCharacteristics: string }> {
  const response = await fetch("/api/ai/tech-sheet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ingredientName }),
  });

  if (!response.ok) {
    return await safeJson(response, "No se pudo generar la ficha técnica");
  }

  return await safeJson(response, "Error al leer ficha técnica");
}

export async function extractRecipeFromMedia(file: File): Promise<ExtractedRecipe> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/ai/extract-recipe", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    return await safeJson(response, "No se pudo procesar la receta");
  }

  return await safeJson(response, "Error al leer receta extraída");
}

/**
 * Matches extracted ingredients with the existing database.
 */
export function matchIngredients(
  extracted: ExtractedRecipe, 
  existingIngredients: Ingredient[]
): RecipeIngredient[] {
  return extracted.ingredients.map(ei => {
    const found = existingIngredients.find(i => 
      i.name.toLowerCase().includes(ei.name.toLowerCase()) || 
      ei.name.toLowerCase().includes(i.name.toLowerCase())
    );

    return {
      ingredientId: found ? found.id : 'ing_unknown',
      amount: ei.amount,
      ...(found ? {} : { note: ei.name })
    };
  });
}

export interface TrialAnalysisResult {
  summary: string;
  whatWentWrong: string;
  keyPointsForNextTrial: string;
  progressPercentage: number;
}

/**
 * Technical analysis of trial iterations using AI
 */
export async function analyzeTrialProgression(
  productName: string,
  area: string,
  trials: any[]
): Promise<TrialAnalysisResult> {
  const response = await fetch("/api/ai/analyze-trials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productName, area, trials }),
  });

  if (!response.ok) {
    return await safeJson(response, "No se pudo estructurar el análisis de la IA");
  }

  return await safeJson(response, "Error al leer análisis de la IA");
}
