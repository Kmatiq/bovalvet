import { NextRequest, NextResponse } from "next/server";

// 3.8 Flash i Googles API
const MODEL_NAME = "gemini-3.8-flash";

export async function POST(req: NextRequest) {
  try {
    const { base64Image, mimeType } = await req.json();

    if (!base64Image) {
      return NextResponse.json({ error: "Ingen bild tillhandahölls" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ 
        error: "GEMINI_API_KEY saknas i .env.local i Codespace" 
      }, { status: 500 });
    }

    const prompt = `
Du är en expert på heminventering, värdering och bildanalys.
Analysera den bifogade bilden noga och identifiera föremål.

UPPGIFT:
1. Identifiera framträdande och inventeringsbara föremål i bilden (max 6 st).
   - Om bilden föreställer ETT enskilt föremål (t.ex. en krukväxt, en vattenkanna, en kaffebryggare, en stol etc.), returnera en lista med bara det föremålet.
   - Om bilden föreställer FLERA distinkta föremål (t.ex. hylla med vattenkanna + kruka, köksbänk etc.), identifiera varje separat föremål. Ignorera oväsentligt bakgrundsbrus och sladdar.

2. För VARJE identifierat föremål måste du ange:
   - box_2d: Bounding box som [ymin, xmin, ymax, xmax] normaliserat till heltal mellan 0 och 1000.
   - title: Koncis svensk benämning (t.ex. "Vattenkanna plast", "Krukväxt Gullranka").
   - category: Kategori (t.ex. Trädgård & Växter, Vitvaror, Hem & Inredning, Elektronik).
   - brand: Tillverkare om synligt/härledbart, annars tomt.
   - model: Modellbeteckning om synligt, annars tomt.
   - estimated_replacement_cost_sek: Uppskattat nypris i SEK idag.
   - market_value_sek: Uppskattat begagnatvärde i SEK.
   - condition: Ett av: "Nyskick", "Mycket gott", "Gott", "Slitage", "Defekt".
   - serial_number_hint: Tips om typskylt/serienummer om tillämpligt, annars tomt.
   - confidence: Tal mellan 0.50 och 0.99.

Returnera ENDAST giltig JSON i exakt detta format:
{
  "items": [
    {
      "box_2d": [200, 150, 800, 600],
      "title": "Vattenkanna",
      "category": "Trädgård & Växter",
      "brand": "",
      "model": "",
      "estimated_replacement_cost_sek": 149,
      "market_value_sek": 50,
      "condition": "Mycket gott",
      "serial_number_hint": "",
      "confidence": 0.92
    }
  ]
}
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

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
      return NextResponse.json({ 
        error: `Google API (${response.status}): ${errText.slice(0, 220)}` 
      }, { status: 502 });
    }

    const rawData = await response.json();
    const candidateText = rawData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return NextResponse.json({ error: "Inget textinnehåll returnerades från AI-modellen." }, { status: 502 });
    }

    const parsed = JSON.parse(candidateText);
    const items = Array.isArray(parsed.items) ? parsed.items : [parsed];

    return NextResponse.json({ success: true, items });
  } catch (err: any) {
    console.error("Analyze Route Error:", err);
    return NextResponse.json({ error: err.message || "Internt serverfel" }, { status: 500 });
  }
}