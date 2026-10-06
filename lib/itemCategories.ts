// Kanonisk kategorilista för BoValvets föremål.
// Används av AI-scheman, standardvärden och export så att kategorier aldrig driver isär.
export const ITEM_CATEGORIES = [
  "Hemelektronik & TV",
  "Datorer & Telefoner",
  "Smycken & Klockor",
  "Möbler & Inredning",
  "Konst & Samlarobjekt",
  "Verktyg & Trädgård",
  "Kläder, Skor & Väskor",
  "Sport & Fritid",
  "Övrigt hem & inredning",
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const DEFAULT_ITEM_CATEGORY: ItemCategory = "Övrigt hem & inredning";
