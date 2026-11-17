import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Camera, 
  Search, 
  X, 
  SlidersHorizontal, 
  Sparkles, 
  Trash2, 
  Download, 
  Upload, 
  FileText, 
  Package, 
  Info,
  CheckCircle2,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { MobileCameraScanner } from './components/mobile/MobileCameraScanner';
import { MobileAIReviewSheet } from './components/mobile/MobileAIReviewSheet';
import { MobileMultiItemSelector } from './components/mobile/MobileMultiItemSelector';
import { MobileItemDetailSheet } from './components/mobile/MobileItemDetailSheet';
import { InsuranceReportModal } from './components/InsuranceReportModal';
import { InventoryItem, AIScanAnalysis, AppSettings } from './types';
import { INITIAL_SAMPLE_ITEMS } from './data/sampleItems';
import { generateSmartAnalysis } from './utils/aiAnalysisFallback';
import { exportToJSON, exportToCSV } from './utils/exportUtils';

const STORAGE_KEY_ITEMS = 'hemkoll_inventory_items_clean_v3';
const STORAGE_KEY_SETTINGS = 'hemkoll_app_settings_clean_v3';

const ROOM_FILTERS = ['Alla rum', 'Vardagsrum', 'Kök', 'Sovrum', 'Kontor', 'Förråd', 'Garage'];

const DEFAULT_SETTINGS: AppSettings = {
  homeName: 'Mitt Hem',
  homeType: 'Bostad',
  totalAreaSqm: 85,
  isPremium: true,
  freeItemLimit: 999,
  currency: 'SEK',
};

export default function App() {
  // Inventory Items State: STRICTLY EMPTY by default. Only populated if user saved items or loads demo data
  const [items, setItems] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading items from localStorage', e);
    }
    return [];
  });

  // App Settings State
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading settings from localStorage', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Filter & Search states
  const [selectedRoom, setSelectedRoom] = useState('Alla rum');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Bottom Sheets
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAIReviewOpen, setIsAIReviewOpen] = useState(false);
  const [isMultiSelectorOpen, setIsMultiSelectorOpen] = useState(false);
  const [multiSelectorImage, setMultiSelectorImage] = useState<string | null>(null);
  const [multiSelectorRoom, setMultiSelectorRoom] = useState('Vardagsrum');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState<InventoryItem | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // File import ref
  const fileImportRef = useRef<HTMLInputElement>(null);

  // AI Scanning state
  const [isAIScanning, setIsAIScanning] = useState(false);
  const [aiLoadingStep, setAiLoadingStep] = useState('');
  const [scannedImagePreview, setScannedImagePreview] = useState<string | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<AIScanAnalysis | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [analysisDuration, setAnalysisDuration] = useState<number | undefined>(undefined);

  // Persist items
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    } catch (e) {
      console.error('Error saving items to localStorage', e);
    }
  }, [items]);

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving settings to localStorage', e);
    }
  }, [settings]);

  // Total Estimated Value Calculation
  const totalEstimatedValue = useMemo(() => {
    return items.reduce((acc, curr) => acc + (curr.estimatedValue * (curr.quantity || 1)), 0);
  }, [items]);

  // Filtered items based on Search Query and Selected Room
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Room match
      const matchesRoom =
        selectedRoom === 'Alla rum' ||
        item.room.toLowerCase().includes(selectedRoom.toLowerCase()) ||
        (selectedRoom === 'Förråd' && (item.room.toLowerCase().includes('förråd') || item.room.toLowerCase().includes('källare'))) ||
        (selectedRoom === 'Kontor' && item.room.toLowerCase().includes('kontor'));

      // Search match
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.room && item.room.toLowerCase().includes(q)) ||
        (item.brand && item.brand.toLowerCase().includes(q)) ||
        (item.model && item.model.toLowerCase().includes(q));

      return matchesRoom && matchesSearch;
    });
  }, [items, selectedRoom, searchQuery]);

  // Handle image selection from Camera or File or Preset
  const handleImageSelected = async (
    imageBase64: string,
    mimeType: string,
    userHint: string,
    room: string,
    speedMode: 'turbo' | 'detailed' = 'turbo'
  ) => {
    setIsScannerOpen(false);
    setScannedImagePreview(imageBase64);
    setIsAIReviewOpen(true);
    setIsAIScanning(true);
    setAiError(null);
    setAnalysisDuration(undefined);
    setAiLoadingStep(speedMode === 'turbo' ? '⚡ Blixtsnabb AI-identifiering...' : 'Analyserar bild med Gemini AI...');

    const startLocal = Date.now();

    try {
      const response = await fetch('/api/analyze-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          userHint,
          suggestedRoom: room,
          speedMode,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setAnalysisDuration(result.durationMs || (Date.now() - startLocal));
          setCurrentAnalysis(result.data);
          return;
        }
      }

      // Fallback
      console.warn('Using smart client fallback analysis');
      const fallback = generateSmartAnalysis(userHint, room);
      setAnalysisDuration(Date.now() - startLocal);
      setCurrentAnalysis(fallback);
    } catch (err: any) {
      console.warn('Network issue, using client fallback analysis:', err);
      const fallback = generateSmartAnalysis(userHint, room);
      setAnalysisDuration(Date.now() - startLocal);
      setCurrentAnalysis(fallback);
    } finally {
      setIsAIScanning(false);
    }
  };

  // Approve AI analysis and save item
  const handleSaveItem = (itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newItem: InventoryItem = {
      ...itemData,
      id: `item-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setItems((prev) => [newItem, ...prev]);
    setIsAIReviewOpen(false);
    setCurrentAnalysis(null);
    setScannedImagePreview(null);
    showToast(`✓ "${newItem.name}" lades till i inventariet!`);
  };

  // Open multi-marker interactive tool for a given image
  const handleOpenMultiMarker = (image: string, room: string) => {
    setIsScannerOpen(false);
    setIsAIReviewOpen(false);
    setMultiSelectorImage(image);
    setMultiSelectorRoom(room);
    setIsMultiSelectorOpen(true);
  };

  // Batch import multiple items marked in photo
  const handleBatchImportItems = (newItems: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const timestamp = Date.now();
    const formatted: InventoryItem[] = newItems.map((item, idx) => ({
      ...item,
      id: `item-${timestamp}-${idx}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    setItems((prev) => [...formatted, ...prev]);
    setIsMultiSelectorOpen(false);
    setMultiSelectorImage(null);

    const totalVal = formatted.reduce((acc, it) => acc + it.estimatedValue, 0);
    showToast(`✓ ${formatted.length} föremål inlästa (${totalVal.toLocaleString('sv-SE')} kr)!`);
  };

  // Delete item
  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (selectedDetailItem?.id === id) {
      setSelectedDetailItem(null);
    }
    showToast('Föremålet raderades');
  };

  // Update item
  const handleUpdateItem = (updated: InventoryItem) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    setSelectedDetailItem(updated);
    showToast('Ändringarna sparades');
  };

  // Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load demo sample items (actively chosen by user via menu)
  const handleLoadDemoData = () => {
    setItems(INITIAL_SAMPLE_ITEMS);
    setSelectedRoom('Alla rum');
    setIsMenuOpen(false);
    showToast(`✓ Demodata laddad (${INITIAL_SAMPLE_ITEMS.length} föremål)!`);
  };

  // Clear all items to start completely empty
  const handleClearAllData = () => {
    if (items.length === 0) {
      setIsMenuOpen(false);
      return;
    }
    if (window.confirm('Är du säker på att du vill rensa hela inventariet?')) {
      setItems([]);
      setSelectedDetailItem(null);
      setSelectedRoom('Alla rum');
      setIsMenuOpen(false);
      showToast('Inventariet har tömts');
    }
  };

  // Handle JSON file import
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const importedItems = parsed.items || (Array.isArray(parsed) ? parsed : null);

        if (Array.isArray(importedItems)) {
          setItems(importedItems);
          if (parsed.settings) {
            setSettings(parsed.settings);
          }
          setIsMenuOpen(false);
          showToast(`✓ ${importedItems.length} föremål importerades!`);
        } else {
          alert('Ogiltigt filformat. Hittade inga föremål.');
        }
      } catch (err) {
        alert('Kunde inte läsa in filen. Kontrollera att det är giltig JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-white flex justify-center font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* MOBILE CONTAINER FRAME */}
      <div className="w-full max-w-md min-h-screen flex flex-col relative pb-28 px-4 pt-5">
        
        {/* TOP HEADER & KPI */}
        <header className="mb-5 flex flex-col gap-1.5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                TOTALT UPPSKATTAT VÄRDE
              </p>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#10B981] tracking-tight mt-1">
                {totalEstimatedValue.toLocaleString('sv-SE')} kr
              </h1>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {/* Pill badge showing total items */}
              <div className="bg-[#151C28] border border-[#1E293B] text-slate-200 text-sm font-semibold px-3.5 py-1.5 rounded-full shadow-xs">
                {items.length === 1 ? '1 föremål' : `${items.length} föremål`}
              </div>

              {/* Menu Button */}
              <button
                type="button"
                id="menu-options-btn"
                onClick={() => setIsMenuOpen(true)}
                className="w-10 h-10 rounded-full bg-[#151C28] hover:bg-slate-800 border border-[#1E293B] flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer active:scale-95"
                title="Inställningar & Data"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* SEARCH BAR */}
        <div className="relative mb-3.5">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-slate-400" />
          </div>
          <input
            type="text"
            id="main-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Sök på titel eller kategori..."
            className="w-full bg-[#151C28] text-white placeholder-slate-400 text-base font-medium rounded-2xl pl-11 pr-10 py-3 border border-[#1E293B] focus:outline-hidden focus:border-[#10B981] transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* HORIZONTAL FILTER CHIPS */}
        <div className="flex gap-2 overflow-x-auto pb-3.5 scrollbar-none no-scrollbar mb-2">
          {ROOM_FILTERS.map((room) => {
            const isActive = selectedRoom === room;
            return (
              <button
                key={room}
                type="button"
                onClick={() => setSelectedRoom(room)}
                className={`px-4 py-2 rounded-full text-sm shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#10B981] text-slate-950 font-bold shadow-md shadow-emerald-950/40'
                    : 'bg-[#151C28] text-slate-300 hover:bg-slate-800 border border-[#1E293B] font-medium'
                }`}
              >
                {room}
              </button>
            );
          })}
        </div>

        {/* ITEM LIST */}
        <main className="flex-1 flex flex-col gap-3">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div
                key={item.id}
                id={`item-card-${item.id}`}
                onClick={() => setSelectedDetailItem(item)}
                className="bg-[#151C28] hover:bg-[#192231] border border-[#1E293B] rounded-2xl p-3.5 flex items-center justify-between gap-3.5 cursor-pointer transition-all active:scale-[0.99] shadow-xs"
              >
                {/* Left thumbnail image */}
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#0B0F17] border border-[#1E293B] shrink-0 flex items-center justify-center">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Package className="w-7 h-7 text-slate-500" />
                  )}
                </div>

                {/* Middle details */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-white truncate leading-snug mb-1.5">
                    {item.name}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-[#0B0F17] text-slate-300 border border-[#1E293B] text-xs px-2.5 py-1 rounded-lg font-medium">
                      {item.room}
                    </span>
                    <span className="bg-[#0B0F17] text-slate-300 border border-[#1E293B] text-xs px-2.5 py-1 rounded-lg font-medium">
                      {item.category}
                    </span>
                  </div>
                </div>

                {/* Right value */}
                <div className="text-right shrink-0">
                  <div className="text-base sm:text-lg font-bold text-emerald-400">
                    {(item.estimatedValue * (item.quantity || 1)).toLocaleString('sv-SE')} kr
                  </div>
                  {item.quantity && item.quantity > 1 && (
                    <div className="text-xs text-slate-400 font-medium mt-0.5">
                      {item.quantity} st
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            /* EMPTY STATE */
            <div className="my-auto py-12 px-6 rounded-3xl bg-[#151C28]/60 border border-[#1E293B] text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-[#0B0F17] border border-[#1E293B] flex items-center justify-center text-[#10B981] mb-4">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                {items.length === 0
                  ? 'Inga föremål inlagda än'
                  : 'Inga föremål matchar sökningen'}
              </h3>
              <p className="text-sm text-slate-300 max-w-xs mb-6 leading-relaxed">
                {items.length === 0
                  ? 'Tryck på knappen nedan för att fota och inventera ditt första föremål, eller öppna menyn för att ladda demodata.'
                  : `Inga föremål matchar "${searchQuery}" i "${selectedRoom}".`}
              </p>

              {items.length === 0 ? (
                <button
                  type="button"
                  id="empty-load-demo-btn"
                  onClick={handleLoadDemoData}
                  className="bg-[#151C28] hover:bg-slate-800 text-slate-200 hover:text-white border border-[#1E293B] text-sm font-semibold px-5 py-3 rounded-2xl flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" /> Ladda demodata för test
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedRoom('Alla rum');
                  }}
                  className="bg-[#151C28] hover:bg-slate-800 text-slate-200 text-sm font-semibold px-5 py-2.5 rounded-2xl border border-[#1E293B] cursor-pointer"
                >
                  Återställ filter
                </button>
              )}
            </div>
          )}
        </main>

        {/* FLOATING ACTION BUTTON (FAB) */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
          <button
            type="button"
            id="fab-scan-btn"
            onClick={() => setIsScannerOpen(true)}
            className="bg-[#10B981] hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-base px-7 py-4 rounded-full shadow-2xl shadow-emerald-950/80 flex items-center gap-3 cursor-pointer transition-all border border-emerald-300/30"
          >
            <Camera className="w-6 h-6 stroke-[2.5]" />
            <span>Fota & Inventera</span>
          </button>
        </div>

        {/* MENU & DATA MANAGEMENT MODAL */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
            <div className="bg-[#151C28] border border-[#1E293B] rounded-3xl w-full max-w-sm p-6 text-white shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
                <div className="flex items-center gap-2.5">
                  <SlidersHorizontal className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-lg">Inställningar & Data</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-9 h-9 rounded-full bg-[#0B0F17] border border-[#1E293B] flex items-center justify-center text-slate-400 hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-2.5">
                {/* Load demo data option */}
                <button
                  type="button"
                  id="menu-load-demo-data-btn"
                  onClick={handleLoadDemoData}
                  className="w-full bg-[#0B0F17] hover:bg-slate-900 border border-[#1E293B] p-3.5 rounded-2xl flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Ladda demodata</div>
                      <div className="text-xs text-slate-400 mt-0.5">Lägg till exempelartiklar för att prova appen</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                </button>

                {/* PDF Insurance Report */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsReportModalOpen(true);
                  }}
                  className="w-full bg-[#0B0F17] hover:bg-slate-900 border border-[#1E293B] p-3.5 rounded-2xl flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Försäkringsrapport</div>
                      <div className="text-xs text-slate-400 mt-0.5">Generera eller skriv ut PDF-underlag</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                </button>

                {/* Export Data */}
                <button
                  type="button"
                  onClick={() => {
                    exportToJSON(items, settings);
                    showToast('Data exporterad till JSON');
                  }}
                  className="w-full bg-[#0B0F17] hover:bg-slate-900 border border-[#1E293B] p-3.5 rounded-2xl flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Exportera backup</div>
                      <div className="text-xs text-slate-400 mt-0.5">Ladda ned inventariet som JSON</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                </button>

                {/* Import Data */}
                <button
                  type="button"
                  onClick={() => fileImportRef.current?.click()}
                  className="w-full bg-[#0B0F17] hover:bg-slate-900 border border-[#1E293B] p-3.5 rounded-2xl flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Importera backup</div>
                      <div className="text-xs text-slate-400 mt-0.5">Återställ data från JSON-fil</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                </button>
                <input
                  type="file"
                  ref={fileImportRef}
                  onChange={handleFileImport}
                  accept=".json"
                  className="hidden"
                />

                {/* Clear All Data */}
                <button
                  type="button"
                  id="menu-clear-all-data-btn"
                  onClick={handleClearAllData}
                  className="w-full bg-[#0B0F17] hover:bg-rose-950/40 border border-rose-900/30 p-3.5 rounded-2xl flex items-center justify-between text-left transition-colors cursor-pointer mt-1"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-rose-300">Rensa allt innehåll</div>
                      <div className="text-xs text-rose-400/80 mt-0.5">Tömmer alla registrerade föremål</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="text-center pt-2 text-xs text-slate-500">
                HemKoll AI • All data sparas lokalt i din webbläsare
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen Mobile Camera Scanner */}
        <MobileCameraScanner
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onImageSelected={handleImageSelected}
          onOpenMultiMarker={handleOpenMultiMarker}
          activeRoom={selectedRoom !== 'Alla rum' ? selectedRoom : 'Vardagsrum'}
        />

        {/* AI Review Bottom Sheet */}
        <MobileAIReviewSheet
          isOpen={isAIReviewOpen}
          isLoading={isAIScanning}
          loadingStep={aiLoadingStep}
          analysis={currentAnalysis}
          capturedImage={scannedImagePreview}
          error={aiError}
          durationMs={analysisDuration}
          onSave={handleSaveItem}
          onOpenMultiSelect={handleOpenMultiMarker}
          onRetake={() => {
            setIsAIReviewOpen(false);
            setIsScannerOpen(true);
          }}
          onClose={() => {
            setIsAIReviewOpen(false);
            setCurrentAnalysis(null);
            setScannedImagePreview(null);
            setAnalysisDuration(undefined);
          }}
        />

        {/* Interactive Multi-Item Marker & Selector */}
        <MobileMultiItemSelector
          isOpen={isMultiSelectorOpen}
          onClose={() => setIsMultiSelectorOpen(false)}
          imageUrl={multiSelectorImage}
          activeRoom={multiSelectorRoom}
          onImportItems={handleBatchImportItems}
        />

        {/* Item Detail Bottom Sheet */}
        <MobileItemDetailSheet
          item={selectedDetailItem}
          isOpen={!!selectedDetailItem}
          onClose={() => setSelectedDetailItem(null)}
          onUpdate={handleUpdateItem}
          onDelete={handleDeleteItem}
        />

        {/* PDF Insurance Report Modal */}
        <InsuranceReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          items={items}
          settings={settings}
        />

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#151C28] text-white border border-emerald-500/40 px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-bounce">
            <span className="text-emerald-400">✓</span>
            <span>{toastMessage}</span>
          </div>
        )}

      </div>

    </div>
  );
}
