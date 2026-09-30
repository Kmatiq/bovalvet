import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { base64Image, mimeType } = await req.json();

    if (!base64Image) {
      return NextResponse.json({ error: "Ingen bild tillhandahölls" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY saknas i miljövariabler" }, { status: 500 });
    }

    const prompt = `
Du är en expert på heminventering, värdering och bildanalys.
Analysera den bifogade bilden och identifiera värdefulla föremål.

UPPGIFT:
1. Identifiera alla framträdande och värdefulla föremål i bilden (max 6 st).
   - Om bilden tydligt visar ETT enskilt föremål (t.ex. en närbild på en kaffebryggare, stol, TV eller cykel), returnera en lista med bara det föremålet.
   - Om bilden visar FLERA distinkta föremål (t.ex. en köksbänk, hylla, verktygsvägg), identifiera varje separat pryl. Ignorera oväsentligt skräp och sladdar.

2. För VARJE identifierat föremål måste du ange:
   - box_2d: Bounding box som [ymin, xmin, ymax, xmax] normaliserat till heltal mellan 0 och 1000.
   - title: Koncis svensk benämning (t.ex. "Moccamaster Kaffebryggare", "Bosch Borrmaskin").
   - category: Kategori (t.ex. Vitvaror, Elektronik, Verktyg, Möbler, Ljud & Bild).
   - brand: Tillverkare om synligt/härledbart, annars tomt.
   - model: Modellbeteckning om synligt, annars tomt.
   - estimated_replacement_cost_sek: Uppskattat nypris i SEK idag.
   - market_value_sek: Uppskattat begagnatvärde i SEK baserat på skick.
   - condition: Ett av: "Nyskick", "Mycket gott", "Gott", "Slitage", "Defekt".
   - serial_number_hint: Tips om var typskylt/serienummer brukar sitta.
   - confidence: Tal mellan 0.50 och 0.99.

Returnera ENDAST giltig JSON i exakt detta format:
{
  "items": [
    {
      "box_2d": [320, 150, 780, 520],
      "title": "Moccamaster KBG962",
      "category": "Vitvaror & Hushåll",
      "brand": "Moccamaster",
      "model": "KBG962",
      "estimated_replacement_cost_sek": 2790,
      "market_value_sek": 1400,
      "condition": "Mycket gott",
      "serial_number_hint": "Undersidan av maskinen",
      "confidence": 0.95
    }
  ]
}
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType || "image/jpeg",
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API Error:", errText);
      return NextResponse.json({ error: "Kunde inte analysera bilden hos AI-tjänsten." }, { status: 502 });
    }

    const rawData = await response.json();
    const candidateText = rawData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return NextResponse.json({ error: "Inget giltigt svar från AI-modellen." }, { status: 502 });
    }

    const parsed = JSON.parse(candidateText);
    const items = Array.isArray(parsed.items) ? parsed.items : [parsed];

    return NextResponse.json({ success: true, items });
  } catch (err: any) {
    console.error("Analyze Route Error:", err);
    return NextResponse.json({ error: err.message || "Internt serverfel" }, { status: 500 });
  }
}