import React from 'react';
import { 
  ShieldCheck, 
  Download, 
  Printer, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Barcode,
  Calendar
} from 'lucide-react';
import { InventoryItem, AppSettings } from '../../types';
import { ROOMS_LIST } from '../../data/sampleItems';
import { exportToCSV, exportToJSON } from '../../utils/exportUtils';

interface MobileInsuranceViewProps {
  items: InventoryItem[];
  settings: AppSettings;
  onOpenScanner: () => void;
}

export const MobileInsuranceView: React.FC<MobileInsuranceViewProps> = ({
  items,
  settings,
  onOpenScanner,
}) => {
  const totalValue = items.reduce((acc, curr) => acc + curr.estimatedValue * (curr.quantity || 1), 0);
  const totalNewPrice = items.reduce((acc, curr) => acc + (curr.purchasePriceEstimated || curr.estimatedValue) * (curr.quantity || 1), 0);

  const highValueItems = items.filter(i => i.estimatedValue >= 5000);
  const serialItems = items.filter(i => i.serialNumber && i.serialNumber.trim().length > 0);

  // Room statistics
  const roomStats = ROOMS_LIST.filter(r => r !== 'Alla rum').map(roomName => {
    const rItems = items.filter(i => i.room === roomName);
    const rVal = rItems.reduce((acc, curr) => acc + curr.estimatedValue * (curr.quantity || 1), 0);
    return {
      name: roomName,
      count: rItems.length,
      value: rVal,
      percentage: totalValue > 0 ? Math.round((rVal / totalValue) * 100) : 0,
    };
  }).filter(r => r.count > 0).sort((a, b) => b.value - a.value);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 pb-24 animate-fadeIn text-stone-100">
      
      {/* 1. OFFICIAL PRIVATE WEALTH CERTIFICATE CARD */}
      <div className="bg-gradient-to-br from-[#0d1a16] via-[#10231d] to-[#09120f] border border-emerald-500/50 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-stone-950 flex items-center justify-center shadow-lg shadow-emerald-950/50">
              <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
                Private Wealth Intyg
              </span>
              <h2 className="text-base font-serif font-bold text-stone-100 leading-tight mt-1">
                Lösöresdossier & Inventarieintyg
              </h2>
            </div>
          </div>
          <span className="text-[10px] text-stone-400 font-mono">
            {new Date().toLocaleDateString('sv-SE')}
          </span>
        </div>

        {/* Address and home info */}
        <div className="bg-stone-950/60 rounded-2xl p-3 border border-emerald-500/20 mb-4 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-stone-400 font-medium text-[11px]">Bostad:</span>
              <p className="font-serif font-bold text-stone-100">{settings.homeName || 'Karlatornet Penthouse'}</p>
            </div>
            <div>
              <span className="text-stone-400 font-medium text-[11px]">Residens:</span>
              <p className="font-serif font-bold text-stone-100">{settings.homeType} ({settings.totalAreaSqm} m²)</p>
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-serif font-bold uppercase text-emerald-300 tracking-wider">Marknadsvärde</div>
            <div className="text-xl font-serif font-extrabold text-gold-gradient mt-0.5">
              {totalValue.toLocaleString('sv-SE')} kr
            </div>
          </div>
          <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-serif font-bold uppercase text-stone-400 tracking-wider">Uppskattat Nypris</div>
            <div className="text-xl font-serif font-extrabold text-stone-200 mt-0.5">
              {totalNewPrice.toLocaleString('sv-SE')} kr
            </div>
          </div>
        </div>

        {/* Key Metrics Checkmarks */}
        <div className="space-y-1.5 text-xs text-stone-300 mb-5 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span><strong className="text-stone-100">{items.length} st</strong> verifierade och fotodokumenterade tillgångar</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span><strong className="text-stone-100">{serialItems.length} st</strong> registrerade serienummer / certifikat</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span><strong className="text-stone-100">{highValueItems.length} st</strong> exklusiva värdeföremål specificerade</span>
          </div>
        </div>

        {/* 1-Tap Export buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="py-3 bg-stone-900 hover:bg-stone-850 text-stone-100 rounded-xl text-xs font-serif font-bold flex items-center justify-center gap-1.5 border border-stone-700 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Skriv ut / PDF</span>
          </button>
          <button
            type="button"
            onClick={() => exportToCSV(items, settings.homeName)}
            className="py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 text-stone-950 rounded-xl text-xs font-serif font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 stroke-[2.5]" />
            <span>Exportera Excel</span>
          </button>
        </div>

      </div>

      {/* 2. HIGH VALUE ITEMS SPECIFICATION */}
      <div className="bg-[#121826]/90 border border-stone-800 rounded-3xl p-4 shadow-lg">
        <h3 className="text-xs font-serif font-bold text-stone-100 uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>Specificerade Värdeföremål ({'>'} 5 000 kr)</span>
          <span className="text-[10px] text-amber-300 font-bold bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
            {highValueItems.length} st
          </span>
        </h3>

        <div className="space-y-2">
          {highValueItems.map((item) => (
            <div
              key={item.id}
              className="p-2.5 bg-stone-900/80 rounded-2xl border border-stone-800 flex items-center justify-between text-xs hover:border-amber-500/30 transition-all"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-10 h-10 rounded-xl object-cover shrink-0 border border-stone-700"
                />
                <div className="min-w-0">
                  <div className="font-serif font-bold text-stone-100 truncate">
                    {item.name}
                  </div>
                  <div className="text-[10px] text-stone-400 font-mono truncate">
                    {item.serialNumber ? `Cert/SN: ${item.serialNumber}` : item.room}
                  </div>
                </div>
              </div>
              <div className="font-serif font-bold text-gold-gradient shrink-0 ml-2">
                {item.estimatedValue.toLocaleString('sv-SE')} kr
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. ROOM BREAKDOWN DISTRIBUTION */}
      <div className="bg-[#121826]/90 border border-stone-800 rounded-3xl p-4 shadow-lg">
        <h3 className="text-xs font-serif font-bold text-stone-100 uppercase tracking-wider mb-3">
          Fördelning per zon & rum
        </h3>

        <div className="space-y-3">
          {roomStats.map((room) => (
            <div key={room.name} className="space-y-1 text-xs">
              <div className="flex items-center justify-between font-medium">
                <span className="text-stone-200 font-serif font-bold">{room.name}</span>
                <span className="text-gold-gradient font-serif font-bold">
                  {room.value.toLocaleString('sv-SE')} kr <span className="text-[10px] text-stone-500">({room.percentage}%)</span>
                </span>
              </div>
              <div className="w-full bg-stone-900 h-2 rounded-full overflow-hidden border border-stone-800">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-yellow-500 h-full rounded-full transition-all"
                  style={{ width: `${room.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. BACKUP / EXPORT ALL */}
      <div className="p-3 text-center">
        <button
          type="button"
          onClick={() => exportToJSON(items, settings)}
          className="text-xs font-serif font-bold text-stone-400 hover:text-amber-400 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Spara komplett portföljbackup (JSON)
        </button>
      </div>

    </div>
  );
};
