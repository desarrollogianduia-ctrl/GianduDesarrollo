import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const upload = multer({ storage: multer.memoryStorage() });

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV });
});

// Lazy init Gemini
let genAI: any = null;
function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    genAI = new GoogleGenAI(apiKey);
  }
  return genAI;
}

app.use(express.json({ limit: '10mb' }));

// AI Endpoints
app.post("/api/ai/nutritional-info", async (req, res) => {
  try {
    const { ingredientName } = req.body;
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Find the nutritional information EXCLUSIVELY per 100g (or 100ml for liquids) for "${ingredientName}". 
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
    - confidenceNote: A brief explanation of how the data was verified (e.g., "Verified across 3 manufacturing labels with <5% variance").`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    res.json(JSON.parse(result.response.text()));
  } catch (error: any) {
    console.error("AI Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message, history, systemPrompt } = req.body;
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const chat = model.startChat({
      history: history.map((h: any) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.parts[0].text }]
      }))
    });

    // Prepend system prompt if it's the first message or use a modified approach
    // For simplicity here, we'll just send the message
    const result = await chat.sendMessage(message);
    res.json({ text: result.response.text() });
  } catch (error: any) {
    console.error("AI Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/extract-insights", async (req, res) => {
  try {
    const { conversation } = req.body;
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    
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

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    res.json(JSON.parse(result.response.text()));
  } catch (error: any) {
    console.error("AI Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/tech-sheet", async (req, res) => {
  try {
    const { ingredientName } = req.body;
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    
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

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    res.json(JSON.parse(result.response.text()));
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
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent([
      {
        inlineData: {
          data: file.buffer.toString('base64'),
          mimeType: file.mimetype,
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
    ]);

    res.json(JSON.parse(result.response.text()));
  } catch (error: any) {
    console.error("AI Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/analyze-trials", async (req, res) => {
  try {
    const { productName, area, trials } = req.body;
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Actúa como un Ingeniero de Desarrollo y Control de Calidad Alimentaria especializado en la industria pastelera y de helados (I+D helados, pastelería, chocolatería, vitrina, paletas).
    
    Queremos analizar la evolución de las pruebas para el desarrollo del producto "${productName}" en el área "${area}".
    
    Aquí tienes el historial de pruebas realizadas en orden cronológico:
    ${trials.map((t: any) => `
    - Prueba ${t.trialLetter}:
      * Notas/Observaciones: "${t.notes || 'Ninguna'}"
      * Análisis Sensorial medido:
        - Temperatura: "${t.sensoryAnalysis?.temperature || 'No medida'}"
        - Textura: "${t.sensoryAnalysis?.texture || 'No medida'}"
        - Sabor: "${t.sensoryAnalysis?.flavor || 'No medido'}"
        - Dureza: "${t.sensoryAnalysis?.hardness || 'No medida'}"
        - Decoración: "${t.sensoryAnalysis?.decoration || 'No medida'}"
    `).join('\n')}
    
    Analiza minuciosamente estas pruebas y genera un reporte técnico profesional de I+D en ESPAÑOL, evaluando qué fue mal en cada etapa, qué mejoró, identificando puntos clave para la próxima prueba y determinando el nivel de avance.
    
    Retorna un objeto JSON con los siguientes campos estrictos:
    1. "summary" (string): Un resumen técnico claro y conciso.
    2. "whatWentWrong" (string): Qué fue mal o qué detalles se deben corregir.
    3. "keyPointsForNextTrial" (string): Puntos clave para la siguiente prueba.
    4. "progressPercentage" (number): Grado de avance (0-100).`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    res.json(JSON.parse(result.response.text()));
  } catch (error: any) {
    console.error("AI Error:", error);
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

startServer();
