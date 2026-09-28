/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "GEMINI_API_KEY saknas i .env.local" },
        { status: 500 }
      );
    }

    const { base64Image, mimeType } = await req.json();
    if (!base64Image) {
      return NextResponse.json(
        { success: false, error: "Ingen bilddata togs emot" },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const responseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        title: { 
          type: SchemaType.STRING, 
          description: "Kortfattat svenskt namn på föremålet, t.ex. 'Husqvarna Lavatherm torktumlare'" 
        },
        category: { 
          type: SchemaType.STRING, 
          enum: [
            "Vitvaror & Hushåll",
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
        brand: { type: SchemaType.STRING, description: "Märke/Tillverkare, t.ex. 'Husqvarna'" },
        model: { type: SchemaType.STRING, description: "Modellserie eller specifik beteckning" },
        estimated_replacement_cost_sek: { 
          type: SchemaType.NUMBER, 
          description: "Uppskattat nypris i SEK idag för motsvarande produkt" 
        },
        market_value_sek: { 
          type: SchemaType.NUMBER, 
          description: "Uppskattat begagnatvärde i SEK i nuvarande skick" 
        },
        condition: { 
          type: SchemaType.STRING, 
          enum: ["Nyskick", "Mycket gott", "Gott", "Slitage", "Defekt"] 
        },
        serial_number_hint: { 
          type: SchemaType.STRING, 
          description: "Var serienumret eller typskylten vanligen sitter" 
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
    };

    const prompt = `
Du är en auktoriserad besiktningsman och värderingsexpert för svenska försäkringsbolag.
Analysera föremålet på bilden noggrant:
1. Identifiera fabrikat och modell. Om det är en tvättpelare med två maskiner, fokusera på den översta maskinen (torktumlaren).
2. Ange realistiska marknadspriser i Svenska Kronor (SEK).
3. Var konservativ i värderingen men realistisk.
4. Ange var typskylt/serienummer vanligen sitter (t.ex. på luckans innerkant eller baksidan).
Svara uteslutande med det definierade JSON-schemat.
`;

    // De tre modeller som faktiskt är aktiva i ditt Google-konto
    const activeModels = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.1-pro"];
    let lastError: any = null;
    let parsedData = null;

    for (const modelName of activeModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema as any,
          },
        });

        // Kör anropet med intern retry om modellen har en tillfällig trafiktopp (503)
        let attemptResult: any = null;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            attemptResult = await model.generateContent([
              prompt,
              {
                inlineData: {
                  data: base64Image,
                  mimeType: mimeType || "image/jpeg",
                },
              },
            ]);
            break;
          } catch (innerErr: any) {
            const is503 = innerErr?.message?.includes("503") || innerErr?.status === 503;
            if (is503 && attempt === 1) {
              await new Promise((r) => setTimeout(r, 2500));
              continue;
            }
            throw innerErr;
          }
        }

        if (attemptResult) {
          parsedData = JSON.parse(attemptResult.response.text());
          console.log(`Analys genomförd framgångsrikt med: ${modelName}`);
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Modell ${modelName} misslyckades:`, err?.message?.substring(0, 100));
      }
    }

    if (!parsedData) {
      throw lastError || new Error("Kunde inte få svar från AI-tjänsten.");
    }

    return NextResponse.json({ success: true, data: parsedData });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Okänt serverfel";
    console.error("Fel vid bildanalys:", errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}