import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Check, 
  X, 
  RotateCcw, 
  ShieldAlert, 
  Tag, 
  Layers, 
  MapPin, 
  Building2, 
  Info,
  CheckCircle2,
  Zap
} from 'lucide-react';
import { AIScanAnalysis, InventoryItem, ItemCategory, ItemCondition } from '../../types';
import { CATEGORIES_LIST, ROOMS_LIST } from '../../data/sampleItems';

interface MobileAIReviewSheetProps {
  isOpen: boolean;
  isLoading: boolean;
  loadingStep: string;
  analysis: AIScanAnalysis | null;
  capturedImage: string | null;
  error: string | null;
  durationMs?: number;
  onSave: (itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onRetake: () => void;
  onClose: () => void;
  onOpenMultiSelect?: (capturedImage: string, room: string) => void;
}

const CONDITIONS: ItemCondition[] = ['Nyskick', 'Mycket bra', 'Bra', 'Slitet', 'Defekt'];

export const MobileAIReviewSheet: React.FC<MobileAIReviewSheetProps> = ({
  isOpen,
  isLoading,
  loadingStep,
  analysis,
  capturedImage,
  error,
  durationMs,
  onSave,
  onRetake,
  onClose,
  onOpenMultiSelect,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ItemCategory>('Elektronik & Dator');
  const [room, setRoom] = useState('Vardagsrum');
  const [condition, setCondition] = useState<ItemCondition>('Mycket bra');
  const [quantity, setQuantity] = useState(1);
  const [estimatedValue, setEstimatedValue] = useState<number>(0);
  const [estimatedNewPrice, setEstimatedNewPrice] = useState<number>(0);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (analysis) {
      setName(analysis.name || '');
      setCategory(analysis.category || 'Övrigt');
      setRoom(analysis.suggestedRoom || 'Vardagsrum');
      setCondition(analysis.condition || 'Bra');
      setQuantity(analysis.quantity || 1);
      setEstimatedValue(analysis.estimatedValueSEK || 0);
      setEstimatedNewPrice(analysis.estimatedNewPriceSEK || 0);
      setBrand(analysis.brand || '');
      setModel(analysis.model || '');
      setSerialNumber(analysis.serialNumberDetected || '');
      setDescription(analysis.description || '');
      setTags(analysis.tags || []);
    }
  }, [analysis]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      category,
      room,
      condition,
      quantity: Number(quantity) || 1,
      estimatedValue: Number(estimatedValue) || 0,
      purchasePriceEstimated: Number(estimatedNewPrice) || undefined,
      purchaseYear: new Date().getFullYear(),
      description: description.trim(),
      imageUrl: capturedImage || 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80',
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      serialNumber: serialNumber.trim() || undefined,
      tags,
      confidenceScore: analysis?.confidence || 90,
      aiNotes: analysis?.insuranceTip || undefined,
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim().toLowerCase())) {
      setTags([...tags, tagInput.trim().toLowerCase()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div 
      id="ai-review-sheet-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div 
        id="ai-review-sheet-content"
        className="w-full max-w-lg bg-[#0B0F17] text-white border-t border-[#1E293B] rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-slideUp"
      >
        {/* Sheet drag indicator */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-1 shrink-0" />

        {/* LOADING STATE */}
        {isLoading && (
          <div className="p-8 text-center flex flex-col items-center justify-center my-auto min-h-[380px]">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-400 flex items-center justify-center animate-pulse">
                <Sparkles className="w-10 h-10 text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-[#151C28] border border-emerald-400 text-emerald-400 flex items-center justify-center text-xs font-bold">
                AI
              </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-2">
              Analyserar föremål
            </h3>
            <p className="text-sm text-slate-300 max-w-xs mb-6 font-medium leading-relaxed">
              {loadingStep || 'Identifierar titel, kategori och uppskattar värde...'}
            </p>

            {capturedImage && (
              <div className="w-28 h-28 rounded-2xl overflow-hidden shadow-xl border border-[#1E293B]">
                <img src={capturedImage} alt="Förhandsgranskning" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        )}

        {/* ERROR STATE */}
        {error && !isLoading && (
          <div className="p-6 text-center my-auto">
            <div className="w-16 h-16 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto mb-3.5">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1.5">
              Kunde inte analysera bilden helt
            </h3>
            <p className="text-sm text-slate-300 max-w-xs mx-auto mb-6 leading-relaxed">
              {error}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={onRetake}
                className="bg-[#151C28] hover:bg-slate-800 text-slate-200 text-sm font-semibold px-5 py-3 rounded-xl flex items-center gap-2 border border-[#1E293B] cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Ta nytt foto
              </button>
              <button
                type="button"
                onClick={onClose}
                className="bg-[#10B981] hover:bg-emerald-400 text-slate-950 text-sm font-bold px-5 py-3 rounded-xl cursor-pointer"
              >
                Avbryt
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS STATE - EDIT & APPROVE FORM */}
        {!isLoading && !error && analysis && (
          <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
            
            {/* Header with Title and Confidence */}
            <div className="px-5 py-3.5 border-b border-[#1E293B] flex items-center justify-between shrink-0 bg-[#0B0F17]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-bold text-white">
                  AI-analys
                </span>
                {durationMs && (
                  <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    {(durationMs / 1000).toFixed(1)}s
                  </span>
                )}
                <span className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold px-2.5 py-1 rounded-full">
                  {analysis.confidence}% träff
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-[#151C28] hover:bg-slate-800 border border-[#1E293B] flex items-center justify-center text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              
              {/* Photo preview + Primary Name */}
              <div className="flex gap-3 items-start">
                {capturedImage && (
                  <div className="relative w-22 h-22 rounded-2xl overflow-hidden border border-[#1E293B] shrink-0 shadow-md">
                    <img src={capturedImage} alt="Fotad pryl" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={onRetake}
                      className="absolute bottom-1 right-1 bg-black/80 text-emerald-400 p-1.5 rounded-full shadow-md text-xs cursor-pointer"
                      title="Ta om foto"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Föremålets titel *
                  </label>
                  <input
                    type="text"
                    id="review-item-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="T.ex. Soffa Ektorp 3-sits"
                    className="w-full text-base font-bold text-white bg-[#151C28] border border-[#1E293B] rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Estimated Value & New Price Card */}
              <div className="grid grid-cols-2 gap-3 bg-[#151C28] border border-[#1E293B] rounded-2xl p-3.5">
                <div>
                  <label className="block text-xs font-bold text-emerald-400 mb-1.5">
                    Uppskattat värde (SEK) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="review-item-value"
                      value={estimatedValue}
                      onChange={(e) => setEstimatedValue(Number(e.target.value))}
                      className="w-full font-bold text-lg text-emerald-400 bg-[#0B0F17] border border-emerald-500/40 rounded-xl px-3.5 py-2 focus:outline-hidden focus:border-emerald-400"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-400/80">
                      kr
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nypris (cirka)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="review-item-newprice"
                      value={estimatedNewPrice}
                      onChange={(e) => setEstimatedNewPrice(Number(e.target.value))}
                      className="w-full font-bold text-base text-slate-200 bg-[#0B0F17] border border-[#1E293B] rounded-xl px-3.5 py-2 focus:outline-hidden focus:border-emerald-400"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      kr
                    </span>
                  </div>
                </div>
              </div>

              {/* Room selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-400" /> Rum
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
                  {ROOMS_LIST.filter(r => r !== 'Alla rum').map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRoom(r)}
                      className={`px-3.5 py-2 rounded-xl text-sm font-semibold shrink-0 transition-all cursor-pointer ${
                        room === r
                          ? 'bg-[#10B981] text-slate-950 font-bold shadow-md'
                          : 'bg-[#151C28] text-slate-300 hover:bg-slate-800 border border-[#1E293B]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Condition Pills */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Skick
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {CONDITIONS.map((cond) => (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => setCondition(cond)}
                      className={`py-2 px-1 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer ${
                        condition === cond
                          ? 'bg-[#10B981] text-slate-950 shadow-md font-bold'
                          : 'bg-[#151C28] text-slate-300 hover:bg-slate-800 border border-[#1E293B]'
                      }`}
                    >
                      {cond}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Kategori
                </label>
                <select
                  id="review-item-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ItemCategory)}
                  className="w-full bg-[#151C28] text-white text-sm font-semibold rounded-xl px-3.5 py-2.5 border border-[#1E293B] focus:outline-hidden focus:border-emerald-400"
                >
                  {CATEGORIES_LIST.filter(c => c !== 'Alla kategorier').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional brand & model */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Varumärke
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="T.ex. IKEA, Apple"
                    className="w-full text-base bg-[#151C28] border border-[#1E293B] rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-emerald-400 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Modell
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="T.ex. Ektorp"
                    className="w-full text-base bg-[#151C28] border border-[#1E293B] rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-emerald-400 text-white"
                  />
                </div>
              </div>

              {/* Serial number detected */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Serienummer (valfritt)
                </label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="Serienummer..."
                  className="w-full font-mono text-base bg-[#151C28] border border-[#1E293B] rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-emerald-400 text-white"
                />
              </div>

              {/* AI Insurance Tip */}
              {analysis.insuranceTip && (
                <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-3.5 flex gap-3 items-start">
                  <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-100 leading-relaxed">
                    {analysis.insuranceTip}
                  </p>
                </div>
              )}

            </div>

            {/* Bottom Floating Action Bar */}
            <div className="px-5 py-4 border-t border-[#1E293B] bg-[#0B0F17] flex gap-3 items-center shrink-0">
              <button
                type="button"
                onClick={onRetake}
                className="px-4 py-3.5 rounded-2xl bg-[#151C28] hover:bg-slate-800 text-slate-200 text-sm font-semibold flex items-center justify-center gap-2 border border-[#1E293B] active:scale-95 transition-transform cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-slate-400" /> Ta om
              </button>

              <button
                type="submit"
                id="review-save-btn"
                className="flex-1 py-4 rounded-2xl bg-[#10B981] hover:bg-emerald-400 text-slate-950 text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 active:scale-95 transition-all cursor-pointer"
              >
                <Check className="w-5 h-5 stroke-[3]" /> Spara i inventariet
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
