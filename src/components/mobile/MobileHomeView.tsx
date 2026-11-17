import React, { useState } from 'react';
import { 
  Camera, 
  ShieldCheck, 
  Layers, 
  ArrowRight, 
  Plus, 
  TrendingUp, 
  Sparkles,
  ChevronRight,
  MapPin,
  CheckCircle2,
  FileText,
  Building,
  Key,
  Compass,
  Coins
} from 'lucide-react';
import { InventoryItem, AppSettings } from '../../types';
import { ROOMS_LIST } from '../../data/sampleItems';

interface MobileHomeViewProps {
  items: InventoryItem[];
  settings: AppSettings;
  onOpenScanner: () => void;
  onSelectRoom: (room: string) => void;
  onSelectItem: (item: InventoryItem) => void;
  onSwitchTab: (tab: 'items' | 'insurance' | 'settings') => void;
}

interface EstateProfile {
  id: string;
  name: string;
  location: string;
  area: string;
  fee: string;
  loans: string;
  selfSufficiency: string;
  tag: string;
  isSelfSufficient?: boolean;
}

const ESTATES: EstateProfile[] = [
  {
    id: 'karlatornet',
    name: 'Karlatornet Penthouse',
    location: 'Lodjursstråket, Göteborg',
    area: '185 m²',
    fee: '8 650 kr/mån',
    loans: 'Bolån 1, 2, 3',
    selfSufficiency: 'Huvudbostad',
    tag: 'Primärt residens',
  },
  {
    id: 'visby',
    name: 'Södertorg Sekelskifte',
    location: 'Södertorg, Visby',
    area: '110 m²',
    fee: '4 049 kr/mån',
    loans: 'Bolån 4 (Rabatt t.o.m nov -26)',
    selfSufficiency: '118% (Hyra: 9 970 kr + el)',
    tag: 'Kassaflödespositiv',
    isSelfSufficient: true,
  },
  {
    id: 'killingsholmen',
    name: 'Killingsholmen Sjöbod',
    location: 'Skärgården, Göteborg',
    area: '35 m² + brygga',
    fee: '1 000 kr/mån',
    loans: 'Drift 1 000 kr',
    selfSufficiency: 'Rekreation',
    tag: 'Båtliv & Brygga',
  },
  {
    id: 'odensvag',
    name: 'Odensväg Fastighetstomt',
    location: 'Odensväg',
    area: '1 420 m²',
    fee: '0 kr/mån',
    loans: 'Helt obelånad',
    selfSufficiency: 'Byggklar mark',
    tag: '100% Eget kapital',
  }
];

const ROOM_ICONS: Record<string, string> = {
  'Vardagsrum': '🛋️',
  'Kök': '🍳',
  'Sovrum': '🛏️',
  'Barnrum': '🧸',
  'Badrum': '🚿',
  'Hall': '🚪',
  'Kontor / Arbetsrum': '💻',
  'Förråd & Källare': '📦',
  'Garage / Verkstad': '🏎️',
  'Balkong & Trädgård': '🌿',
  'Övrigt': '💎',
};

export const MobileHomeView: React.FC<MobileHomeViewProps> = ({
  items,
  settings,
  onOpenScanner,
  onSelectRoom,
  onSelectItem,
  onSwitchTab,
}) => {
  const [selectedEstateId, setSelectedEstateId] = useState<string>('karlatornet');
  const activeEstate = ESTATES.find(e => e.id === selectedEstateId) || ESTATES[0];

  const totalValue = items.reduce((acc, curr) => acc + curr.estimatedValue * (curr.quantity || 1), 0);
  const totalNewPrice = items.reduce((acc, curr) => acc + (curr.purchasePriceEstimated || curr.estimatedValue) * (curr.quantity || 1), 0);
  
  // Calculate room statistics
  const roomStats = ROOMS_LIST.filter(r => r !== 'Alla rum').map(roomName => {
    const roomItems = items.filter(i => i.room === roomName);
    const roomVal = roomItems.reduce((acc, curr) => acc + curr.estimatedValue * (curr.quantity || 1), 0);
    return {
      name: roomName,
      icon: ROOM_ICONS[roomName] || '🏛️',
      count: roomItems.length,
      value: roomVal,
    };
  }).filter(r => r.count > 0);

  // High value items (> 10 000 kr)
  const highValueCount = items.filter(i => i.estimatedValue >= 10000).length;
  const serialNumberCount = items.filter(i => i.serialNumber && i.serialNumber.trim().length > 0).length;

  // Calculation score for insurance
  const insuranceScore = Math.min(100, Math.round(
    (items.length >= 5 ? 40 : items.length * 8) +
    (serialNumberCount >= 3 ? 30 : serialNumberCount * 10) +
    (items.every(i => i.imageUrl) ? 30 : 15)
  ));

  const recentItems = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);

  return (
    <div className="space-y-5 pb-28 animate-fadeIn text-stone-100">

      {/* 0. FASTIGHETSPORTFÖLJ SELECTOR (PRIVATE WEALTH) */}
      <div className="pt-1">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400/90 flex items-center gap-1.5 font-cinzel">
            <Building className="w-3.5 h-3.5 text-amber-400" /> Fastighetstillgångar
          </span>
          <span className="text-[10px] text-stone-400 font-semibold">
            {ESTATES.length} fastigheter i portföljen
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none no-scrollbar">
          {ESTATES.map((estate) => {
            const isSelected = estate.id === selectedEstateId;
            return (
              <button
                key={estate.id}
                type="button"
                onClick={() => setSelectedEstateId(estate.id)}
                className={`shrink-0 px-3.5 py-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-500/20 via-amber-600/15 to-transparent border-amber-400/60 shadow-md shadow-amber-950/40 ring-1 ring-amber-400/30'
                    : 'bg-[#121826]/90 border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-serif font-bold ${isSelected ? 'text-amber-200' : 'text-stone-300'}`}>
                    {estate.name}
                  </span>
                  {estate.isSelfSufficient && (
                    <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border border-emerald-500/40">
                      118% täckning
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5 flex items-center gap-1.5">
                  <span>{estate.area}</span>
                  <span>•</span>
                  <span className="text-amber-400/80 font-medium">{estate.fee}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* 1. HERO VALUATION CARD - LUXURY PRIVATE WEALTH STYLING */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#121929] via-[#0e1422] to-[#080b12] rounded-3xl p-5 sm:p-6 shadow-2xl border border-amber-500/25 ring-1 ring-amber-500/10">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Header Tag */}
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-cinzel text-[10.5px] uppercase tracking-wider text-amber-300/90 font-bold">
              Private Wealth Valuation
            </span>
          </div>
          <span className="bg-gradient-to-r from-amber-500/20 to-amber-400/10 text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-500/30">
            {activeEstate.name}
          </span>
        </div>

        {/* Big Monetary Value in Playfair Display Serif */}
        <div className="mb-4">
          <div className="text-[11px] text-stone-400 font-medium mb-0.5">
            Totalt uppskattat lösörevärde & värdesaker
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gold-gradient">
              {totalValue.toLocaleString('sv-SE')}
            </span>
            <span className="text-amber-400/90 font-serif font-bold text-base sm:text-lg">
              {settings.currency || 'SEK'}
            </span>
          </div>
        </div>

        {/* Wealth Metrics 4-Column Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-3 px-3.5 bg-stone-950/60 backdrop-blur-md rounded-2xl border border-amber-500/15 mb-4 text-left">
          <div>
            <div className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Nyprisvärde</div>
            <div className="text-xs font-serif font-bold text-stone-100 mt-0.5">
              {totalNewPrice.toLocaleString('sv-SE')} kr
            </div>
          </div>
          <div className="border-l border-stone-800/80 pl-2">
            <div className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Dolt sparande</div>
            <div className="text-xs font-serif font-bold text-emerald-400 mt-0.5">
              +24 500 kr/mån
            </div>
          </div>
          <div className="border-t sm:border-t-0 sm:border-l border-stone-800/80 pt-1.5 sm:pt-0 sm:pl-2">
            <div className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Värdeföremål</div>
            <div className="text-xs font-serif font-bold text-amber-300 mt-0.5">
              {highValueCount} st ({'>'}10k kr)
            </div>
          </div>
          <div className="border-t sm:border-t-0 sm:border-l border-stone-800/80 pt-1.5 sm:pt-0 sm:pl-2">
            <div className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Självförsörjning</div>
            <div className="text-xs font-serif font-bold text-emerald-300 mt-0.5">
              {activeEstate.id === 'visby' ? '118% (Överskott)' : 'Aktiv'}
            </div>
          </div>
        </div>

        {/* Quick action triggers */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onOpenScanner}
            className="flex-1 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:brightness-110 text-stone-950 font-serif font-bold text-xs py-3 px-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4 stroke-[2.5]" />
            <span>Inventera med AI</span>
          </button>

          <button
            type="button"
            onClick={() => onSwitchTab('insurance')}
            className="bg-stone-900/90 hover:bg-stone-800/90 text-stone-200 hover:text-white font-serif font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-amber-500/25 active:scale-95 transition-all"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Bank- & Försäkringsintyg</span>
          </button>
        </div>
      </div>

      {/* Multi-item room scan banner - Executive Look */}
      <button
        type="button"
        onClick={onOpenScanner}
        className="w-full bg-gradient-to-r from-[#0d171c] via-[#121a28] to-[#1a1510] hover:from-[#112028] hover:to-[#221c15] border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between text-left shadow-lg group transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-stone-950 flex items-center justify-center font-bold text-base shadow-md group-hover:scale-105 transition-transform">
            🎯
          </div>
          <div>
            <div className="text-xs font-serif font-bold text-stone-100 flex items-center gap-1.5">
              <span>Markera & identifiera flera objekt i samma foto</span>
              <span className="bg-amber-400/20 text-amber-300 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border border-amber-400/30">
                PRO
              </span>
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5">
              Fota en hel salong eller rum – klicka för att läsa in alla möbler och klockor direkt
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-amber-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
      </button>

      {/* 2. RUMMET / RUMSÖVERSIKT (HORIZONTAL SCROLLING OR GRID) */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h2 className="text-sm font-serif font-bold text-stone-100 flex items-center gap-2">
            <span>Fastighetens Rum & Zoner</span>
            <span className="text-stone-500 text-xs font-normal">({roomStats.length})</span>
          </h2>
          <button
            type="button"
            onClick={() => onSwitchTab('items')}
            className="text-xs font-serif font-bold text-amber-400 hover:text-amber-300 flex items-center gap-0.5"
          >
            <span>Visa alla</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {roomStats.length > 0 ? (
          <div className="grid grid-cols-2 gap-2.5">
            {roomStats.map((r) => (
              <button
                key={r.name}
                type="button"
                onClick={() => {
                  onSelectRoom(r.name);
                  onSwitchTab('items');
                }}
                className="bg-[#121826]/85 hover:bg-[#161f33] border border-stone-800 hover:border-amber-500/40 p-3.5 rounded-2xl text-left shadow-md active:scale-97 transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl group-hover:scale-110 transition-transform">
                    {r.icon}
                  </span>
                  <span className="bg-stone-900/90 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-stone-700">
                    {r.count} st
                  </span>
                </div>
                <div>
                  <div className="font-serif font-bold text-stone-200 text-xs truncate">
                    {r.name}
                  </div>
                  <div className="text-[11px] font-serif font-bold text-gold-gradient mt-0.5">
                    {r.value.toLocaleString('sv-SE')} kr
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-[#121826]/70 border border-dashed border-stone-800 rounded-2xl p-5 text-center">
            <p className="text-xs text-stone-400 mb-2">Inga zoner har inventerats ännu.</p>
            <button
              type="button"
              onClick={onOpenScanner}
              className="text-xs font-serif font-bold text-amber-400 hover:underline inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Fota din första tillgång
            </button>
          </div>
        )}
      </div>

      {/* 3. SENASTE FOTADE LYXPRYLAR */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h2 className="text-sm font-serif font-bold text-stone-100 flex items-center gap-1.5">
            <span>Senast Registrerade Tillgångar</span>
          </h2>
          <button
            type="button"
            onClick={() => onSwitchTab('items')}
            className="text-xs font-serif font-bold text-stone-400 hover:text-amber-400"
          >
            Se alla ({items.length})
          </button>
        </div>

        {recentItems.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
            {recentItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="bg-[#121826]/90 border border-stone-800 hover:border-amber-500/40 rounded-2xl p-2.5 w-40 shrink-0 shadow-md hover:shadow-xl active:scale-95 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-2 bg-stone-900">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-1 left-1 bg-black/75 backdrop-blur-xs text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-amber-400/20">
                    {item.room}
                  </span>
                  {item.serialNumber && (
                    <span className="absolute bottom-1 right-1 bg-black/80 text-emerald-300 text-[8px] font-mono px-1 py-0.2 rounded">
                      VERIFIERAD
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-serif font-bold text-stone-200 text-xs truncate" title={item.name}>
                    {item.name}
                  </div>
                  <div className="text-xs font-serif font-extrabold text-gold-gradient mt-0.5">
                    {item.estimatedValue.toLocaleString('sv-SE')} kr
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#121826]/70 border border-dashed border-stone-800 rounded-2xl p-4 text-center">
            <p className="text-xs text-stone-400 mb-2">Inga tillgångar har registrerats ännu.</p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={onOpenScanner}
                className="text-xs font-serif font-bold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1"
              >
                <Camera className="w-3.5 h-3.5" /> Fota tillgång
              </button>
              <span className="text-stone-600">•</span>
              <button
                type="button"
                onClick={() => onSwitchTab('settings')}
                className="text-xs font-serif font-bold text-stone-400 hover:text-stone-200 inline-flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Fyll portföljdata under Mer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. FÖRSÄKRINGSKOLL & SKYDDSSTATUS (PRIVATE BANKING) */}
      <div 
        onClick={() => onSwitchTab('insurance')}
        className="bg-gradient-to-r from-[#0d1e18] via-[#112720] to-[#0c1814] border border-emerald-500/30 rounded-3xl p-4 shadow-lg cursor-pointer active:scale-98 transition-all hover:border-emerald-400/50"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-400/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-stone-100 text-xs">
                Private Wealth Försäkringsintyg
              </h3>
              <p className="text-[10px] text-emerald-300/80 font-medium">
                Godkänt underlag för Länsförsäkringar & IF Exclusive
              </p>
            </div>
          </div>
          <span className="text-xs font-serif font-black text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-400/40">
            {insuranceScore}% klart
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-stone-900 h-2 rounded-full overflow-hidden mb-2.5 border border-emerald-900/40">
          <div 
            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" 
            style={{ width: `${insuranceScore}%` }} 
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-stone-300 font-medium">
          <span>{highValueCount} st värdeföremål med verifierat intyg</span>
          <span className="text-emerald-300 font-serif font-bold flex items-center gap-1">
            Öppna underlag <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>

    </div>
  );
};
