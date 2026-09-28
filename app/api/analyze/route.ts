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
        brand: { type: SchemaType.STRING, description: "Märke/Tillverkare" },
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
1. Identifiera fabrikat och modell. Om det finns flera föremål, fokusera på det mest framträdande huvudföremålet.
2. Ange realistiska marknadspriser i Svenska Kronor (SEK).
3. Var konservativ i värderingen men realistisk.
4. Ange var typskylt/serienummer vanligen sitter på denna typ av produkt.
Svara uteslutande med det definierade JSON-schemat.
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-3.8-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema as any,
      },
    });

    const maxRetries = 3;
    let parsedData: any = null;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Försöker anropa gemini-3.8-flash (försök ${attempt}/${maxRetries})...`);
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType || "image/jpeg",
            },
          },
        ]);

        const textResponse = result.response.text();
        parsedData = JSON.parse(textResponse);
        if (parsedData) break;
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const isTemporary = errMsg.includes("503") || errMsg.includes("high demand") || errMsg.includes("ResourceExhausted") || err?.status === 503;

        console.warn(`Försök ${attempt} misslyckades:`, errMsg.substring(0, 120));

        if (isTemporary && attempt < maxRetries) {
          // Vänta längre för varje försök (2s, 4s)
          const waitMs = attempt * 2000;
          console.log(`Väntar ${waitMs}ms innan nytt försök på grund av kö hos Google...`);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        } else if (!isTemporary) {
          // Om felet inte är körelaterat (t.ex. ogiltig API-nyckel), avbryt direkt
          break;
        }
      }
    }

    if (!parsedData) {
      const errorText = lastError?.message?.includes("503")
        ? "Googles gratisservrar har tillfälligt hög efterfrågan. Vänta 5-10 sekunder och tryck på 'Försök igen'."
        : (lastError?.message || "Kunde inte tolka bilden.");
      return NextResponse.json({ success: false, error: errorText }, { status: 503 });
    }

    return NextResponse.json({ success: true, data: parsedData });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Okänt serverfel";
    console.error("Fel vid bildanalys:", errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}