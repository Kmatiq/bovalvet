import React from 'react';
import { 
  X, 
  Printer, 
  Download, 
  ShieldCheck, 
  FileSpreadsheet, 
  Home, 
  CheckCircle2, 
  AlertTriangle,
  Building,
  Calendar
} from 'lucide-react';
import { InventoryItem, AppSettings } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { exportToCSV, exportToJSON } from '../utils/exportUtils';

interface InsuranceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  settings: AppSettings;
}

export const InsuranceReportModal: React.FC<InsuranceReportModalProps> = ({
  isOpen,
  onClose,
  items,
  settings,
}) => {
  if (!isOpen) return null;

  const totalValue = items.reduce((acc, curr) => acc + (curr.estimatedValue * (curr.quantity || 1)), 0);
  const totalNewPrice = items.reduce((acc, curr) => acc + ((curr.purchasePriceEstimated || curr.estimatedValue * 1.3) * (curr.quantity || 1)), 0);

  // Group by room
  const roomBreakdown = items.reduce((acc, item) => {
    acc[item.room] = (acc[item.room] || 0) + (item.estimatedValue * (item.quantity || 1));
    return acc;
  }, {} as Record<string, number>);

  // High value items (> 5000 kr)
  const highValueItems = items.filter(i => (i.estimatedValue * (i.quantity || 1)) >= 5000);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
        
        {/* Header - Not printed */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/80 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 leading-tight">
                Försäkringsunderlag & Inventarieförteckning
              </h2>
              <p className="text-xs text-stone-500">
                Färdig sammanställning för hemförsäkring, flytt och skadeanmälan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-bold text-stone-800 bg-white hover:bg-stone-100 border border-stone-200 rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-stone-600" />
              Skriv ut / Spara PDF
            </button>
            <button
              onClick={() => exportToCSV(items, settings.homeName)}
              className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center gap-1.5 cursor-pointer"
              title="Exportera till Excel / CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Excel / CSV
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200/60 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6 print:p-0 print:space-y-4">
          
          {/* Document Header */}
          <div className="border-b border-stone-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-700 block">
                Officiellt Inventarieintyg
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight mt-0.5">
                {settings.homeName}
              </h1>
              <p className="text-xs text-stone-500 mt-1 flex items-center gap-2">
                <span>{settings.homeType}, {settings.totalAreaSqm} m²</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Upprättad: {formatDate(new Date().toISOString())}
                </span>
              </p>
            </div>

            <div className="bg-stone-50 print:bg-white p-4 rounded-2xl border border-stone-200 text-right shrink-0">
              <div className="text-[11px] font-bold uppercase text-stone-500">
                Totalt Marknadsvärde
              </div>
              <div className="text-2xl font-black text-stone-900 tracking-tight">
                {formatCurrency(totalValue)}
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">
                Nyanskaffning ca {formatCurrency(totalNewPrice)}
              </div>
            </div>
          </div>

          {/* Insurance Summary Note */}
          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 text-xs text-emerald-950 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Information till försäkringsbolag & skadereglerare:</p>
              <p className="text-emerald-900 leading-relaxed">
                Denna förteckning innehåller fotografiskt verifierade inventarier med tillhörande skick, varumärke, modellbeteckning och serienummer. Värderingen avser bedömt marknadsvärde vid inventeringstillfället.
              </p>
            </div>
          </div>

          {/* Breakdown per room */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900 mb-3 flex items-center gap-1.5">
              <Home className="w-4 h-4 text-amber-600" />
              Fördelning per rum
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(roomBreakdown).map(([room, val]) => (
                <div key={room} className="p-3 bg-stone-50 rounded-xl border border-stone-200/80">
                  <div className="text-xs font-semibold text-stone-600 truncate">{room}</div>
                  <div className="text-sm font-extrabold text-stone-900 mt-0.5">{formatCurrency(Number(val))}</div>
                </div>
              ))}
            </div>
          </div>

          {/* High Value Items Section */}
          {highValueItems.length > 0 && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900 mb-3 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Värdefullt lösöre (&gt; 5 000 kr)
              </h3>
              <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                    <tr>
                      <th className="p-3">Föremål & Modell</th>
                      <th className="p-3 hidden sm:table-cell">Placering</th>
                      <th className="p-3 hidden sm:table-cell">Serienummer</th>
                      <th className="p-3">Skick</th>
                      <th className="p-3 text-right">Värde (SEK)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {highValueItems.map((item) => (
                      <tr key={item.id} className="hover:bg-stone-50/50">
                        <td className="p-3">
                          <div className="font-bold text-stone-900">{item.name}</div>
                          <div className="text-[11px] text-stone-500">{item.brand} {item.model}</div>
                        </td>
                        <td className="p-3 hidden sm:table-cell text-stone-600">{item.room}</td>
                        <td className="p-3 hidden sm:table-cell font-mono text-stone-700">{item.serialNumber || '-'}</td>
                        <td className="p-3 text-stone-700">{item.condition}</td>
                        <td className="p-3 text-right font-bold text-stone-900">
                          {formatCurrency(item.estimatedValue * (item.quantity || 1))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Full Inventory Table */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900 mb-3">
              Komplett inventarielista ({items.length} st)
            </h3>
            <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                  <tr>
                    <th className="p-3">Nr</th>
                    <th className="p-3">Namn & Kategori</th>
                    <th className="p-3 hidden sm:table-cell">Rum</th>
                    <th className="p-3 text-center">Antal</th>
                    <th className="p-3">Skick</th>
                    <th className="p-3 text-right">Totalt värde</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-stone-50/50">
                      <td className="p-3 text-stone-400 font-mono">{idx + 1}</td>
                      <td className="p-3">
                        <div className="font-bold text-stone-900">{item.name}</div>
                        <div className="text-[10px] text-stone-400">{item.category}</div>
                      </td>
                      <td className="p-3 hidden sm:table-cell text-stone-600">{item.room}</td>
                      <td className="p-3 text-center text-stone-700">{item.quantity}</td>
                      <td className="p-3 text-stone-700">{item.condition}</td>
                      <td className="p-3 text-right font-bold text-stone-900">
                        {formatCurrency(item.estimatedValue * (item.quantity || 1))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signature & Verification box */}
          <div className="border-t border-stone-200 pt-6 mt-8 grid grid-cols-2 gap-8 text-xs text-stone-600 print:mt-12">
            <div>
              <p className="font-bold text-stone-900 mb-6">Underskrift försäkringstagare:</p>
              <div className="border-b border-stone-400 w-full mb-1"></div>
              <p className="text-[11px] text-stone-400">Datum & Namnförtydligande</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-stone-900 mb-1">Verifierad via HemKoll AI</p>
              <p className="text-[11px] text-stone-400">
                Digitalt inventarieprotokoll genererat {new Date().toLocaleDateString('sv-SE')}
              </p>
            </div>
          </div>

        </div>

        {/* Modal Footer - Not printed */}
        <div className="p-4 sm:p-5 border-t border-stone-100 bg-stone-50/80 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportToJSON(items, settings)}
              className="px-3.5 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 rounded-xl flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-stone-500" />
              Ladda ner JSON-säkerhetskopia
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-xl"
          >
            Stäng
          </button>
        </div>

      </div>
    </div>
  );
};
