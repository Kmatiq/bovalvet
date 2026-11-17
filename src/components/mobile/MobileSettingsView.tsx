import React, { useState } from 'react';
import { 
  Home, 
  Crown, 
  FileSpreadsheet, 
  Download, 
  Upload, 
  RotateCcw, 
  Sparkles, 
  ShieldCheck, 
  HelpCircle, 
  Check, 
  Save,
  ChevronRight,
  Trash2,
  Database
} from 'lucide-react';
import { AppSettings, InventoryItem } from '../../types';
import { exportToCSV, exportToJSON } from '../../utils/exportUtils';
import { INITIAL_SAMPLE_ITEMS } from '../../data/sampleItems';

interface MobileSettingsViewProps {
  settings: AppSettings;
  items: InventoryItem[];
  onUpdateSettings: (newSettings: AppSettings) => void;
  onLoadDemoData: () => void;
  onClearAllData: () => void;
  onResetData: () => void;
  onImportData: (items: InventoryItem[], settings?: AppSettings) => void;
  onOpenExpertAdvice: () => void;
  onOpenPremium: () => void;
}

export const MobileSettingsView: React.FC<MobileSettingsViewProps> = ({
  settings,
  items,
  onUpdateSettings,
  onLoadDemoData,
  onClearAllData,
  onResetData,
  onImportData,
  onOpenExpertAdvice,
  onOpenPremium,
}) => {
  const [homeName, setHomeName] = useState(settings.homeName);
  const [homeType, setHomeType] = useState(settings.homeType);
  const [area, setArea] = useState(settings.totalAreaSqm);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSaveHome = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      homeName: homeName.trim() || 'Mitt Hem',
      homeType: homeType.trim() || 'Bostad',
      totalAreaSqm: Number(area) || 75,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (json && Array.isArray(json.items)) {
          onImportData(json.items, json.settings);
          alert(`Lyckades importera ${json.items.length} föremål!`);
        } else if (Array.isArray(json)) {
          onImportData(json);
          alert(`Lyckades importera ${json.length} föremål!`);
        }
      } catch (err) {
        alert('Kunde inte läsa JSON-filen. Kontrollera filformatet.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4 pb-28 animate-fadeIn text-stone-100">
      
      {/* Hidden file input for JSON import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        accept=".json"
        className="hidden"
      />

      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-stone-900/95 text-stone-100 text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 border border-amber-500/40 animate-fadeIn backdrop-blur-md">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* 1. DEMODATA & TESTLÄGE (Prompt request) */}
      <div className="bg-[#121826]/90 border border-stone-800 rounded-3xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <Database className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-xs font-serif font-bold text-stone-100">
                Portföljdata & Testläge
              </h3>
              <p className="text-[10px] text-stone-400">
                {items.length === 0 
                  ? 'Portföljen är tom – redo för skarp fotografering' 
                  : `${items.length} st sparade lyxtillgångar i portföljen`}
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-serif font-bold px-2.5 py-0.5 rounded-full border ${
            items.length === 0 
              ? 'bg-stone-900 text-stone-400 border-stone-800' 
              : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
          }`}>
            {items.length} st
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            id="fill-demodata-btn"
            onClick={() => {
              onLoadDemoData();
              showNotification('Exklusiv portföljdata inläst! (6 st tillgångar)');
            }}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:brightness-110 active:scale-95 text-stone-950 font-serif font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>Ladda portföljdata</span>
          </button>

          <button
            type="button"
            id="clear-all-data-btn"
            onClick={() => {
              if (items.length === 0) {
                showNotification('Portföljen är redan helt tom');
                return;
              }
              if (confirm('Är du säker på att du vill tömma hela portföljen och börja om från noll?')) {
                onClearAllData();
                showNotification('Alla tillgångar har rensats');
              }
            }}
            className="w-full py-2.5 px-3 bg-stone-900 hover:bg-rose-950/50 hover:text-rose-300 hover:border-rose-500/40 active:scale-95 text-stone-300 font-serif font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-stone-800 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Rensa alla (0 st)</span>
          </button>
        </div>
      </div>

      {/* 2. PRO / PREMIUM STATUS BANNER */}
      <div className="bg-gradient-to-r from-[#121929] via-[#101625] to-[#1a140d] text-white rounded-3xl p-4 shadow-xl border border-amber-500/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-500 text-stone-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
              <Crown className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-stone-100 text-xs">
                {settings.isPremium ? 'Private Wealth Executive' : 'Standard'}
              </h3>
              <p className="text-[10px] text-amber-300/80">
                {settings.isPremium
                  ? 'Obegränsade tillgångar, realtidsvärdering & bankintyg'
                  : `${items.length} / ${settings.freeItemLimit} sparade tillgångar`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenPremium}
            className="bg-gradient-to-r from-amber-400 to-yellow-600 hover:brightness-110 text-stone-950 font-serif font-bold text-xs px-3 py-1.5 rounded-xl shadow-md active:scale-95 transition-all cursor-pointer"
          >
            {settings.isPremium ? 'Hantera medlemskap' : 'Uppgradera'}
          </button>
        </div>
      </div>

      {/* 3. BOSTADSPROFIL FORM */}
      <div className="bg-[#121826]/90 border border-stone-800 rounded-3xl p-4 shadow-lg">
        <h3 className="text-xs font-serif font-bold text-stone-100 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Home className="w-3.5 h-3.5 text-amber-400" /> Primär Fastighet & Bostad
        </h3>

        <form onSubmit={handleSaveHome} className="space-y-3">
          <div>
            <label className="block text-[11px] font-serif font-bold text-stone-300 mb-1">
              Namn på fastigheten / Adress
            </label>
            <input
              type="text"
              value={homeName}
              onChange={(e) => setHomeName(e.target.value)}
              placeholder="T.ex. Karlatornet Penthouse, Göteborg"
              className="w-full text-xs font-serif font-bold bg-[#0c101c] border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-serif font-bold text-stone-300 mb-1">
                Bostadstyp
              </label>
              <input
                type="text"
                value={homeType}
                onChange={(e) => setHomeType(e.target.value)}
                placeholder="T.ex. Penthouse, Våning, Herrgård"
                className="w-full text-xs font-serif bg-[#0c101c] border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-hidden focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-serif font-bold text-stone-300 mb-1">
                Boarea (m²)
              </label>
              <input
                type="number"
                value={area}
                onChange={(e) => setArea(Number(e.target.value))}
                className="w-full text-xs font-serif bg-[#0c101c] border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 text-stone-950 rounded-xl text-xs font-serif font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md cursor-pointer"
          >
            {savedSuccess ? <Check className="w-4 h-4 text-stone-950 stroke-[3]" /> : <Save className="w-4 h-4" />}
            <span>{savedSuccess ? 'Uppgifter sparade!' : 'Spara fastighetsuppgifter'}</span>
          </button>
        </form>
      </div>

      {/* 4. EXPERT ADVICE SHORTCUT */}
      <button
        type="button"
        onClick={onOpenExpertAdvice}
        className="w-full bg-gradient-to-r from-[#121929] to-[#17130b] hover:border-amber-500/40 border border-amber-500/20 rounded-3xl p-4 text-left shadow-lg flex items-center justify-between active:scale-98 transition-all group cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 text-stone-950 flex items-center justify-center font-bold shadow-md">
            <Sparkles className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-stone-100 text-xs">
              Private Wealth Analys & Rådgivning
            </h4>
            <p className="text-[10px] text-amber-300/80 font-medium mt-0.5">
              Skadeförebyggande, andrahandsvärde och bankvärderingar
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
      </button>

      {/* 5. DATAHANTERING & EXPORT */}
      <div className="bg-[#121826]/90 border border-stone-800 rounded-3xl p-4 shadow-lg space-y-2">
        <h3 className="text-xs font-serif font-bold text-stone-100 uppercase tracking-wider mb-2">
          Data & Säkerhetskopia
        </h3>

        <button
          type="button"
          onClick={() => exportToCSV(items, settings.homeName)}
          className="w-full py-2.5 px-3 bg-stone-900/90 hover:bg-stone-800 text-stone-200 rounded-xl text-xs font-serif font-bold flex items-center justify-between border border-stone-800 cursor-pointer transition-all"
        >
          <span className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Exportera till Excel (CSV)
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-stone-500" />
        </button>

        <button
          type="button"
          onClick={() => exportToJSON(items, settings)}
          className="w-full py-2.5 px-3 bg-stone-900/90 hover:bg-stone-800 text-stone-200 rounded-xl text-xs font-serif font-bold flex items-center justify-between border border-stone-800 cursor-pointer transition-all"
        >
          <span className="flex items-center gap-2">
            <Download className="w-4 h-4 text-amber-400" /> Spara säkerhetskopia (JSON)
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-stone-500" />
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-2.5 px-3 bg-stone-900/90 hover:bg-stone-800 text-stone-200 rounded-xl text-xs font-serif font-bold flex items-center justify-between border border-stone-800 cursor-pointer transition-all"
        >
          <span className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-amber-300" /> Importera säkerhetskopia
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-stone-500" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (confirm('Vill du rensa alla sparade tillgångar och börja från en tom portfölj?')) {
              onClearAllData();
              showNotification('Alla tillgångar har rensats');
            }
          }}
          className="w-full py-2.5 px-3 text-rose-400 hover:bg-rose-950/40 rounded-xl text-xs font-serif font-bold flex items-center justify-between transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-400" /> Töm alla tillgångar i portföljen
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-rose-500" />
        </button>
      </div>

      {/* App Info footer */}
      <div className="text-center text-[10px] text-stone-500 pt-2 space-y-0.5">
        <p className="font-serif">Private Wealth Asset Inventory v2.0</p>
        <p>Alla bilder, certifikat och finansiella data sparas krypterat och lokalt i din enhet</p>
      </div>

    </div>
  );
};
