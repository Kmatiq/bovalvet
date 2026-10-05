import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { base64Image, mimeType } = await req.json();

    if (!base64Image) {
      return NextResponse.json(
        { success: false, error: "Ingen bild mottogs." },
        { status: 400 }
      );
    }

    const systemInstruction = `
Du är en expert på inventering av svenskt lösöre och heminredning för appen BoValvet.
Din uppgift är att identifiera föremål på bilden som tillhör ett normalt heminnehåll/privat lösöre.

REGLER:
1. Identifiera alla distinkta föremål (möbler, elektronik, belysning, kläder, skor, väskor, konst, husgeråd, vitvaror, verktyg etc.).
2. EXKLUDERA fastigheter, byggnader, fasader, gatumiljö, fordon i kollektivtrafik (t.ex. spårvagnar/bussar) och offentlig miljö.
3. För varje föremål:
   - title: Koncis svensk benämning (t.ex. "Soffbord i ek", "Vinterjacka dun", "Kaffebryggare").
   - category: Kategori (t.ex. "Möbler", "Garderob & Skor", "Elektronik", "Husgeråd").
   - brand: Uppskattat märke om synligt eller troligt, annars tom sträng.
   - model: Modellnamn om synligt, annars tom sträng.
   - estimated_replacement_cost_sek: Rimligt nypris i svenska kronor (SEK). Sätt ALDRIG över 10 000 000 kr.
   - market_value_sek: Uppskattat begagnatvärde i SEK (vanligtvis 30-70% av nypris beroende på typ).
   - condition: Ett av: "Nyskick", "Mycket gott", "Gott", "Slitage", "Defekt".
   - serial_number_hint: Tips på var serienummer/märkskylt brukar sitta på denna typ av föremål.
   - confidence: Tal mellan 0 och 1 (säkerhet i identifieringen).
   - box_2d: Koordinater för föremålet i bilden [ymin, xmin, ymax, xmax] normaliserade mellan 0 och 1000.

Returnera ENBART ett strikt JSON-objekt enligt formatet:
{
  "items": [
    {
      "title": "...",
      "category": "...",
      "brand": "...",
      "model": "...",
      "estimated_replacement_cost_sek": 0,
      "market_value_sek": 0,
      "condition": "Mycket gott",
      "serial_number_hint": "...",
      "confidence": 0.95,
      "box_2d": [ymin, xmin, ymax, xmax]
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: "Identifiera heminventarier och lösöre i denna bild enligt instruktionerna." },
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType || "image/jpeg",
              },
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text || "{}";
    const parsed = JSON.parse(responseText);

    return NextResponse.json({
      success: true,
      items: parsed.items || [],
    });
  } catch (error: any) {
    console.error("Fel vid bildanalys:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Ett oväntat fel uppstod vid analys av bilden.",
      },
      { status: 500 }
    );
  }
}