import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

export const app = express();
const PORT = 3000;
const upload = multer({ storage: multer.memoryStorage() });

// Health check
app.get("/api/health", (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  res.json({ 
    status: "ok", 
    env: process.env.NODE_ENV,
    hasGeminiKey: !!key,
    keyPrefix: key ? `${key.substring(0, 4)}...` : "none"
  });
});

// Lazy init Gemini
let genAI: any = null;
function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[CRITICAL] GEMINI_API_KEY is missing in environment variables");
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    console.log("[AI] Initializing Gemini client (Key prefix:", apiKey.substring(0, 4), ")");
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

// AI Helper with retry logic - REDUCED for Vercel timeouts
async function withRetry<T>(fn: () => Promise<T>, retries = 2, initialDelay = 500): Promise<T> {
  let delay = initialDelay;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRetryable = 
        error.message?.includes("503") || 
        error.message?.includes("high demand") || 
        error.status === 503 ||
        error.code === 503 ||
        error.message?.includes("overloaded");

      if (i < retries - 1 && isRetryable) {
        console.log(`[AI] Error (retryable), retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; 
        continue;
      }
      throw error;
    }
  }
  throw new Error("Maximum retries reached");
}

// Model alias - use gemini-3.8-flash as recommended
const DEFAULT_MODEL = "gemini-3.8-flash";

// AI Endpoints
app.post("/api/ai/nutritional-info", async (req, res, next) => {
  try {
    const { ingredientName } = req.body;
    if (!ingredientName) return res.status(400).json({ error: "Ingredient name is required" });
    
    console.log(`[AI] Nutritional info search: ${ingredientName}`);
    const ai = getGenAI();
    
    const prompt = `Find the nutritional information EXCLUSIVELY per 100g (or 100ml for liquids) for "${ingredientName}". 
    The item should be common in the Argentine food market (Ley 27.642 context).
    
    CRITICAL: 
    1. All values MUST be per 100g/ml of product.
    2. Verificá la información con bases de datos confiables de Argentina (SADI, ARCOR, etc.).
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

    const response = await withRetry(() => ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    })) as any;

    const text = response.text || "{}";
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("[AI] Nutritional Info Error:", error);
    next(error);
  }
});

app.post("/api/ai/chat", async (req, res, next) => {
  try {
    const { message, history, systemPrompt } = req.body;
    console.log("[AI] Chat request received");
    const ai = getGenAI();
    
    const chat = ai.chats.create({
      model: DEFAULT_MODEL,
      config: {
        systemInstruction: systemPrompt
      },
      history: (history || []).slice(-10).map((h: any) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.parts[0].text }]
      }))
    });

    const response = await withRetry(() => chat.sendMessage(message)) as any;
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("[AI] Chat Error:", error);
    next(error);
  }
});

app.post("/api/ai/extract-insights", async (req, res, next) => {
  try {
    const { conversation } = req.body;
    console.log("[AI] Extract insights request");
    const ai = getGenAI();
    
    const safeConv = (conversation || "").slice(-5000);
    
    const prompt = `Analiza la siguiente conversación técnica de I+D en alimentos y extrae los puntos clave (insights).
    
    CONVERSACIÓN:
    ${safeConv}
    
    INSTRUCCIONES:
    1. Identifica el tema principal para el título.
    2. Extrae frases cortas y concretas sobre el comportamiento de ingredientes, procesos o reglas técnicas mencionadas.
    3. Enfócate en el "por qué" y el "cómo" técnico.
    
    Retorna un JSON:
    {
      "title": "Título descriptivo",
      "insights": ["Frase técnica 1", "Frase técnica 2"]
    }`;

    const response = await withRetry(() => ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    })) as any;

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("[AI] Extract Insights Error:", error);
    next(error);
  }
});

app.post("/api/ai/tech-sheet", async (req, res, next) => {
  try {
    const { ingredientName } = req.body;
    console.log(`[AI] Tech sheet request for: ${ingredientName}`);
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

    const response = await withRetry(() => ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    })) as any;

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("[AI] Tech Sheet Error:", error);
    next(error);
  }
});

app.post("/api/ai/extract-recipe", upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log(`[AI] Extract recipe from file: ${file.originalname} (${file.mimetype})`);
    const ai = getGenAI();
    
    const response = await withRetry(() => ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              data: file.buffer.toString('base64'),
              mimeType: file.mimetype,
            },
          },
          {
            text: `Extrae el nombre de la receta y la lista de ingredientes de esta imagen o documento. 
            CONTEXTO: Industria alimentaria de alta gama en Argentina (Gianduia - Helados, Pastelería, Chocolatería).
            
            ESTRUCTURA DE RETORNO (JSON):
            {
              "name": "Nombre de la Receta",
              "ingredients": [
                { "name": "Nombre del Ingrediente", "amount": 100, "unit": "g" }
              ]
            }
            
            REGLAS CRÍTICAS DE EXTRACCIÓN:
            1. CONVERSIÓN A GRAMOS: Si el documento usa kg, ml, l, cc o %, convertí todo a GRAMOS (g). 
            2. NOMENCLATURA TÉCNICA GIANDUIA: Respetá marcas (Elit, Arcor) e ingredientes específicos.
            3. IDIOMA: Extrae los nombres tal como aparecen, pero normalizá las unidades a "g".`,
          },
        ]
      },
      config: {
        responseMimeType: "application/json",
      }
    })) as any;

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("[AI] Extract Recipe Error:", error);
    next(error);
  }
});

app.post("/api/ai/analyze-trials", async (req, res, next) => {
  try {
    const { productName, area, trials } = req.body;
    
    if (!trials || !Array.isArray(trials)) {
      return res.status(400).json({ error: "Invalid trials data" });
    }

    const ai = getGenAI();
    const recentTrials = trials.slice(-15);
    
    const prompt = `Actúa como un Ingeniero Senior de Desarrollo y Control de Calidad Alimentaria especializado en Gianduia (industria pastelera y helados de alta gama).
    
    Analiza la evolución de las pruebas para el desarrollo del producto "${productName}" en el área "${area}".
    
    Historial de pruebas (orden cronológico):
    ${recentTrials.map((t: any) => `
    - Versión ${t.trialLetter || '?'}:
      * Notas: "${t.notes || 'N/A'}"
      * Sensorial: ${JSON.stringify(t.sensoryAnalysis)}
    `).join('\n')}
    
    Retorna un JSON estricto con:
    1. "summary": Resumen de la evolución técnica.
    2. "whatWentWrong": Puntos críticos fallidos o áreas de mejora detectadas.
    3. "keyPointsForNextTrial": Recomendaciones precisas para la próxima iteración.
    4. "progressPercentage": Número entre 0 y 100 que indique qué tan cerca está el producto de ser finalizado.`;

    const response = await withRetry(() => ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    })) as any;

    const text = response.text || "{}";
    try {
      res.json(JSON.parse(text));
    } catch (e) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        res.json(JSON.parse(jsonMatch[0]));
      } else {
        throw new Error("El modelo no devolvió un formato JSON válido.");
      }
    }
  } catch (error: any) {
    console.error("[AI] Analyze Trials Error:", error);
    next(error);
  }
});

// Debug catch-all for /api
app.all("/api/*", (req, res) => {
  res.status(404).json({ 
    error: "API Route not found",
    method: req.method,
    path: req.path
  });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[SERVER] Error Handler:", err);
  res.status(err.status || 500).json({ 
    error: "AI_SERVER_ERROR", 
    message: err.message
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error("[SERVER] Failed to load Vite:", e);
    }
    
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } else {
    if (!process.env.VERCEL) {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        if (req.path.startsWith('/api/')) return; 
        res.sendFile(path.join(distPath, 'index.html'));
      });

      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    }
  }
}

if (process.env.NODE_ENV !== "production") {
  startServer();
} else if (!process.env.VERCEL) {
  startServer();
}

export default app;
