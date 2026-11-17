import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "BOVALVET_DOKUMENTATION.md");
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Dokumentationsfilen hittades inte." },
        { status: 404 }
      );
    }

    const content = fs.readFileSync(filePath, "utf-8");

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": 'attachment; filename="BOVALVET_DOKUMENTATION.md"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Kunde inte läsa filen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
