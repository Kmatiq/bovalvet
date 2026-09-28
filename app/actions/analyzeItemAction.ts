/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY saknas i .env.local");
}

const genAI = new GoogleGenerativeAI(apiKey);

export interface ItemAnalysisResult {
  title: string;
  category: string;
  brand: string;
  model: string;
  estimated_replacement_cost_sek: number;
  market_value_sek: number;
  condition: "Nyskick" | "Mycket gott" | "Gott" | "Slitage" | "Defekt";
  serial_number_hint: string;
  confidence: number;
}

export async function analyzeItemWithGemini(
  base64Image: string,
  mimeType: string = "image/jpeg"
): Promise<{ success: boolean; data?: ItemAnalysisResult; error?: string }> {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            title: { 
              type: SchemaType.STRING, 
              description: "Kortfattat svenskt namn på föremålet, t.ex. 'Samsung 65 tum QLED 4K TV' eller 'Rolex Submariner'" 
            },
            category: { 
              type: SchemaType.STRING, 
              enum: [
                "Hemelektronik & TV",
                "Datorer & Telefoner",
                "Smycken & Klockor",
                "Möbler & Inredning",
                "Konst & Samlarobjekt",
                "Verktyg & Trädgård",
                "Kläder, Skor & Väskor",
                "Sport & Fritid",
                "Övrigt"
              ] 
            },
            brand: { type: SchemaType.STRING, description: "Märke/Tillverkare eller 'Okänt'" },
            model: { type: SchemaType.STRING, description: "Modellbeteckning om synlig, annars 'Okänd modell'" },
            estimated_replacement_cost_sek: { 
              type: SchemaType.NUMBER, 
              description: "Uppskattat nypris i SEK i svensk butik idag för motsvarande vara" 
            },
            market_value_sek: { 
              type: SchemaType.NUMBER, 
              description: "Uppskattat begagnatvärde i SEK vid privatförsäljning (t.ex. Blocket)" 
            },
            condition: { 
              type: SchemaType.STRING, 
              enum: ["Nyskick", "Mycket gott", "Gott", "Slitage", "Defekt"] 
            },
            serial_number_hint: { 
              type: SchemaType.STRING, 
              description: "Var serienumret vanligen sitter på detta föremål" 
            },
            confidence: { 
              type: SchemaType.NUMBER, 
              description: "Sannolikhetspoäng mellan 0.0 och 1.0" 
            }
          },
          required: [
            "title", 
            "category", 
            "brand", 
            "model", 
            "estimated_replacement_cost_sek", 
            "market_value_sek", 
            "condition", 
            "serial_number_hint", 
            "confidence"
          ]
        } as any
      }
    });

    const prompt = `
Du är en auktoriserad besiktningsman och värderingsexpert för svenska försäkringsbolag.
Analysera föremålet på bilden noggrant:
1. Identifiera fabrikat och specifik modell.
2. Ange realistiska marknadspriser i Svenska Kronor (SEK).
3. Var konservativ i värderingen men realistisk utifrån skick och märke.
4. Om föremålet är elektronik, verktyg eller klocka, beskriv var serienumret vanligen sitter.
Svara uteslutande med det definierade JSON-schemat.
`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      }
    ]);

    const responseText = result.response.text();
    const parsedData = JSON.parse(responseText) as ItemAnalysisResult;

    return { success: true, data: parsedData };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Misslyckades att analysera bilden";
    console.error("Fel vid Gemini-analys:", errorMsg);
    return { success: false, error: errorMsg };
  }
}