import { GoogleGenAI, Type } from "@google/genai";
import { Ingredient, RecipeIngredient, NutrientValues } from "../types";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

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

/**
 * Searches for nutritional information of an ingredient using Google Search.
 */
export async function searchNutritionalInfo(ingredientName: string): Promise<NutritionalSearchResult> {
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: `Find the nutritional information EXCLUSIVELY per 100g (or 100ml for liquids) for "${ingredientName}". 
    The item should be common in the Argentine food market if possible.
    
    CRITICAL: 
    1. All values MUST be per 100g/ml of product.
    2. You MUST look for at least 3 different sources (e.g., brand labels, official food databases, reliable nutrition sites) to verify the accuracy of the data. 
    Compare the values and use the most reliable or an average if they are consistent.
    
    Return a JSON object with:
    - energy (kcal)
    - carbs (g)
    - sugars (g)
    - proteins (g)
    - totalFats (g)
    - saturatedFats (g)
    - transFats (g)
    - fiber (g)
    - sodium (mg)
    - sourcesUsed: A concise string listing the specific websites, databases, or brands you consulted (e.g. "SANCOR, Arcor, FoodData Central").
    - confidenceNote: A brief explanation of how the data was verified (e.g., "Verified across 3 manufacturing labels with <5% variance").`,
    config: {
      tools: [{ googleSearch: {} }],
      toolConfig: { includeServerSideToolInvocations: true },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          energy: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          sugars: { type: Type.NUMBER },
          proteins: { type: Type.NUMBER },
          totalFats: { type: Type.NUMBER },
          saturatedFats: { type: Type.NUMBER },
          transFats: { type: Type.NUMBER },
          fiber: { type: Type.NUMBER },
          sodium: { type: Type.NUMBER },
          sourcesUsed: { type: Type.STRING },
          confidenceNote: { type: Type.STRING },
        },
        required: ["sourcesUsed", "confidenceNote"]
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Failed to search nutritional info:", error);
    throw new Error("No se pudo obtener la información nutricional de la web.");
  }
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

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Entendido. Soy tu asistente senior de I+D. Los documentos de conocimiento cargados están integrados en mi lógica de predicción. ¿En qué formulación trabajaremos hoy?" }] },
      ...history,
      { role: "user", parts: [{ text: message }] }
    ],
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  return response.text;
}

/**
 * Extracts technical highlights from a conversation
 */
export async function extractKnowledgeInsights(conversation: string): Promise<{ title: string; insights: string[] }> {
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: `Analiza la siguiente conversación técnica de I+D en alimentos y extrae los puntos clave (insights).
    
    CONVERSACIÓN:
    ${conversation}
    
    INSTRUCCIONES:
    1. Identifica el tema principal para el título.
    2. Extrae frases cortas y concretas sobre el comportamiento de ingredientes, procesos o reglas técnicas mencionadas.
    3. Enfócate en el "por qué" y el "cómo" técnico.
    
    Retorna un JSON:
    {
      "title": "Título descriptivo",
      "insights": ["Frase técnica 1", "Frase técnica 2"]
    }`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          insights: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["title", "insights"]
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Failed to extract insights:", error);
    throw new Error("No se pudieron extraer los insights de la conversación.");
  }
}

/**
 * Generates a technical sheet for an ingredient using AI research
 */
export async function generateIngredientTechSheet(ingredientName: string): Promise<{ title: string; technicalCharacteristics: string }> {
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: `Investiga y genera una ficha técnica técnica de I+D para el ingrediente: "${ingredientName}".
    Enfócate en la industria del helado, pastelería y chocolatería.
    
    Incluye:
    1. Funcionalidad principal (ej: edulcorante, espesante, emulsionante).
    2. Parámetros técnicos típicos (PAC, POD, % de sólidos, etc. si aplica).
    3. Comportamiento en proceso (ej: temperatura de disolución, efecto en la textura).
    4. Sinergias o incompatibilidades.
    
    Usa un lenguaje profesional de ingeniero en alimentos. No pongas valores nutricionales básicos, enfócate en la FUNCIONALIDAD TÉCNICA.
    
    Retorna un JSON:
    {
      "title": "Ficha Técnica: [Nombre]",
      "technicalCharacteristics": "Contenido detallado en formato Markdown..."
    }`,
    config: {
      tools: [{ googleSearch: {} }],
      toolConfig: { includeServerSideToolInvocations: true },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          technicalCharacteristics: { type: Type.STRING }
        },
        required: ["title", "technicalCharacteristics"]
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Failed to generate tech sheet:", error);
    throw new Error("No se pudo generar la ficha técnica del ingrediente.");
  }
}

export async function extractRecipeFromMedia(file: File): Promise<ExtractedRecipe> {
  const base64Data = await fileToBase64(file);
  const mimeType = file.type;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        {
          text: `Extract the recipe name and ingredients from this image or document. 
          The context is the Argentine food industry (INDUSTRIA ALIMENTARIA ARGENTINA).
          
          Return a JSON object with the following structure:
          {
            "name": "Recipe Name",
            "ingredients": [
              { "name": "Ingredient Name", "amount": 100, "unit": "g" }
            ]
          }
          
          CRITICAL INSTRUCTIONS:
          1. Convert all amounts to GRAMS (g). 
          2. If a unit is "kg", multiply by 1000. 
          3. If a unit is "lt" or "ml" for liquids like milk/water, assume 1ml = 1g if density is unknown.
          4. If the amount is a percentage (%), calculate the amount based on a standard 100kg batch if no total weight is specified, or specify the amount if a total weight is visible.
          5. Use standard names for ingredients (e.g., "Sacarosa" -> "Azúcar Blanco").`,
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          ingredients: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                unit: { type: Type.STRING },
              },
              required: ["name", "amount", "unit"],
            },
          },
        },
        required: ["name", "ingredients"],
      },
    },
  });

  try {
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    throw new Error("No se pudo procesar la receta. Asegúrate de que la imagen sea clara.");
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(",")[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Matches extracted ingredients with the existing database.
 * If an ingredient is missing, it could potentially be added or flagged.
 */
export function matchIngredients(
  extracted: ExtractedRecipe, 
  existingIngredients: Ingredient[]
): RecipeIngredient[] {
  return extracted.ingredients.map(ei => {
    // Basic fuzzy match or exact match
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
  trials: {
    trialLetter: string;
    notes?: string;
    sensoryAnalysis?: {
      temperature?: string;
      texture?: string;
      flavor?: string;
      hardness?: string;
      decoration?: string;
    };
    createdAt: number;
    finishedAt?: number;
    trialExecutionDate?: number;
    testingDate?: number;
  }[]
): Promise<TrialAnalysisResult> {
  const prompt = `Actúa como un Ingeniero de Desarrollo y Control de Calidad Alimentaria especializado en la industria pastelera y de helados (I+D helados, pastelería, chocolatería, vitrina, paletas).
  
  Queremos analizar la evolución de las pruebas para el desarrollo del producto "${productName}" en el área "${area}".
  
  Aquí tienes el historial de pruebas realizadas en orden cronológico:
  ${trials.map((t) => `
  - Prueba ${t.trialLetter}:
    * Fecha de creación: ${new Date(t.createdAt).toLocaleDateString('es-AR')}
    * Fecha de ejecución: ${t.trialExecutionDate ? new Date(t.trialExecutionDate).toLocaleDateString('es-AR') : 'No registrada'}
    * Notas/Observaciones: "${t.notes || 'Ninguna'}"
    * Análisis Sensorial medido:
      - Temperatura: "${t.sensoryAnalysis?.temperature || 'No medida'}"
      - Textura: "${t.sensoryAnalysis?.texture || 'No medida'}"
      - Sabor: "${t.sensoryAnalysis?.flavor || 'No medido'}"
      - Dureza: "${t.sensoryAnalysis?.hardness || 'No medida'}"
      - Decoración: "${t.sensoryAnalysis?.decoration || 'No medida'}"
  `).join('\n')}
  
  Analiza minuciosamente estas pruebas y genera un reporte técnico profesional de I+D en ESPAÑOL, evaluando qué fue mal en cada etapa, qué mejoró, identificando puntos clave para la próxima prueba y determinando el nivel de avance (avance porcentual hasta llegar a la receta perfecta finalizada).
  
  Retorna un objeto JSON con los siguientes campos estrictos:
  1. "summary" (string): Un resumen técnico claro y conciso de la evolución general y el estado actual (en texto Markdown elegante).
  2. "whatWentWrong" (string): Un análisis específico de qué fue mal o qué detalles se deben corregir basados en las pruebas fallidas o intermedias (en formato de puntos Markdown).
  3. "keyPointsForNextTrial" (string): Puntos clave indispensables e instrucciones detalladas para la siguiente prueba (recomendaciones de temperatura, ingredientes, control físico-químico, etc., en formato de puntos Markdown).
  4. "progressPercentage" (number): Un número entero de 0 a 100 que estime el grado de avance del proyecto de desarrollo hacia la formulación definitiva.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          whatWentWrong: { type: Type.STRING },
          keyPointsForNextTrial: { type: Type.STRING },
          progressPercentage: { type: Type.INTEGER }
        },
        required: ["summary", "whatWentWrong", "keyPointsForNextTrial", "progressPercentage"]
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Failed to parse trial progression AI analysis:", error);
    throw new Error("No se pudo estructurar el análisis de la IA.");
  }
}
