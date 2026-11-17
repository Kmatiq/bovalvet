# 📘 BoValvet – Komplett Projektdokumentation, Historia & Teknisk Analys

**Senast uppdaterad:** 2026-11-17  
**Kodbas / Applikation:** BoValvet (`bovalvet` v0.1.0)  
**GitHub-repo:** `Kmatiq/bovalvet` (branch `main`)  
**Källa för sanningen:** GitHub-repot. AI Studio används inte längre (se avsnitt 4.6).  

> Dokumentet skrevs ursprungligen av AI-assistenten i AI Studio och har därefter granskats mot koden på GitHub och rättats där det inte stämde.

---

## 1. 🎯 Syfte, Vision & Målgrupp

**BoValvet** är en mobilanpassad webbapplikation ("mobile-first" med 480 px mobilskal) för digital heminventering, kvitto- och garantihantering samt försäkringssäkring av privat lösöre.

### Vilket problem löser appen?
De flesta villa- och bostadsrättsägare är omedvetet underförsäkrade och saknar överblick över värdet på sitt lösöre tills en olycka (brand, inbrott, vattenskada) faktiskt inträffar. Vid en skadehändelse kräver försäkringsbolagen detaljerade underlag med inköpsdatum, nypris, märke/modell och kvitton.

### Målgrupp
* **Primär målgrupp:** Vanliga bostadsrätts- och villaägare i Sverige (ca 30–65+ år) utan särskilt teknikintresse.
* **Kärnvärden:** Trygghet, enkelhet, skandinavisk värme och noll tekniskt krångel.

---

## 2. ✨ Huvudfunktioner i nuvarande version

Baserat på faktisk genomgång av koden (`app/page.tsx`, `app/api/*`, `lib/*`) finns följande funktioner implementerade:

### A. AI-kameraskanning (Enskilda & flera föremål)
* Fota ett enskilt föremål eller ett helt rum/hylla via mobilkamera eller välj från bildbibliotek.
* **Klientsidig bildsäkring (`lib/sanitizeImage.ts`):** All bilddata ritas om i HTML5 Canvas lokalt i webbläsaren innan uppladdning. Detta **tvättar bort känslig EXIF- och GPS-metadata** och skalar bilden till max 2048 px (JPEG-kvalitet 0.88).
* **AI-analys (`/api/analyze`):** Använder Google Gemini (`gemini-3.8-flash` via `@google/genai`) för att identifiera flera föremål samtidigt, beräkna nypris och begagnatvärde i SEK, bedöma skick, tipsa om var serienummer sitter samt returnera normaliserade koordinater (`box_2d`) för automatisk beskärning av närbilder.
* **Filtrering:** AI:n och klienten filtrerar automatiskt bort byggnader, kollektivtrafik och orimliga värden (> 10 Mkr).

### B. Multi-föremålsflöde & Bekräftelse
* **Översiktsvy:** Visar det tagna fotot (utan rutor eller siffror), en lugn lista med stora föremålskort, sammanlagt nypris, hemmets värde efter sparande och möjlighet att ta bort enstaka felträffar (`✕`).
* **Två sparvägar:**
  1. **Steg-för-steg-genomgång ("1 av X"):** Gå igenom ett föremål i taget med stor beskuren bild, redigera namn/värde, fota kvitto direkt och klicka dig vidare.
  2. **1-klickssparande:** *"Spara alla X direkt som de är"*.
* **Bekräftelsekort ("Dopaminkortet"):** Visar direkt efter sparande hur många föremål som lagts till, hur mycket värdet ökade i rummet, samt snabbval för att fota nästa eller gå till rummet.

### C. Kvitto-OCR & Garantivakt
* **Kvittoavläsning (`/api/analyze-receipt`):** Fotografera eller ladda upp kvitto. AI tolkar butik, inköpsdatum, belopp och garantiperiod.
* **Svensk konsumenträtt:** Tillämpar automatiskt 36 månaders lagstadgad reklamationsrätt (Konsumentköplagen) som bas om ingen längre tillverkargaranti anges.
* **Försäkrings- & Garantivy:** Färgkodad översikt över aktiva garantier, garantier som snart går ut samt koppling mot bostadens försäkringsbelopp (varnar vid risk för underförsäkring) och självrisk.

### D. Hem, Rum & Flerbostadsstöd
* **Flera bostäder (`properties`):** Skapa och växla mellan t.ex. bostadsrätt, villa och fritidshus – med separata försäkringsbolag, försäkringsnummer, boarea (kvm) och lösöresbelopp. Möjlighet att flytta föremål mellan hem.
* **Rumshantering:** Standardrum (inkl. *Garderob*, *Garage*, *Balkong / Altan*) samt möjlighet att lägga till egna rum (med automatisk emoji-matchning) och radera tomma rum.
* **Arkiv & Sålda föremål:** Arkivera sålda/kasserade föremål i stället för att radera historiken permanent.

### E. Exportcenter & Skarp Skadeanmälan (`lib/exportVault.ts`)
* **Färdig PDF-rapport:** Genererar inventarielista sorterad och grupperad per rum med summeringar.
* **Kalkylark (Excel / Numbers):** Exporterar semikolonseparerad CSV med UTF-8 BOM så svenska tecken (`å, ä, ö`) öppnas korrekt i svenskt Excel/Numbers.
* **Det Skarpa Skadepaketet (`generateIncidentPdf`):** Händelsebaserad PDF-rapport för försäkringsbolag vid inbrott, brand eller vattenskada – med valbara skadade föremål, polisrapportnummer, sammanställning, kvittostatus och signaturrad.

### F. Säljannonsgenerator (`/api/generate-listing`)
* Genererar färdiga, luftiga säljannonser och prisförslag på svenska anpassade för **Blocket** (rubrik, brödtext, riktpris) och **Tradera** (auktionstext, utropspris) med ett klick för kopiering.

---

## 3. 🛠️ Teknisk Arkitektur & Datamodell

### Tech Stack
* **Ramverk:** Next.js 16.3.6 (App Router, Turbopack), React 19.2.8, TypeScript 5
* **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`), design-tokens i `app/globals.css`, ikoner via `lucide-react`
* **Databas, Auth & Lagring:** Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
* **AI:** Google Gemini (`gemini-3.8-flash`) via server-side API Routes
* **PDF:** `jspdf` + `jspdf-autotable`

### API-routes & Serverlogik
| Fil | Funktion |
| :--- | :--- |
| `app/api/analyze/route.ts` | Bildanalys av 1 eller flera föremål + bounding boxes (`@google/genai`) |
| `app/api/analyze-receipt/route.ts` | OCR-tolkning av svenska kvitton (`@google/generative-ai`) |
| `app/api/generate-listing/route.ts` | Generering av Blocket- och Tradera-annonser (`@google/generative-ai`) |
| `app/actions/analyzeItemAction.ts` | Äldre Server Action för enskild föremålsanalys (används inte längre) |

Supabase-nycklarna (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) och `GEMINI_API_KEY` ligger i Vercels miljövariabler för produktion och i `.env.local` lokalt. De matas aldrig in via appens gränssnitt.

### Supabase-struktur (Förväntat schema)
* **Tabell `properties`:** Bostäder kopplade till `user_id` (`name`, `property_type`, `address`, `living_area_sqm`, `insurance_company`, `policy_number`, `coverage_limit_sek`, `deductible_sek`).
* **Tabell `items`:** Inventerade föremål kopplade till `user_id` och `property_id` (`title`, `category`, `room`, `brand`, `model`, `estimated_replacement_cost_sek`, `market_value_sek`, `condition`, `serial_number`, `serial_number_hint`, `notes`, `purchase_date`, `purchase_store`, `purchase_price_sek`, `warranty_months`, `receipt_path`, `image_path`, `photo_path`, `image_paths`, `is_archived`).
* **Tabell `property_members`:** Hushållsmedlemmar/delning (`property_id`, `user_email`, `role`).
* **Storage Bucket `item-photos`:** Privat bucket för föremålsbilder, beskurna närbilder och kvitton. Hämtas med tidsbegränsade `createSignedUrl(..., 3600)`.

---

## 4. 📜 Projektets Historia & Tidigare Steg

Nedan sammanfattas projektets utvecklingsresa från start till nuvarande läge:

1. **Grundversion (Heminventering AI):**
   * Startade som en enklare inventeringsapp i AI Studio (som bygger på en Vite/Express-mall). Appen hette under en period **PrylKoll**.
   * Migrerades till Next.js App Router med Supabase Auth/Database/Storage och Gemini-bildigenkänning.

2. **Varumärkesbyte & Skandinaviskt Designlyft ("BoValvet"):**
   * Fick det nuvarande namnet **BoValvet** och ett varmt, ljust skandinaviskt färgtema (`#F9F5EF` bakgrund, `#2B574A` skogsgrön primärfärg, `#D9543B` accent).
   * Riktlinjer spikades i `app/DESIGN.md`, `README.md` och `ROADMAP.md`: bort med mörka overrides och IT-jargong, konsekvent användning av *"föremål"* och *"inventerade"*.

3. **Funktionell expansion:**
   * Tillägg av **Garderob**, egna anpassade rum och rumsindelad PDF-/CSV-export (`lib/exportVault.ts`).
   * Tillägg av **Kvitto-OCR**, svensk 36-månaders reklamationsrätt, **Skadeanmälan-PDF**, **Säljannonsgenerator** och flerbostadsstöd.
   * Införande av **Multi-föremålsflöde** med automatisk bildbeskärning (`box_2d`), steg-för-steg-granskning och 1-klickssparande.

4. **GitHub-synk & Felsökning i AI Studio:**
   * Koden hämtades in från GitHub (`Kmatiq/bovalvet` branch `main`).
   * **Problem som uppstod:**
     * `.env.local` fanns inte i repot (korrekt säkerhetspraxis), vilket gjorde att Supabase saknade nycklar.
     * Tailwind v4 / PostCSS / Next.js 16-konfigurationen krånglade vid dev-start.
     * En AI-session lade till ett tillfälligt "offlineläge / lokalt gästläge" och "Exempelhem (Demo)" i `app/page.tsx` samt råkade introducera ett scoping-/hoisting-fel där `fetchProperties` och `fetchPropertyMembers` anropades före sin deklaration. I React 19 orsakade detta en tyst hydration-krasch som gjorde att sidan renderades som ostylead HTML och **inga knappar fungerade**.

5. **Återställning & Reparation i AI Studio:**
   * Bygg- och Tailwind-konfigurationen fixades så `next build` och dev-servern startar rent.
   * Hoisting-felet i `app/page.tsx` löstes genom att flytta `fetchVaultStats`, `fetchVaultItems`, `fetchProperties` och `fetchPropertyMembers` ovanför `useEffect`.
   * **Allt oönskat offlineläge, lokalt gästsparande och demo/exempelhem togs bort** på användarens tydliga begäran (*"detta är en skarp APP"*).
   * En `/api/setup-supabase`-route och en modal skapades så Supabase URL och Anon Key kunde matas in i gränssnittet. *(Togs inte med till GitHub – se punkt 6.)*

6. **Samordning AI Studio ↔ GitHub (2026-11-17):**
   * Det visade sig att ändringarna i AI Studio **aldrig hade pushats till GitHub**. GitHub-versionen (senaste commit 5 okt 2026) var den som låg i drift på Vercel, och inloggning och Supabase-koppling fungerade där.
   * Hela AI Studio-versionen sparades oförändrad som säkerhetskopia på grenen **`aistudio-backup`** (ska inte slås ihop).
   * Endast de bra delarna fördes över till GitHub-versionen:
     * Offlineläget togs bort helt (offline-kö, banner "Offlineläge aktivt"). Samtidigt slutade appen att visa ett påhittat föremål ("Föremål (Sparat offline)", 1 000 kr) när bildanalysen misslyckades – nu visas i stället ett tydligt felmeddelande.
     * Knappen **"Lägg till föremål manuellt"** lades till under "Fota ditt första föremål" (52 px enligt `DESIGN.md`).
     * `fetchProperties`, `fetchPropertyMembers`, `fetchVaultStats` och `fetchVaultItems` flyttades upp ovanför de `useEffect` som använder dem.
   * **Medvetet bortvalt:** Supabase-inställningar i gränssnittet (`/api/setup-supabase`, nycklar i `localStorage`, rutan "Anslut till ditt Supabase-moln"), halvt borttagen demo-/lokal föremålslagring (`bovalvet_local_items`), `/api/download-docs`, Vite-rester (`src/`, `server.ts`, `vite.config.ts`, `index.html`, `metadata.json`, `bun.lock`) samt avstängd TypeScript-strikthet (`strict: false`).
   * **Beslut:** AI Studio används inte längre. All utveckling sker mot GitHub-repot.
   * Grenen **`Deep-Code`** (6 okt 2026, "städa, harmonisera och typa kodbasen") finns kvar på GitHub men är inte ihopslagen med `main`. Den tar bl.a. bort `ROADMAP.md` och behöver granskas innan den används.

---

## 5. 📌 Färdigställda Steg vs. Kvarvarande i Roadmap

Jämförelse mellan dokumentet `ROADMAP.md` och vad som **faktiskt** är byggt i `app/page.tsx`:

### ✅ Färdigställt (även delar som ej bockats av i `ROADMAP.md`)
* [x] **Skandinaviskt tema, branding & exportcenter** (PDF + Excel/Numbers CSV grupperat per rum).
* [x] **Garderob, egna rum & radering av rum.**
* [x] **Föremålsvy med dragspel ("Fler uppgifter (valfritt)")** och centraliserad `openEditItem`.
* [x] **1-klickssparande för multiföremål:** Knappen *"Spara alla X direkt som de är"* är implementerad.
* [x] **Enkelt stryk-val (`✕`):** Fungerande knapp för att ta bort enskilda föremål från AI-resultatet.
* [x] **Lugnt "Ett i taget"-stegningsläge (1 av X):** Fullt implementerad guidad genomgång med stor beskuren bild, redigering och kvittofoto per steg.
* [x] **Smart bildbeskärning & gäst-till-konto-synk:** Beskurna bilder skapas i Canvas och `bovalvet_pending_guest_item` sparar fotade föremål tillfälligt i webbläsaren tills inloggning slutförs. *(Öppen fråga: är detta tillfälliga gästsparande tillåtet enligt regel 6A.1, eller ska inloggning krävas innan man fotar?)*
* [x] **Direkt feedback vid sparat föremål ("Dopaminkortet"):** Visar `+X kr tillagt i [Rum]` samt snabbknappar efter sparning.
* [x] **Händelsebaserat Skadepaket (PDF):** Stöd för att välja skadetyp, skadade föremål och generera komplett försäkrings-PDF.
* [x] **Skarp Supabase-integration:** Offlineläge och påhittade föremål borttagna; nycklar via Vercels miljövariabler / `.env.local`.
* [x] **Manuell inläggning från startsidan:** Knappen "Lägg till föremål manuellt" i välkomstvyn.

### 🟡 Pågående / Delvis kvar enligt `ROADMAP.md`
* [x] **Skrota plottrigt "Point-and-Pick":** Klart 2026-11-17. Översiktsfotot visas utan rutor och siffror; i stället en lugn lista med stora föremålskort (närbild, namn, pris, ✕), sammanlagt nypris och hemmets värde efter sparande. Huvudknappen är nu "Spara alla X föremål" och "Granska ett i taget" är alternativet.
* [ ] **Enhetlig `DESIGN.md`-efterlevnad på alla modaler:** Flera modaler är fortfarande centrerade kort (`items-center justify-center`) i stället för helskärm/bottensheets, och det finns fortfarande ~53 förekomster av `text-xs` / `text-[10px]`–`text-[12px]` (plus 7 st `text-[13px]`) kvar i `app/page.tsx` (trots att `globals.css` har ett nödnät med `!important` som tvingar upp `.text-xs` till `14px`).
* [ ] **"Nästa steg"-rumsguide & Tidslinje för garantivakt:** Försäkrings- och garantivyn har trafikljusstatus, men en mer visuell steg-för-steg-rumsguide och tidslinje mellan 3 års reklamationsrätt och tillverkargaranti kan förfinas.
* [ ] **Förhandsgranskning i Exportcentret:** Tydligare förhandsvisning av totalsummor/rum innan nedladdning.
* [x] **Uppdatera `ROADMAP.md`:** Punkterna som redan är klara i koden är avbockade (2026-11-17).

---

## 6. 🤖 Instruktioner & Regler för Projektet & AI-assistenten

Dessa regler måste alltid följas vid fortsatt utveckling av BoValvet:

### A. Verksamhets- & Produktregler (Från användaren)
1. **Strikt skarp produktionsapp:** **Skapa ALDRIG** offlinelägen, lokalt gästsparande i `localStorage` som ersättning för databas, eller "Ladda exempelhem / Demo"-knappar. All data ska gå via Supabase Auth, PostgreSQL och Storage.
2. **Svenska användare utan teknikvana:**
   * Använd alltid ordet **"föremål"** (aldrig "prylar", "saker", "objekt").
   * Formulera antal som **"inventerade"** (t.ex. *"12 föremål inventerade"*).
   * **Ingen IT-jargong i UI:** Aldrig JSON, EXIF, UTF-8 BOM, bounding boxes eller databasnamn i texter till slutanvändaren.
3. **Permanent projektminne (`CLAUDE.md`):** Läs alltid `ROADMAP.md`, `app/DESIGN.md` och `AGENTS.md` innan större ändringar.
4. **GitHub är enda källan:** Ingen utveckling i AI Studio. Allt arbete görs mot `Kmatiq/bovalvet` och verifieras med `npm run build` innan det slås ihop med `main`.

### B. Designregler (`app/DESIGN.md`)
* **Brödtext:** Minst `16px` (`text-base`). **Metatext:** Minst `14px` (`text-sm`).
* **Förbjudet:** `text-xs` och fasta storlekar `9px–13px` (undantag: bottennavigeringens etiketter `13px`).
* **Tryckytor:** Minst `44x44px`; primära knappar och fält minst `52px` (`min-h-[52px]`). Text i inputfält måste vara `16px` för att slippa iOS auto-zoom.
* **Färger:** Använd CSS-variablerna i `app/globals.css` (`--color-bg`, `--color-primary`, etc.), inga hårdkodade hex-färger i komponenterna.

### C. Tekniska miljöregler (Next.js / Vercel)
* Hemliga nycklar (`GEMINI_API_KEY`) får **aldrig** exponeras till klienten (`NEXT_PUBLIC_`). All AI-kommunikation ska ske i `app/api/*`.
* Publika Supabase-nycklar (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) lagras i Vercels miljövariabler och lokalt i `.env.local` (som aldrig ska pushas till GitHub). De ska aldrig kunna matas in eller ändras via appens gränssnitt.
* Dev-servern körs på port `3000`. Verifiera alltid kodändringar med build/typkontroll och lint.

---

## 7. ⚖️ Ärlig Granskning: Vad som är BRA vs. DÅLIGT

### ✅ Vad som är BRA
1. **Stark produktidé & tydlig nisch:** BoValvet träffar ett konkret svenskt behov (hemförsäkring, konsumentköplagen 3 år, skadeunderlag, Blocket/Tradera) med en ovanligt genomtänkt tonalitet.
2. **Designsystem & Färgpalett:** `globals.css` och `DESIGN.md` ger ett varmt, lugnt och förtroendeingivande skandinaviskt intryck – långt ifrån generiska "tech-mörka" AI-appar.
3. **Integritet i världsklass för bilder:** Klientsidig EXIF-tvätt i Canvas (`sanitizeImage.ts`) i kombination med privat Supabase Storage-bucket och signerade URL:er är helt rätt arkitektur för känsliga hembilder.
4. **Riktig nytta i outputen:** Exportcentret (`exportVault.ts`) med rumsindelad PDF, svensk CSV (semikolon + BOM) och komplett skadepaket med signaturrad är genuint användbart mot ett försäkringsbolag.
5. **Bra AI-prompting & skydd:** API-routes returnerar strikta JSON-scheman och har spärrar mot absurda värderingar och felkategorier (t.ex. fastigheter/kollektivtrafik).

### ❌ Vad som är DÅLIGT / Teknisk skuld att åtgärda
1. **Enorm monolit i `app/page.tsx` (~4 700 rader):**
   * Hela applikationens state (~50+ `useState`), all affärslogik, Supabase-anrop och samtliga vyer/modaler ligger i **en enda fil**.
   * *Konsekvens:* Svårt att underhålla, lätt att introducera buggar (som det tidigare hoisting-felet), och `npm run lint` klagar på React-hooks-mönster (`react-hooks/set-state-in-effect`, saknade deps, oanvända variabler).
   * *Lösning:* Bryt ut komponenter till `components/` (t.ex. `VaultListView`, `MultiScanReview`, `InsuranceView`, `EditItemSheet`, `ExportModal`, `AuthModal`).
2. **Kvarlämnade/dubbletter av gamla filer i repot:**
   * *(Vite/Express-resterna fanns bara i AI Studio och har aldrig legat på GitHub.)*
   * Det finns **två PDF-bibliotek** (`lib/exportVault.ts` som används, och `lib/generatePdfReport.ts` som verkar vara en äldre dubblett).
   * Det finns en oanvänd Server Action (`app/actions/analyzeItemAction.ts`) bredvid `app/api/analyze/route.ts`.
3. **Blandade Google Gemini SDK:er:**
   * `app/api/analyze/route.ts` använder det moderna `@google/genai`, medan `analyze-receipt`, `generate-listing` och `analyzeItemAction` använder det äldre `@google/generative-ai`. Båda ligger i `package.json`. Dessa bör enas till `@google/genai`.
4. **Lint-fel & TypeScript-genvägar:**
   * `eslint-disable @typescript-eslint/no-explicit-any` används högst upp i flera filer, och `npm run lint` passerar inte med exit code 0 idag (p.g.a. `any`-typer i `lib/exportVault.ts` / `lib/supabaseClient.ts` och `setState`-mönster i `useEffect`).
5. **README stämde inte med koden:** README angav `gemini-2.5-flash` medan koden använder `gemini-3.8-flash` (rättat 2026-11-17).
6. **Delning mellan hushållsmedlemmar (`property_members`) är halvfärdig:**
   * Det finns funktioner för `fetchPropertyMembers` och `handleInviteMember` i `app/page.tsx`, men `handleInviteMember` är oanvänd (lintvarning) – UI:t för att bjuda in familjemedlemmar är alltså inte färdigkopplat eller är borttaget från vyn.
7. **`DESIGN.md` följs inte till 100 % överallt:**
   * Trots förbudet i `DESIGN.md` finns 69 förekomster av `text-xs` / `text-[11px]` kvar i `app/page.tsx`, och vissa modaler är fortfarande centrerade rutor snarare än riktiga bottensheets/helskärmar.
8. **Egna rum sparas bara i webbläsaren:** Egna rum och borttagna rum (`bovalvet_custom_rooms`, `bovalvet_removed_rooms`) ligger i `localStorage` och följer inte med till en annan telefon eller dator. Bör flyttas till Supabase.

---

## 8. 🧭 Rekommenderade Nästa Steg

1. **Supabase-nycklar:** ✅ Fungerar i produktion på Vercel (inloggning och föremål bekräftade 2026-11-17).
2. **Städa upp kodbasen (Teknisk skuld):**
   * Dela upp `app/page.tsx` i mindre moduler under `app/components/` eller `components/`.
   * Ta bort döda/dubblerade filer (`lib/generatePdfReport.ts`, `app/actions/analyzeItemAction.ts`) som inte längre används.
   * Ta ställning till grenen `Deep-Code`.
   * Migrera `analyze-receipt` och `generate-listing` till `@google/genai` och ta bort `@google/generative-ai`.
3. **Färdigställ `ROADMAP.md`-detaljer:**
   * Slutför eller dölj `property_members`-inbjudningar tills RLS-policyn i Supabase är testad.
   * Åtgärda ESLint-felen så `npm run lint` går igenom utan fel.
