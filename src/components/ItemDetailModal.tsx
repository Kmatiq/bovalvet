import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  Edit3, 
  MapPin, 
  Tag, 
  ShieldCheck, 
  Calendar, 
  Sparkles, 
  Check, 
  Copy, 
  Share2,
  FileText,
  DollarSign
} from 'lucide-react';
import { InventoryItem, ItemCategory, ItemCondition } from '../types';
import { formatCurrency, formatDate, getConditionColor } from '../utils/formatters';
import { ROOMS_LIST, CATEGORIES_LIST } from '../data/sampleItems';

interface ItemDetailModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedItem: InventoryItem) => void;
  onDelete: (id: string) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form states when editing
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ItemCategory>('Möbler & Inredning');
  const [room, setRoom] = useState('');
  const [condition, setCondition] = useState<ItemCondition>('Bra');
  const [quantity, setQuantity] = useState(1);
  const [estimatedValue, setEstimatedValue] = useState(0);
  const [purchasePriceEstimated, setPurchasePriceEstimated] = useState(0);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [description, setDescription] = useState('');

  // Sync state when item changes
  React.useEffect(() => {
    if (item) {
      setName(item.name);
      setCategory(item.category);
      setRoom(item.room);
      setCondition(item.condition);
      setQuantity(item.quantity || 1);
      setEstimatedValue(item.estimatedValue);
      setPurchasePriceEstimated(item.purchasePriceEstimated || 0);
      setBrand(item.brand || '');
      setModel(item.model || '');
      setSerialNumber(item.serialNumber || '');
      setDescription(item.description || '');
      setIsEditing(false);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSaveEdit = () => {
    onSave({
      ...item,
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
      updatedAt: new Date().toISOString(),
    });
    setIsEditing(false);
  };

  const copyInsuranceText = () => {
    const text = `FÖREMÅL: ${item.name}
Kategori: ${item.category}
Placering: ${item.room}
Märke/Modell: ${item.brand || '-'} ${item.model || ''}
Serienummer: ${item.serialNumber || 'Ej angivet'}
Skick: ${item.condition} | Antal: ${item.quantity} st
Uppskattat marknadsvärde: ${formatCurrency(item.estimatedValue * (item.quantity || 1))}
Nypris: ${formatCurrency(item.purchasePriceEstimated || item.estimatedValue)}
Beskrivning: ${item.description || '-'}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getConditionColor(item.condition)}`}>
              {item.condition}
            </span>
            <span className="text-xs font-semibold text-stone-500 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {item.room}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-2 text-stone-500 hover:text-stone-900 rounded-xl hover:bg-stone-200/60 transition-colors"
              title={isEditing ? 'Avbryt redigering' : 'Redigera'}
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Vill du ta bort "${item.name}"?`)) {
                  onDelete(item.id);
                  onClose();
                }
              }}
              className="p-2 text-stone-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
              title="Ta bort"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200/60 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* Item Image */}
          <div className="relative aspect-16/9 w-full bg-stone-100 rounded-2xl overflow-hidden border border-stone-200 shadow-inner">
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {item.confidenceScore && (
              <div className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                AI-igenkänd ({item.confidenceScore}%)
              </div>
            )}
          </div>

          {/* Edit Mode vs View Mode */}
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Namn</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm font-semibold bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ItemCategory)}
                    className="w-full text-xs sm:text-sm bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-900"
                  >
                    {CATEGORIES_LIST.filter(c => c !== 'Alla kategorier').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Rum</label>
                  <select
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-900"
                  >
                    {ROOMS_LIST.filter(r => r !== 'Alla rum').map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Uppskattat nuvärde (kr)</label>
                  <input
                    type="number"
                    value={estimatedValue}
                    onChange={(e) => setEstimatedValue(Number(e.target.value))}
                    className="w-full text-sm font-bold bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Skick</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as ItemCondition)}
                    className="w-full text-xs sm:text-sm bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-900"
                  >
                    <option value="Nyskick">Nyskick</option>
                    <option value="Mycket bra">Mycket bra</option>
                    <option value="Bra">Bra</option>
                    <option value="Slitet">Slitet</option>
                    <option value="Defekt">Defekt</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Märke</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Modell</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Serienummer</label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Beskrivning</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-900"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl"
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-5 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-xs"
                >
                  Spara ändringar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Title & Value block */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                    {item.category}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900 leading-tight mt-0.5">
                    {item.name}
                  </h2>
                </div>

                <div className="sm:text-right">
                  <div className="text-[11px] font-semibold uppercase text-stone-400">
                    Värdering
                  </div>
                  <div className="text-2xl font-black text-stone-900 tracking-tight">
                    {formatCurrency(item.estimatedValue * (item.quantity || 1))}
                  </div>
                  {item.purchasePriceEstimated && (
                    <div className="text-xs text-stone-500">
                      Nypris ca: {formatCurrency(item.purchasePriceEstimated)}
                    </div>
                  )}
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-stone-50 p-4 rounded-2xl border border-stone-200/80 text-xs">
                <div>
                  <span className="text-stone-400 block font-medium">Varumärke</span>
                  <span className="font-bold text-stone-800">{item.brand || 'Ej angivet'}</span>
                </div>
                <div>
                  <span className="text-stone-400 block font-medium">Modell</span>
                  <span className="font-bold text-stone-800">{item.model || 'Standard'}</span>
                </div>
                <div>
                  <span className="text-stone-400 block font-medium">Antal</span>
                  <span className="font-bold text-stone-800">{item.quantity} st</span>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-stone-400 block font-medium">Serienummer / Ramnummer</span>
                  <span className="font-mono font-bold text-stone-900 bg-white px-2 py-1 rounded border border-stone-200 inline-block mt-0.5">
                    {item.serialNumber || 'Inget registrerat'}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Beskrivning
                </h4>
                <p className="text-sm text-stone-600 leading-relaxed bg-white p-3 rounded-xl border border-stone-100">
                  {item.description || 'Ingen detaljerad beskrivning.'}
                </p>
              </div>

              {/* AI Insurance Advice */}
              {item.aiNotes && (
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-amber-950 mb-0.5">Försäkringsråd från AI:</span>
                    <span>{item.aiNotes}</span>
                  </div>
                </div>
              )}

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {item.tags.map(t => (
                    <span key={t} className="text-xs px-2.5 py-1 bg-stone-100 text-stone-600 rounded-lg font-medium">
                      #{t}
                    </span>
                  ))}
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-100 bg-stone-50/80 flex items-center justify-between gap-3">
          <button
            onClick={copyInsuranceText}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Kopierat till urklipp!' : 'Kopiera specifikation'}
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 text-xs sm:text-sm font-bold text-stone-900 bg-stone-200 hover:bg-stone-300 rounded-xl transition-colors"
          >
            Stäng
          </button>
        </div>

      </div>
    </div>
  );
};
