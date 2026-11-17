export type ItemCondition = 'Nyskick' | 'Mycket bra' | 'Bra' | 'Slitet' | 'Defekt';

export type ItemCategory = 
  | 'Elektronik & Dator'
  | 'Möbler & Inredning'
  | 'Vitvaror & Kök'
  | 'Belysning'
  | 'Kläder & Textil'
  | 'Sport & Fritid'
  | 'Verktyg & Maskiner'
  | 'Konst & Samlarobjekt'
  | 'Smycken & Värdesaker'
  | 'Barn & Leksaker'
  | 'Övrigt';

export type RoomType =
  | 'Alla rum'
  | 'Vardagsrum'
  | 'Kök'
  | 'Sovrum'
  | 'Barnrum'
  | 'Badrum'
  | 'Hall'
  | 'Kontor / Arbetsrum'
  | 'Förråd & Källare'
  | 'Garage / Verkstad'
  | 'Balkong & Trädgård'
  | 'Övrigt';

export interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  room: string;
  condition: ItemCondition;
  quantity: number;
  estimatedValue: number; // in SEK
  purchasePriceEstimated?: number; // in SEK
  purchaseYear?: number;
  description: string;
  imageUrl: string;
  receiptImageUrl?: string;
  serialNumber?: string;
  brand?: string;
  model?: string;
  warrantyUntil?: string;
  tags: string[];
  confidenceScore?: number;
  aiNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIScanAnalysis {
  name: string;
  category: ItemCategory;
  suggestedRoom: string;
  condition: ItemCondition;
  quantity: number;
  estimatedValueSEK: number;
  estimatedNewPriceSEK: number;
  brand?: string;
  model?: string;
  description: string;
  serialNumberDetected?: string;
  tags: string[];
  confidence: number;
  insuranceTip?: string;
}

export interface DetectedImageItem {
  id: string;
  name: string;
  category: ItemCategory;
  suggestedRoom?: string;
  condition?: ItemCondition;
  quantity?: number;
  estimatedValueSEK: number;
  estimatedNewPriceSEK?: number;
  brand?: string;
  model?: string;
  description: string;
  tags: string[];
  xPercent: number; // 0-100
  yPercent: number; // 0-100
  widthPercent?: number; // 0-100
  heightPercent?: number; // 0-100
  confidence: number;
  isSelected?: boolean;
}

export interface AppSettings {
  homeName: string;
  homeType: string;
  totalAreaSqm: number;
  isPremium: boolean;
  freeItemLimit: number;
  currency: string;
}

export type SortOption = 
  | 'newest' 
  | 'oldest' 
  | 'value-desc' 
  | 'value-asc' 
  | 'name-asc' 
  | 'room-asc';
