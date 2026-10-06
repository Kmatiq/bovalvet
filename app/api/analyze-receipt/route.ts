/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { GEMINI_MODEL } from "@/lib/geminiModel";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "GEMINI_API_KEY saknas" },
        { status: 500 }
      );
    }

    const { base64Image, mimeType } = await req.json();
    if (!base64Image) {
      return NextResponse.json(
        { success: false, error: "Ingen kvittofil togs emot" },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const responseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        store: { 
          type: SchemaType.STRING, 
          description: "Butikens namn, t.ex. 'Elgiganten', 'IKEA', 'Power', 'Bauhaus'" 
        },
        purchase_date: { 
          type: SchemaType.STRING, 
          description: "Inköpsdatum i formatet YYYY-MM-DD. Om inget år hittas, använd rimligt antagande." 
        },
        total_amount_sek: { 
          type: SchemaType.NUMBER, 
          description: "Totalt inköpspris i SEK för varan eller kvittots totalsumma" 
        },
        suggested_warranty_months: { 
          type: SchemaType.INTEGER, 
          description: "Garanti i antal månader. Standard i Sverige är 36 månader (Konsumentköplagen) om inget annat framgår." 
        },
        detected_item_name: { 
          type: SchemaType.STRING, 
          description: "Produktnamnet som står på kvittot" 
        }
      },
      required: [
        "store", 
        "purchase_date", 
        "total_amount_sek", 
        "suggested_warranty_months"
      ]
    };

    const prompt = `
Du är en expert på att tolka svenska butikskvitton, fakturor och orderbekräftelser.
Läs av kvittot på bilden noggrant:
1. Identifiera butik / säljare.
2. Hitta inköpsdatum och formatera som YYYY-MM-DD.
3. Hitta totalsumman i Svenska Kronor (SEK).
4. Ange garantiperiod i månader (om uttrycklig garanti anges, annars 36 månader enligt konsumentköplagen).
Svara strikt med det definierade JSON-schemat.
`;

    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema as any,
      },
    });

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType || "image/jpeg",
        },
      },
    ]);

    const parsedData = JSON.parse(result.response.text());
    return NextResponse.json({ success: true, data: parsedData });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Kunde inte tolka kvittot";
    console.error("Fel vid kvittoanalys:", errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}