/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "GEMINI_API_KEY saknas" },
        { status: 500 }
      );
    }

    const item = await req.json();
    if (!item || !item.title) {
      return NextResponse.json(
        { success: false, error: "Inga föremålsuppgifter togs emot" },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const responseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        blocket_title: { 
          type: SchemaType.STRING, 
          description: "Kärnfull och säljande Blocket-rubrik (max 50 tecken)" 
        },
        blocket_body: { 
          type: SchemaType.STRING, 
          description: "Färdig, trevlig och luftig annonstext med tydliga blankrader (dubbla radbrytningar) mellan stycken och egna rader för varje punkt i punktlistor." 
        },
        suggested_price_sek: { 
          type: SchemaType.NUMBER, 
          description: "Rekommenderat säljpris på Blocket i SEK" 
        },
        tradera_title: { 
          type: SchemaType.STRING, 
          description: "Sökordsoptimerad Tradera-rubrik" 
        },
        tradera_body: { 
          type: SchemaType.STRING, 
          description: "Auktionsbeskrivning för Tradera med tydliga radbrytningar och packningsinfo." 
        },
        tradera_start_bid_sek: { 
          type: SchemaType.NUMBER, 
          description: "Föreslaget utropspris på Tradera i SEK" 
        }
      },
      required: [
        "blocket_title", 
        "blocket_body", 
        "suggested_price_sek", 
        "tradera_title", 
        "tradera_body", 
        "tradera_start_bid_sek"
      ]
    };

    const prompt = `
Du är en professionell expert på att sälja begagnat på svenska Blocket och Tradera.
Skapa en säljande och mycket lättläst annons för följande föremål:
- Benämning: ${item.title}
- Kategori: ${item.category}
- Märke: ${item.brand || "Okänt"}
- Modell: ${item.model || "Okänd"}
- Bedömt skick: ${item.condition || "Gott"}
- Uppskattat nypris: ${item.estimated_replacement_cost_sek || "Okänt"} SEK
- Uppskattat begagnatvärde: ${item.market_value_sek || "Okänt"} SEK
- Inköpt: ${item.purchase_date ? `${item.purchase_date} på ${item.purchase_store || "butik"}` : "Ej specificerat"}
- Kvitto/Garanti: ${item.receipt_path ? "Digitalt kvitto finns sparat" : "Inget kvitto"}
- Egna anteckningar: ${item.notes || "Inga"}

KRITISKA FORMATREGLER FÖR ANNONSTEXTEN:
1. Skapa LUFT i texten. Använd dubbla radbrytningar mellan stycken.
2. Formatera specifikationerna som en ren punktlista med varje punkt på en EGEN rad, t.ex:
   • Märke: ...
   • Modell: ...
   • Skick: ...
   • Kvitto: ...
3. Avsluta med ett eget kort stycke om smidig upphämtning / frakt och betalning via Swish.
4. Skriv på naturlig och trevlig svenska.
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-3.8-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema as any,
      },
    });

    const result = await model.generateContent(prompt);
    const parsedData = JSON.parse(result.response.text());

    return NextResponse.json({ success: true, data: parsedData });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Kunde inte skapa annons";
    console.error("Fel vid annonsgenerering:", errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}