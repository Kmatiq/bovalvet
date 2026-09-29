🏠 PrylKoll
PrylKoll är en modern, mobilanpassad webbapplikation för digital hemma-inventering, garanti- och försäkringshantering samt smart tillgångshantering. Applikationen är byggd med fokus på en friktionsfri användarupplevelse utan tekniskt AI-brus, och hjälper dig att säkra dina ägodelar på riktigt.

✨ Huvudfunktioner
📷 AI-Kameraskanning: Fota valfri pryl för att automatiskt identifiera märke, modell, skick och få ett beräknat nypris samt begagnatvärde via Google Gemini.

⚡ Sömlöst Flöde: Direkt från foto och AI-analys till nysparad pryl med genvägar för att fota kvitto eller fortsätta inventera rummet.

🛡️ Kvitto- & Garantivakten: OCR-tolkning av kvitton som automatiskt fyller i köpdata och bevakar aktiva garantier med varningar innan de löper ut.

🛠️ Villkorad Skötsel & Manual: Visar smarta länkar till officiella PDF-bruksanvisningar enbart för vitvaror, elektronik och maskiner.

🛒 AI-Säljannonsgenerator: Genererar färdiga, säljande rubriker och texter för både Blocket och Tradera.

📄 Det Skarpa Skadepaketet: Incidentläge (vid vattenskada, stöld, brand) som genererar ett formellt PDF-underlag till försäkringsbolaget komplett med kvitton och värden.

👥 Hushållsdelning: Bjud in partner eller sambo via e-post för att dela samma hem och valv.

📦 Funktion G (Offlineläge): Fullt stöd för fältinventering i källarförråd och vindar utan täckning. Prylarna köas lokalt och synkas automatiskt när anslutningen återupptas.

💎 PrylKoll Pro: Inbyggd freemium-modell med betalvägg för obegränsade prylar, flerbostäder och skadepaket.

🛠️ Tech Stack
Frontend: Next.js (React) med App Router

Styling: Tailwind CSS & Lucide Icons

Backend / Databas: Supabase (PostgreSQL) för auth och säker datalagring

AI-motor: Google Gemini API

Integritet: Lokal EXIF-tvätt i webbläsaren (all GPS- och kameradata raderas innan uppladdning)

Rapporter: Klientgenererade PDF-filer med jspdf

🚀 Kom igång (Utveckling)
Klona repositoriet:

Bash
git clone https://github.com/ditt-användarnamn/prylkoll.git
Installera beroenden:

Bash
npm install
Starta utvecklingsservern:

Bash
npm run dev
