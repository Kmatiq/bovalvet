import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  Edit3, 
  Copy, 
  Check, 
  ShieldCheck, 
  MapPin, 
  Tag, 
  Info, 
  Calendar,
  Layers,
  Save,
  Barcode
} from 'lucide-react';
import { InventoryItem, ItemCategory, ItemCondition } from '../../types';
import { CATEGORIES_LIST, ROOMS_LIST } from '../../data/sampleItems';

interface MobileItemDetailSheetProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedItem: InventoryItem) => void;
  onDelete: (itemId: string) => void;
}

const CONDITIONS: ItemCondition[] = ['Nyskick', 'Mycket bra', 'Bra', 'Slitet', 'Defekt'];

export const MobileItemDetailSheet: React.FC<MobileItemDetailSheetProps> = ({
  item,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}) => {
  if (!isOpen || !item) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit states
  const [editName, setEditName] = useState(item.name);
  const [editValue, setEditValue] = useState(item.estimatedValue);
  const [editNewPrice, setEditNewPrice] = useState(item.purchasePriceEstimated || 0);
  const [editRoom, setEditRoom] = useState(item.room);
  const [editCategory, setEditCategory] = useState(item.category);
  const [editCondition, setEditCondition] = useState(item.condition);
  const [editBrand, setEditBrand] = useState(item.brand || '');
  const [editModel, setEditModel] = useState(item.model || '');
  const [editSerial, setEditSerial] = useState(item.serialNumber || '');
  const [editDescription, setEditDescription] = useState(item.description || '');

  const copyForInsurance = () => {
    const text = `FÖREMÅL: ${item.name}
Placering: ${item.room}
Kategori: ${item.category}
Skick: ${item.condition}
Uppskattat värde: ${item.estimatedValue.toLocaleString('sv-SE')} kr
${item.brand ? `Varumärke: ${item.brand}\n` : ''}${item.model ? `Modell: ${item.model}\n` : ''}${item.serialNumber ? `Serienummer: ${item.serialNumber}\n` : ''}Beskrivning: ${item.description || '-'}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({
      ...item,
      name: editName.trim(),
      estimatedValue: Number(editValue) || 0,
      purchasePriceEstimated: Number(editNewPrice) || undefined,
      room: editRoom,
      category: editCategory,
      condition: editCondition,
      brand: editBrand.trim() || undefined,
      model: editModel.trim() || undefined,
      serialNumber: editSerial.trim() || undefined,
      description: editDescription.trim(),
      updatedAt: new Date().toISOString(),
    });
    setIsEditing(false);
  };

  return (
    <div 
      id="item-detail-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="item-detail-sheet"
        className="w-full max-w-lg bg-[#0B0F17] text-white border-t border-[#1E293B] rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-slideUp"
      >
        {/* Drag handle */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-1 shrink-0" />

        {/* TOP BAR */}
        <div className="px-5 py-3.5 border-b border-[#1E293B] flex items-center justify-between shrink-0 bg-[#0B0F17]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              {isEditing ? 'Redigera föremål' : 'Detaljerad vy'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="w-10 h-10 rounded-full bg-[#151C28] hover:bg-slate-800 border border-[#1E293B] flex items-center justify-center text-emerald-400 cursor-pointer transition-colors"
                title="Redigera"
              >
                <Edit3 className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-[#151C28] hover:bg-slate-800 border border-[#1E293B] flex items-center justify-center text-slate-400 hover:text-white cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          
          {isEditing ? (
            /* EDIT FORM */
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-1.5">Namn</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full text-base font-bold bg-[#151C28] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-1.5">Värde (SEK)</label>
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(Number(e.target.value))}
                    className="w-full text-base font-bold bg-[#151C28] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-emerald-400 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-1.5">Nypris (SEK)</label>
                  <input
                    type="number"
                    value={editNewPrice}
                    onChange={(e) => setEditNewPrice(Number(e.target.value))}
                    className="w-full text-base font-bold bg-[#151C28] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-1.5">Rum</label>
                  <select
                    value={editRoom}
                    onChange={(e) => setEditRoom(e.target.value)}
                    className="w-full text-sm font-bold bg-[#151C28] border border-[#1E293B] rounded-xl px-3 py-2.5 text-white focus:outline-hidden focus:border-emerald-500"
                  >
                    {ROOMS_LIST.filter(r => r !== 'Alla rum').map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-1.5">Kategori</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as ItemCategory)}
                    className="w-full text-sm font-bold bg-[#151C28] border border-[#1E293B] rounded-xl px-3 py-2.5 text-white focus:outline-hidden focus:border-emerald-500"
                  >
                    {CATEGORIES_LIST.filter(c => c !== 'Alla kategorier').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-1.5">Skick</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {CONDITIONS.map(cond => (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => setEditCondition(cond)}
                      className={`py-2 text-xs sm:text-sm font-semibold rounded-xl border transition-all cursor-pointer ${
                        editCondition === cond ? 'bg-[#10B981] text-slate-950 border-[#10B981] font-bold' : 'bg-[#151C28] text-slate-300 border-[#1E293B] hover:bg-slate-800'
                      }`}
                    >
                      {cond}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Varumärke</label>
                  <input
                    type="text"
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value)}
                    className="w-full text-base bg-[#151C28] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Modell</label>
                  <input
                    type="text"
                    value={editModel}
                    onChange={(e) => setEditModel(e.target.value)}
                    className="w-full text-base bg-[#151C28] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Serienummer</label>
                <input
                  type="text"
                  value={editSerial}
                  onChange={(e) => setEditSerial(e.target.value)}
                  className="w-full font-mono text-base bg-[#151C28] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Beskrivning</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full text-base bg-[#151C28] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3.5 bg-[#151C28] border border-[#1E293B] text-slate-300 rounded-xl text-sm font-semibold cursor-pointer hover:bg-slate-800"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 bg-[#10B981] hover:bg-emerald-400 text-slate-950 rounded-xl text-sm font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Save className="w-5 h-5" /> Spara ändringar
                </button>
              </div>
            </form>
          ) : (
            /* VIEW MODE */
            <>
              {/* Photo & Valuation Hero */}
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-[#151C28] shadow-xl border border-[#1E293B]">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-black/40 to-transparent" />
                
                <div className="absolute bottom-3 left-3 right-3 text-white flex items-end justify-between">
                  <div>
                    <span className="bg-[#151C28]/90 border border-[#1E293B] text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-lg mb-1.5 inline-block">
                      {item.room}
                    </span>
                    <h2 className="text-xl font-bold leading-tight text-white drop-shadow-md">
                      {item.name}
                    </h2>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-300 font-medium">Värde</div>
                    <div className="text-2xl font-extrabold text-emerald-400">
                      {item.estimatedValue.toLocaleString('sv-SE')} kr
                    </div>
                  </div>
                </div>
              </div>

              {/* Spec Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#151C28] border border-[#1E293B] rounded-xl p-3">
                  <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Kategori</div>
                  <div className="text-sm font-bold text-white mt-1">{item.category}</div>
                </div>
                <div className="bg-[#151C28] border border-[#1E293B] rounded-xl p-3">
                  <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Skick</div>
                  <div className="text-sm font-bold text-white mt-1">{item.condition}</div>
                </div>
              </div>

              {/* Brand & Model & Serial */}
              <div className="bg-[#151C28] border border-[#1E293B] rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between text-sm border-b border-[#1E293B] pb-2">
                  <span className="text-slate-400">Varumärke:</span>
                  <span className="font-semibold text-white">{item.brand || 'Ej angivet'}</span>
                </div>
                <div className="flex items-center justify-between text-sm border-b border-[#1E293B] pb-2">
                  <span className="text-slate-400">Modell:</span>
                  <span className="font-semibold text-white">{item.model || 'Ej angivet'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Barcode className="w-4 h-4 text-emerald-400" /> Serienummer:
                  </span>
                  <span className="font-mono font-bold text-slate-200 bg-[#0B0F17] px-2.5 py-1 rounded-md border border-[#1E293B]">
                    {item.serialNumber || 'Ej registrerat'}
                  </span>
                </div>
              </div>

              {/* Description */}
              {item.description && (
                <div className="bg-[#151C28] border border-[#1E293B] rounded-2xl p-4">
                  <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Beskrivning</div>
                  <p className="text-sm text-slate-200 leading-relaxed">{item.description}</p>
                </div>
              )}

              {/* AI Insurance Advice */}
              {item.aiNotes && (
                <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 flex gap-3 items-start">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-100 leading-relaxed">
                    {item.aiNotes}
                  </p>
                </div>
              )}

              {/* Quick Actions */}
              <div className="pt-2 space-y-2.5">
                <button
                  type="button"
                  onClick={copyForInsurance}
                  className="w-full py-3.5 bg-[#151C28] hover:bg-slate-800 border border-[#1E293B] text-white rounded-2xl text-sm font-semibold flex items-center justify-center gap-2.5 active:scale-98 transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-5 h-5 text-emerald-400 stroke-[3]" /> : <Copy className="w-5 h-5 text-slate-400" />}
                  <span>{copied ? 'Kopierat till urklipp!' : 'Kopiera specifikation'}</span>
                </button>

                {showDeleteConfirm ? (
                  <div className="bg-rose-950/60 border border-rose-500/40 rounded-2xl p-3.5 text-center space-y-2.5">
                    <p className="text-sm font-semibold text-rose-200">
                      Är du säker på att du vill ta bort föremålet?
                    </p>
                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-2.5 bg-[#151C28] border border-[#1E293B] text-slate-300 rounded-xl text-sm font-semibold cursor-pointer"
                      >
                        Avbryt
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-xs cursor-pointer"
                      >
                        Ta bort
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-3 text-rose-400 hover:bg-rose-950/20 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Ta bort från inventariet</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
