import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { url, anonKey } = await req.json();

    const cleanUrl = typeof url === "string" ? url.trim() : "";
    const cleanKey = typeof anonKey === "string" ? anonKey.trim() : "";

    if (!cleanUrl || !cleanKey) {
      return NextResponse.json(
        { error: "Både Supabase URL och Anon Key måste anges." },
        { status: 400 }
      );
    }

    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      return NextResponse.json(
        { error: "Ogiltig Supabase URL. Den måste börja med https://" },
        { status: 400 }
      );
    }

    const envPath = path.join(process.cwd(), ".env.local");
    let existingContent = "";
    if (fs.existsSync(envPath)) {
      existingContent = fs.readFileSync(envPath, "utf-8");
    }

    // Uppdatera eller lägg till variablerna
    const lines = existingContent.split("\n");
    const newLines: string[] = [];
    let hasUrl = false;
    let hasKey = false;

    for (const line of lines) {
      if (line.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) {
        newLines.push(`NEXT_PUBLIC_SUPABASE_URL=${cleanUrl}`);
        hasUrl = true;
      } else if (line.startsWith("NEXT_PUBLIC_SUPABASE_ANON_KEY=")) {
        newLines.push(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${cleanKey}`);
        hasKey = true;
      } else if (line.trim().length > 0) {
        newLines.push(line);
      }
    }

    if (!hasUrl) {
      newLines.push(`NEXT_PUBLIC_SUPABASE_URL=${cleanUrl}`);
    }
    if (!hasKey) {
      newLines.push(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${cleanKey}`);
    }

    fs.writeFileSync(envPath, newLines.join("\n") + "\n", "utf-8");

    return NextResponse.json({
      success: true,
      message: "Supabase-konfiguration sparades i .env.local",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Kunde inte spara konfigurationen." },
      { status: 500 }
    );
  }
}
