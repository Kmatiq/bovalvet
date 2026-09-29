# DESIGNREGLER (Måste följas i alla skärmar, modaler och sheets)

- **Brödtext:** 16 px (`text-base`). 
- **Metatext:** 14 px (`text-sm`). **Inget mindre är tillåtet.** Undantag: bottennavigeringens etiketter 13 px.
- **Förbjudna klasser:** `text-xs`, samt alla fasta storlekar mellan `text-[9px]` och `text-[13px]`.
- **Tryckytor:** Minst 44x44 px. Knappar minst 52 px höga (`min-h-[52px]`).
- **Formulärfält:** 52 px höga, 16 px text i fälten (förhindrar iOS-zoom), etikett ovanför på 14 px.
- **Modaler och Sheets:** Byggs som helskärmsvyer eller bottensheets med fast knapp längst ned, aldrig små centrerade rutor som klipper innehållet.
- **Färger och skuggor:** Hämtas enbart från CSS-tokens i `globals.css`. Inga hårdkodade hex-koder direkt i komponenterna.