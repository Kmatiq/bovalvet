# 🗺️ BoValvet – Roadmap & Projektsteg

Denna fil fungerar som projektets permanenta minne och handlingsplan. Den uppdateras löpande vid varje session så att överenskomna steg och beslut aldrig går förlorade oavsett krascher eller omstarter.

---

## 👥 Målgrupp & Kärnprinciper
- **Målgrupp:** Vanliga bostadsrätts- och villaägare (30–65+ år) utan teknikintresse som vill ha koll på lösöret, garantier och ett vattentätt underlag för försäkringsbolaget.
- **Språk & Tonalitet:** Tryggt, personligt och skandinaviskt. Ordet *"föremål"* används konsekvent (aldrig "prylar", "saker" eller "objekt"). Inga IT-termer (ingen JSON, EXIF, bounding boxes i UI).
- **Designregler (`app/DESIGN.md`):** Minst 52 px höga knappar och fält, inga `text-xs` (minst 14 px för metatext, 16 px brödtext), ren skandinavisk hemma-estetik.

---

## 📌 Aktuell Status (Genomfört)
- [x] **Tema & Branding:** BoValvet-identitet med varmt och ljust skandinaviskt hemmatema (borttagen dark-mode override, ren design).
- [x] **Exporthantering:** Förenklad export till PDF och kalkylark (Excel/CSV) för icke-tekniska användare och försäkringsärenden.
- [x] **Rum & struktur:** Stöd för Garderob, egna anpassade rum och rumsindelad export.
- [x] **Föremålsvy & Redigering (DESIGN.md-efterlevnad):**
  - Större tryckytor (minst 52–56 px).
  - Sekundära tekniska fält samlade i utfällbart dragspel ("Fler uppgifter (valfritt)") med indikatorn "Ifyllt".
  - Borttagning av förbjuden `text-xs` till förmån för tydlig `text-sm` (14 px) och `text-base` (16 px).
  - Centraliserad `openEditItem`-funktion för konsekvent beteende.

---

## 🚀 De 3 Huvudstegen för BoValvet

### 📍 Steg 1: Kameraskanning & Bildinläsning (Seniorvänligt, Multiföremål & "Less is More")
*Fokus: Göra inläsningen lugn, begriplig och helt friktionsfri för alla åldrar. Skrota plottrig bild-klickning och införa 1-klicks-sparande och "ett i taget"-granskning.*
- **Status:** 🟡 Pågående
- **Delmoment:**
  - [x] **"Less is more"-filosofi spikad:** Endast *Benämning*, *Värde* och *Rum* i fokus för användaren. Sekundära tekniska detaljer sparas i bakgrunden utan att störa.
  - [ ] **Skrota plottrigt "Point-and-Pick":** Ta bort små klickytor och siffror på fotot. Istället visas en ren, stor och lugn lista med föremålen AI:n hittat och hemmets nya delsumma.
  - [ ] **1-klicks-sparande ("Spara alla X föremål"):** Möjlighet att med ett enda tryck spara alla hittade föremål direkt till det valda rummet.
  - [ ] **Enkelt stryk-val (`✕ Ta bort`):** Ett enda klick på ett föremålskort för att ta bort det om AI:n råkade ta med något man inte vill spara.
  - [ ] **Lugnt "Ett i taget"-stegningsläge (1 av X):** För användare som vill granska föremålen noggrant ett i taget med stor bild, titel och pris innan de sparas.
  - [ ] **Smart och skarp beskärning (crop):** Säkerställa att närbilder beskärs snyggt utan kapade kanter, och att även gästanvändare som sparar och loggar in får sina närbilder sparade.


---

### 📍 Steg 2: UX- & Flödesförenkling för Hemägare (Snabbhet, Tydlighet & Förtroende)
*Fokus: Enkelhet och belöning vid inventering så att användaren snabbt ser värdet av sitt hem.*
- **Status:** ⏳ Ej påbörjad
- **Delmoment:**
  - [ ] **Direkt feedback vid sparat föremål:** Visa en tydlig bekräftelse på hur hemmets totalvärde ökar (t.ex. *"+14 900 kr tillagt i Vardagsrummet!"*) och ge snabbval: *"Fota nästa föremål i rummet"* eller *"Se rummet"*.
  - [ ] **Enhetlig DESIGN.md på alla modaler:** Gå igenom manuell inläggning, kvittoinläsning och rumsval så att alla följer reglerna för 52px-knappar, 14px-etiketter och helskärm/bottensheets.
  - [ ] **"Nästa steg"-rumsguide:** Förbättra den visuella guiden för heminventering som visar vilka rum som är klara och vilka som saknar inventarier, vilket gör inventeringen lustfylld och stegvis.

---

### 📍 Steg 3: Skade- & Värdesäkring (Försäkringsunderlag, Garantivakt & Export)
*Fokus: Förvandla inventeringen till ett juridiskt och ekonomiskt skydd vid kris.*
- **Status:** ⏳ Ej påbörjad
- **Delmoment:**
  - [ ] **Händelsebaserat Skadepaket:** Göra det möjligt att filtrera/markera specifika skadade föremål (t.ex. "Vattenskada Kök" eller "Inbrott Hall") och generera ett färdigt skadeståndspaket direkt till försäkringsbolagets skadereglerare.
  - [ ] **Garantivakt med svensk konsumenträtt:** Tydlig visuell tidslinje (lagstadgad reklamationsrätt 3 år vs tillverkargaranti) med färgkodade påminnelser när reklamationstiden närmar sig sitt slut.
  - [ ] **Förhandsgranskning i Exportcentret:** Möjlighet att snabbt granska totalsummor och rumsfördelning innan PDF-rapporten eller kalkylarket laddas ned.

---

## 📋 Rutin för sessioner
1. **Vid sessionsstart:** Läs alltid av `ROADMAP.md` för att direkt veta var vi befinner oss.
2. **Under utveckling:** Bocka av delmoment när de är färdigställda och verifierade med `npm run build`.
3. **Vid avslut/commit:** Se till att `ROADMAP.md` speglar det aktuella läget.

