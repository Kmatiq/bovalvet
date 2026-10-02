import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, Schema } from "@google/genai";

const ai = new GoogleGenAI();

const itemSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { 
      type: Type.STRING, 
      description: "Kort och tydlig titel på föremålet på svenska, t.ex. 'Kaffebryggare Moccamaster' eller 'Ergonomisk kontorsstol'." 
    },
    category: { 
      type: Type.STRING, 
      description: "Kategori för föremålet (t.ex. Elektronik, Möbler, Husgeråd, Verktyg, Kläder, Belysning, Sport & Fritid)." 
    },
    brand: { 
      type: Type.STRING, 
      description: "Tillverkare eller märke om det syns eller kan identifieras (t.ex. IKEA, Apple, Bosch). Lämna tomt om okänt." 
    },
    model: { 
      type: Type.STRING, 
      description: "Modellnamn eller produktserie om det kan identifieras. Lämna tomt om okänt." 
    },
    estimated_replacement_cost_sek: { 
      type: Type.NUMBER, 
      description: "Uppskattat nypris i SEK för att köpa motsvarande föremål nytt idag." 
    },
    market_value_sek: { 
      type: Type.NUMBER, 
      description: "Uppskattat marknadsvärde / andrahandsvärde i SEK i nuvarande skick." 
    },
    condition: { 
      type: Type.STRING, 
      enum: ["Nyskick", "Mycket gott", "Gott", "Slitage", "Defekt"],
      description: "Visuellt bedömt skick på föremålet." 
    },
    serial_number_hint: { 
      type: Type.STRING, 
      description: "Var användaren typiskt kan hitta serienummer eller typbeteckning på denna typ av produkt." 
    },
    confidence: { 
      type: Type.NUMBER, 
      description: "Säkerhet i identifieringen mellan 0.1 och 1.0." 
    },
    box_2d: {
      type: Type.ARRAY,
      items: { type: Type.INTEGER },
      description: "Avgränsande ruta för föremålet i formatet [ymin, xmin, ymax, xmax] normaliserat till 0-1000."
    }
  },
  required: [
    "title", 
    "category", 
    "estimated_replacement_cost_sek", 
    "market_value_sek", 
    "condition", 
    "confidence"
  ]
};

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: itemSchema,
      description: "Lista över godkända lösören och heminventarier identifierade i bilden."
    }
  },
  required: ["items"]
};

const SYSTEM_INSTRUCTION = `
Du är en expert på inventering och värdering av privat lösöre och heminventarier för BoValvet.
Din uppgift är att identifiera föremål som normalt ingår i ett hem eller privat förråd (lösöre).

STRIKTA REGLER FÖR VAD SOM FÅR IDENTIFIERAS:
1. IDENTIFIERA ENDAST privat lösöre, inventarier och personliga ägodelar (t.ex. möbler, elektronik, vitvaror, kläder, textilier, verktyg, musikinstrument, cyklar, husgeråd, konst, prydnader).
2. IGNORERA OCH EXKLUDERA ALLTID TOTALT:
   - Fastigheter, hela byggnader, skyskrapor, torn, fasader, hus och arkitektoniska landmärken (t.ex. Karlatornet, lägenhetshus, villor).
   - Kollektivtrafikfordon och offentlig infrastruktur (t.ex. spårvagnar, bussar, tåg, räls, lyktstolpar, gatuskyltar, broar, gator).
   - Registrerade motorfordon i trafik eller på gatan (bilar, lastbilar, mopeder).
   - Bakgrundsutsikter, himmel, horisonter och naturlandskap.
   - Människor och husdjur.

Om bilden ENBART föreställer en utomhusvy, en byggnad, en spårvagn, en gata eller infrastruktur och saknar privat lösöre:
Svara med en tom lista för items: []. Identifiera INTE byggnaden eller fordonet som ett föremål!
`;

export async function POST(req: NextRequest) {
  try {
    const { base64Image, mimeType = "image/jpeg" } = await req.json();

    if (!base64Image) {
      return NextResponse.json(
        { success: false, error: "Ingen bild tillhandahölls" },
        { status: 400 }
      );
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
            {
              text: "Identifiera alla privata heminventarier och lösören i denna bild enligt instruktionerna. Ignorera all infrastruktur, fordon i trafik och byggnader."
            }
          ]
        }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2,
      }
    });

    const text = response.text?.trim() || "{}";
    const parsed = JSON.parse(text);

    // Säkerställ att eventuella anomalier inte slipper igenom
    const filteredItems = (parsed.items || []).filter((item: any) => {
      const titleAndCat = `${item.title || ""} ${item.category || ""}`.toLowerCase();
      const isExcluded = /skyskrapa|byggnad|fastighet|spårvagn|tunnelbana|lokaltrafik|bro|väg/i.test(titleAndCat);
      const isExtremePrice = Number(item.estimated_replacement_cost_sek) > 10_000_000;
      return !isExcluded && !isExtremePrice;
    });

    return NextResponse.json({
      success: true,
      items: filteredItems,
    });
  } catch (error: any) {
    console.error("Fel vid analys av bild:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ett fel uppstod vid analys av bilden." },
      { status: 500 }
    );
  }
}