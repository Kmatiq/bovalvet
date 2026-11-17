import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Check, 
  RefreshCw, 
  X, 
  AlertCircle, 
  MapPin, 
  Tag, 
  ShieldCheck, 
  DollarSign, 
  Info, 
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AIScanAnalysis, InventoryItem, ItemCategory, ItemCondition } from '../types';
import { ROOMS_LIST, CATEGORIES_LIST } from '../data/sampleItems';
import { formatCurrency } from '../utils/formatters';

interface AIReviewModalProps {
  isOpen: boolean;
  isLoading: boolean;
  loadingStep: string;
  imagePreviewUrl: string;
  analysis: AIScanAnalysis | null;
  error: string | null;
  onApprove: (item: Partial<InventoryItem>) => void;
  onRetake: () => void;
  onClose: () => void;
}

export const AIReviewModal: React.FC<AIReviewModalProps> = ({
  isOpen,
  isLoading,
  loadingStep,
  imagePreviewUrl,
  analysis,
  error,
  onApprove,
  onRetake,
  onClose,
}) => {
  // Editable form fields initialized from AI analysis
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ItemCategory>('Möbler & Inredning');
  const [room, setRoom] = useState('Vardagsrum');
  const [condition, setCondition] = useState<ItemCondition>('Bra');
  const [quantity, setQuantity] = useState(1);
  const [estimatedValue, setEstimatedValue] = useState(0);
  const [purchasePriceEstimated, setPurchasePriceEstimated] = useState(0);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  // Update form fields whenever new AI analysis arrives
  useEffect(() => {
    if (analysis) {
      setName(analysis.name || 'Identifierat föremål');
      setCategory(analysis.category || 'Möbler & Inredning');
      setRoom(analysis.suggestedRoom || 'Vardagsrum');
      setCondition(analysis.condition || 'Bra');
      setQuantity(analysis.quantity || 1);
      setEstimatedValue(analysis.estimatedValueSEK || 0);
      setPurchasePriceEstimated(analysis.estimatedNewPriceSEK || 0);
      setBrand(analysis.brand || '');
      setModel(analysis.model || '');
      setSerialNumber(analysis.serialNumberDetected || '');
      setDescription(analysis.description || '');
      setTags(analysis.tags || []);
    }
  }, [analysis]);

  const handleApprove = () => {
    // Trigger celebratory confetti
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (e) {
      // Ignore if confetti unavailable
    }

    onApprove({
      name,
      category,
      room,
      condition,
      quantity,
      estimatedValue: Number(estimatedValue) || 0,
      purchasePriceEstimated: Number(purchasePriceEstimated) || 0,
      brand,
      model,
      serialNumber,
      description,
      tags,
      confidenceScore: analysis?.confidence || 90,
      aiNotes: analysis?.insuranceTip,
      imageUrl: imagePreviewUrl,
    });
  };

  const handleAddTag = () => {
    if (newTagInput.trim() && !tags.includes(newTagInput.trim())) {
      setTags([...tags, newTagInput.trim()]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 leading-tight">
                {isLoading ? 'AI-analys pågår...' : 'Granska & godkänn inventering'}
              </h2>
              <p className="text-xs text-stone-500">
                {isLoading ? 'Gemini 3.7 tolkar bildens detaljer' : 'Kontrollera uppgifterna innan de sparas'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          
          {/* Loading State with animation */}
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center animate-bounce shadow-md">
                  <Sparkles className="w-10 h-10" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center shadow-xs">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-stone-900 mb-1">
                  {loadingStep || 'Tolkar bilden...'}
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Identifierar föremålets märke, modell, skick och beräknar uppskattat marknadsvärde i SEK.
                </p>
              </div>

              {imagePreviewUrl && (
                <div className="w-36 h-28 rounded-xl overflow-hidden border-2 border-amber-300 shadow-sm opacity-90">
                  <img
                    src={imagePreviewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 space-y-3 mb-4">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                Kunde inte slutföra AI-analysen
              </div>
              <p className="text-xs">{error}</p>
              <button
                onClick={onRetake}
                className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl hover:bg-rose-700 transition-colors"
              >
                Försök igen med ny bild
              </button>
            </div>
          )}

          {/* Success / Edit Form */}
          {!isLoading && !error && (
            <div className="space-y-5">
              
              {/* Top Summary Banner with Image + Fast Insights */}
              <div className="flex flex-col sm:flex-row gap-4 bg-stone-50 p-3.5 sm:p-4 rounded-2xl border border-stone-200/90 items-start">
                <div className="w-full sm:w-36 h-36 rounded-xl overflow-hidden bg-stone-200 shrink-0 border border-stone-300 relative group">
                  <img
                    src={imagePreviewUrl}
                    alt={name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 left-2 bg-stone-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                    {analysis?.confidence || 95}% AI-säkerhet
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                      {category}
                    </span>
                    <span className="text-xs font-semibold text-stone-600 bg-white border border-stone-200 px-2 py-0.5 rounded-md">
                      {room}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base sm:text-lg text-stone-900 leading-tight">
                    {name}
                  </h3>

                  {analysis?.insuranceTip && (
                    <div className="p-2.5 bg-amber-50/80 rounded-xl border border-amber-200/70 text-xs text-amber-900 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <span className="leading-snug">{analysis.insuranceTip}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Editable Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Föremålets namn *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-sm font-semibold bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    placeholder="T.ex. Samsung 65-tums TV"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ItemCategory)}
                    className="w-full text-xs sm:text-sm bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    {CATEGORIES_LIST.filter(c => c !== 'Alla kategorier').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Room */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Rum
                  </label>
                  <select
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    {ROOMS_LIST.filter(r => r !== 'Alla rum').map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Estimated Current Value */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Uppskattat nuvärde (kr) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={estimatedValue}
                      onChange={(e) => setEstimatedValue(Number(e.target.value))}
                      className="w-full text-sm font-bold bg-white border border-stone-200 rounded-xl pl-3 pr-10 py-2 text-stone-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      min="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                      SEK
                    </span>
                  </div>
                </div>

                {/* Estimated New Price */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Uppskattat nypris i butik (kr)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={purchasePriceEstimated}
                      onChange={(e) => setPurchasePriceEstimated(Number(e.target.value))}
                      className="w-full text-sm bg-white border border-stone-200 rounded-xl pl-3 pr-10 py-2 text-stone-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      min="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                      SEK
                    </span>
                  </div>
                </div>

                {/* Condition */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Skick
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as ItemCondition)}
                    className="w-full text-xs sm:text-sm bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="Nyskick">Nyskick</option>
                    <option value="Mycket bra">Mycket bra</option>
                    <option value="Bra">Bra</option>
                    <option value="Slitet">Slitet</option>
                    <option value="Defekt">Defekt</option>
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Antal
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full text-sm bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    min="1"
                  />
                </div>

                {/* Brand & Model */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Varumärke / Tillverkare
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="T.ex. Sony, IKEA, Apple, Bosch"
                    className="w-full text-xs sm:text-sm bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Modell / Serie
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="T.ex. Bravia XR-65, Söderhamn"
                    className="w-full text-xs sm:text-sm bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Serial Number */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Serienummer / Ramnummer (viktigt vid stöld)
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="T.ex. SN-89214719 eller Ram: ABC1234"
                    className="w-full text-xs sm:text-sm bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Beskrivning & Detaljer
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    placeholder="Färg, material, tillbehör..."
                  />
                </div>

                {/* Tags */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Taggar
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 text-stone-700 text-xs font-medium rounded-lg"
                      >
                        #{t}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="text-stone-400 hover:text-stone-700 ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="Lägg till en tagg..."
                      className="text-xs bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-stone-900 flex-1 focus:ring-2 focus:ring-amber-500/20"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3 py-1.5 text-xs font-semibold bg-stone-100 hover:bg-stone-200 rounded-xl text-stone-700"
                    >
                      Lägg till
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        {!isLoading && !error && (
          <div className="p-4 sm:p-5 border-t border-stone-100 bg-stone-50/80 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={onRetake}
              className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              Ta ny bild
            </button>

            <button
              type="button"
              onClick={handleApprove}
              className="px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-5 h-5" />
              Godkänn & Spara till heminventeringen
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
