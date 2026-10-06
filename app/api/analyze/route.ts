import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { GEMINI_MODEL } from "@/lib/geminiModel";
import { ITEM_CATEGORIES } from "@/lib/itemCategories";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

const SYSTEM_INSTRUCTION = `
Du är en expert på inventering och värdering av privat lösöre och heminventarier för BoValvet.
Din uppgift är att identifiera föremål som normalt ingår i ett hem eller privat förråd (lösöre).

STRIKTA REGLER FÖR VAD SOM FÅR IDENTIFIERAS:
1. IDENTIFIERA ENDAST privat lösöre, inventarier och personliga ägodelar (möbler, elektronik, vitvaror, kläder, textilier, verktyg, musikinstrument, cyklar, husgeråd, konst).
2. IGNORERA OCH EXKLUDERA ALLTID TOTALT:
   - Fastigheter, hela byggnader, skyskrapor, torn, fasader, hus och arkitektoniska landmärken.
   - Kollektivtrafikfordon och offentlig infrastruktur (spårvagnar, bussar, tåg, räls, lyktstolpar, gatuskyltar, broar).
   - Registrerade motorfordon i trafik eller på gatan (bilar, lastbilar, mopeder).
   - Bakgrundsutsikter, himmel, horisonter och naturlandskap.
   - Människor och husdjur.

Om bilden ENBART föreställer en utomhusvy, en byggnad, en spårvagn, en gata eller infrastruktur och saknar privat lösöre:
Svara med en tom lista för items: []. Identifiera INTE byggnaden eller fordonet som ett föremål!
`;

interface RawAnalyzedItem {
  title?: string;
  category?: string;
  estimated_replacement_cost_sek?: number;
}

export async function POST(req: NextRequest) {
  try {
    const { base64Image, mimeType = "image/jpeg" } = await req.json();

    if (!base64Image) {
      return NextResponse.json(
        { success: false, error: "Ingen bild tillhandahölls" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            items: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  title: { type: SchemaType.STRING },
                  category: { type: SchemaType.STRING, format: "enum", enum: [...ITEM_CATEGORIES] },
                  brand: { type: SchemaType.STRING },
                  model: { type: SchemaType.STRING },
                  estimated_replacement_cost_sek: { type: SchemaType.NUMBER },
                  market_value_sek: { type: SchemaType.NUMBER },
                  condition: { type: SchemaType.STRING },
                  serial_number_hint: { type: SchemaType.STRING },
                  confidence: { type: SchemaType.NUMBER },
                  box_2d: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.INTEGER },
                  },
                },
                required: [
                  "title",
                  "category",
                  "estimated_replacement_cost_sek",
                  "market_value_sek",
                  "condition",
                  "confidence",
                ],
              },
            },
          },
          required: ["items"],
        },
      },
    });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
      "Identifiera alla privata heminventarier och lösören i denna bild enligt instruktionerna. Ignorera all infrastruktur, fordon i trafik och byggnader.",
    ]);

    const text = result.response.text()?.trim() || "{}";
    const parsed = JSON.parse(text) as { items?: RawAnalyzedItem[] };

    const filteredItems = (parsed.items || []).filter((item: RawAnalyzedItem) => {
      const titleAndCat = `${item.title || ""} ${item.category || ""}`.toLowerCase();
      const isExcluded = /skyskrapa|byggnad|fastighet|spårvagn|tunnelbana|lokaltrafik|bro|väg/i.test(titleAndCat);
      const isExtremePrice = Number(item.estimated_replacement_cost_sek) > 10_000_000;
      return !isExcluded && !isExtremePrice;
    });

    return NextResponse.json({
      success: true,
      items: filteredItems,
    });
  } catch (error: unknown) {
    console.error("Fel vid analys av bild:", error);
    const message = error instanceof Error ? error.message : "Ett fel uppstod vid analys av bilden.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}