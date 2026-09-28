import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

export const app = express();
const PORT = 3000;
const upload = multer({ storage: multer.memoryStorage() });

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    env: process.env.NODE_ENV,
    hasGeminiKey: !!process.env.GEMINI_API_KEY 
  });
});

// Lazy init Gemini
let genAI: any = null;
function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    genAI = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return genAI;
}

app.use(express.json({ limit: '10mb' }));

// AI Helper with retry logic
async function withRetry<T>(fn: () => Promise<T>, retries = 3, initialDelay = 1000): Promise<T> {
  let delay = initialDelay;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRetryable = 
        error.message?.includes("503") || 
        error.message?.includes("high demand") || 
        error.status === 503 ||
        error.code === 503;

      if (i < retries - 1 && isRetryable) {
        console.log(`AI Error (503), retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      throw error;
    }
  }
  throw new Error("Maximum retries reached");
}

// AI Endpoints
app.post("/api/ai/nutritional-info", async (req, res) => {
  try {
    const { ingredientName } = req.body;
    console.log(`[AI] Searching nutritional info for: ${ingredientName}`);
    const ai = getGenAI();
    
    const prompt = `Find the nutritional information EXCLUSIVELY per 100g (or 100ml for liquids) for "${ingredientName}". 
    The item should be common in the Argentine food market (Ley 27.642 context).
    
    CRITICAL: 
    1. All values MUST be per 100g/ml of product.
    2. You MUST look for at least 3 different sources (e.g., SADI, ARCOR, official food databases, or reliable nutrition sites) to verify the accuracy of the data. 
    3. Return a valid JSON.
    
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
    - sourcesUsed: string
    - confidenceNote: string`;

    const result = await withRetry(() => ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    })) as any;

    const text = result.text || "{}";
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Nutritional Info AI Error:", error);
    res.status(500).json({ error: error.message || "Error interno del servidor en AI" });
  }
});

app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message, history, systemPrompt } = req.body;
    const ai = getGenAI();
    
    const chat = ai.chats.create({
      model: "gemini-3.8-flash",
      config: {
        systemInstruction: systemPrompt
      },
      history: history.map((h: any) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.parts[0].text }]
      }))
    });

    const result = await withRetry(() => chat.sendMessage(message)) as any;
    res.json({ text: result.text });
  } catch (error: any) {
    console.error("AI Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/extract-insights", async (req, res) => {
  try {
    const { conversation } = req.body;
    const ai = getGenAI();
    
    const prompt = `Analiza la siguiente conversación técnica de I+D en alimentos y extrae los puntos clave (insights).
    
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
    }`;

    const result = await withRetry(() => ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    })) as any;

    res.json(JSON.parse(result.text || "{}"));
  } catch (error: any) {
    console.error("AI Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/tech-sheet", async (req, res) => {
  try {
    const { ingredientName } = req.body;
    const ai = getGenAI();
    
    const prompt = `Investiga y genera una ficha técnica técnica de I+D para el ingrediente: "${ingredientName}".
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
    }`;

    const result = await withRetry(() => ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    })) as any;

    res.json(JSON.parse(result.text || "{}"));
  } catch (error: any) {
    console.error("AI Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/extract-recipe", upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const ai = getGenAI();
    
    const result = await withRetry(() => ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        {
          inlineData: {
            data: file.buffer.toString('base64'),
            mimeType: file.mimetype,
          },
        },
        {
          text: `Extract the recipe name and ingredients from this image or document. 
          The context is the Argentine high-end food industry (INDUSTRIA ALIMENTARIA ARGENTINA - HELADOS Y PASTELERÍA).
          
          Return a JSON object with the following structure:
          {
            "name": "Recipe Name",
            "ingredients": [
              { "name": "Ingredient Name", "amount": 100, "unit": "g" }
            ]
          }
          
          CRITICAL INSTRUCTIONS:
          1. Convert all amounts to GRAMS (g). 
          2. Use standard names for ingredients common in Gianduia (e.g., "Sacarosa" -> "Azúcar Blanco", "Crema 36%" -> "Crema de Leche").
          3. If the document uses percentages (%), assume a 1000g total if no total is specified.
          4. Be very precise with technical terms like stabilizers (neutros), pastes (pastas de frutos secos), and variegatos.
          5. If an ingredient has a brand mentioned (e.g. "Pasta Pistacho Elit"), include the brand in the name.
          6. Ensure the ingredient name is clean and technical.`,
        },
      ],
      config: {
        responseMimeType: "application/json",
      }
    })) as any;

    res.json(JSON.parse(result.text || "{}"));
  } catch (error: any) {
    console.error("AI Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/analyze-trials", async (req, res) => {
  console.log("POST /api/ai/analyze-trials received");
  try {
    const { productName, area, trials } = req.body;
    
    if (!trials || !Array.isArray(trials)) {
      console.error("Invalid trials data received:", trials);
      return res.status(400).json({ error: "Invalid trials data" });
    }

    const ai = getGenAI();
    
    const prompt = `Actúa como un Ingeniero Senior de Desarrollo y Control de Calidad Alimentaria especializado en Gianduia (industria pastelera y helados de alta gama).
    
    Analiza la evolución de las pruebas para el desarrollo del producto "${productName}" en el área "${area}".
    
    Historial de pruebas (orden cronológico):
    ${trials.map((t: any) => `
    - Versión ${t.trialLetter || '?'}:
      * Notas: "${t.notes || 'N/A'}"
      * Sensorial (Temp/Text/Sab/Dur/Dec): ${t.sensoryAnalysis?.temperature || '-'}/${t.sensoryAnalysis?.texture || '-'}/${t.sensoryAnalysis?.flavor || '-'}/${t.sensoryAnalysis?.hardness || '-'}/${t.sensoryAnalysis?.decoration || '-'}
      * Fecha Ejecución: ${t.trialExecutionDate || 'N/A'}
    `).join('\n')}
    
    PROPORCIONA UN ANÁLISIS TÉCNICO PROFESIONAL EN ESPAÑOL.
    Enfócate en parámetros físicos (textura, estabilidad), químicos (dulzor, grasas) y sensoriales.
    
    Retorna un JSON estricto con:
    1. "summary": Resumen de la evolución técnica.
    2. "whatWentWrong": Puntos críticos fallidos o áreas de mejora detectadas.
    3. "keyPointsForNextTrial": Recomendaciones precisas para la próxima iteración.
    4. "progressPercentage": Número entre 0 y 100 que indique qué tan cerca está el producto de ser finalizado.`;

    const result = await withRetry(() => ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    })) as any;

    const text = result.text || "{}";
    try {
      res.json(JSON.parse(text));
    } catch (e) {
      console.error("Gemini JSON Parse Error. Raw text:", text);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        res.json(JSON.parse(jsonMatch[0]));
      } else {
        throw new Error("El modelo no devolvió un formato JSON válido.");
      }
    }
  } catch (error: any) {
    console.error("AI Error (Analyze Trials):", error);
    res.status(500).json({ error: error.message });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  startServer();
}

export default app;
