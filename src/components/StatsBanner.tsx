import React from 'react';
import { ShieldCheck, TrendingUp, Home, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { InventoryItem, AppSettings } from '../types';

interface StatsBannerProps {
  items: InventoryItem[];
  settings: AppSettings;
  onOpenReport: () => void;
}

export const StatsBanner: React.FC<StatsBannerProps> = ({ items, settings, onOpenReport }) => {
  const totalValue = items.reduce((sum, item) => sum + (item.estimatedValue * (item.quantity || 1)), 0);
  const totalNewPrice = items.reduce((sum, item) => sum + ((item.purchasePriceEstimated || item.estimatedValue * 1.4) * (item.quantity || 1)), 0);
  
  // Unique rooms
  const roomsCount = new Set(items.map(i => i.room)).size;

  // Typical Swedish insurance guideline: 1500 kr - 2500 kr per sqm in lösegendom
  const estimatedMinInsured = settings.totalAreaSqm * 2500;
  const isValueBelowExpected = totalValue < estimatedMinInsured * 0.4 && items.length < 15;

  return (
    <div className="bg-gradient-to-b from-stone-100/90 to-stone-50/50 border-b border-stone-200/70 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top welcome line */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-stone-600 text-xs sm:text-sm font-medium">
              <Home className="w-4 h-4 text-amber-700" />
              <span>{settings.homeName} ({settings.homeType}, ca {settings.totalAreaSqm} m²)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight mt-0.5">
              Hemmets sammanlagda lösöre
            </h2>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Försäkringsunderlag redo
            </span>
          </div>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Card 1: Total Value */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Uppskattat Nuvärde</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                {formatCurrency(totalValue)}
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Baserat på {items.length} inventarier
              </p>
            </div>
          </div>

          {/* Card 2: New Replacement Value */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Nyanskaffningsvärde</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                {formatCurrency(totalNewPrice)}
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Om allt köps nytt i butik
              </p>
            </div>
          </div>

          {/* Card 3: Room Coverage */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Täckta Rum</span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-purple-700">
                <Home className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                {roomsCount} <span className="text-sm font-normal text-stone-500">aktiva rum</span>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                {items.length} st totala artiklar
              </p>
            </div>
          </div>

          {/* Card 4: Insurance Status & Action */}
          <div 
            onClick={onOpenReport}
            className="bg-stone-900 text-white p-4 sm:p-5 rounded-2xl border border-stone-800 shadow-sm flex flex-col justify-between cursor-pointer hover:bg-stone-800 transition-colors group"
          >
            <div className="flex items-center justify-between text-stone-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">Hemförsäkring</span>
              <ShieldCheck className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                Skapa Skadeunderlag
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Klicka för att skriva ut eller exportera PDF
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
