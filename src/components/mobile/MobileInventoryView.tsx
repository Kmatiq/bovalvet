import React, { useState } from 'react';
import { 
  Search, 
  X, 
  SlidersHorizontal, 
  Grid2X2, 
  List, 
  Plus, 
  Tag, 
  ChevronDown,
  Layers
} from 'lucide-react';
import { InventoryItem, ItemCategory, SortOption } from '../../types';
import { ROOMS_LIST, CATEGORIES_LIST } from '../../data/sampleItems';

interface MobileInventoryViewProps {
  items: InventoryItem[];
  selectedRoom: string;
  onSelectRoom: (room: string) => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onSelectItem: (item: InventoryItem) => void;
  onOpenScanner: () => void;
}

const ROOM_ICONS: Record<string, string> = {
  'Alla rum': '🏠',
  'Vardagsrum': '🛋️',
  'Kök': '🍳',
  'Sovrum': '🛏️',
  'Barnrum': '🧸',
  'Badrum': '🚿',
  'Hall': '🚪',
  'Kontor / Arbetsrum': '💻',
  'Förråd & Källare': '📦',
  'Garage / Verkstad': '🔧',
  'Balkong & Trädgård': '🌿',
  'Övrigt': '📦',
};

export const MobileInventoryView: React.FC<MobileInventoryViewProps> = ({
  items,
  selectedRoom,
  onSelectRoom,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  onSelectItem,
  onOpenScanner,
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards');
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesRoom = selectedRoom === 'Alla rum' || item.room === selectedRoom;
    const matchesCategory = selectedCategory === 'Alla kategorier' || item.category === selectedCategory;
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.brand && item.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.model && item.model.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.serialNumber && item.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesRoom && matchesCategory && matchesSearch;
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'value-desc':
        return (b.estimatedValue * (b.quantity || 1)) - (a.estimatedValue * (a.quantity || 1));
      case 'value-asc':
        return (a.estimatedValue * (a.quantity || 1)) - (b.estimatedValue * (b.quantity || 1));
      case 'name-asc':
        return a.name.localeCompare(b.name, 'sv');
      case 'room-asc':
        return a.room.localeCompare(b.room, 'sv');
      default:
        return 0;
    }
  });

  const totalFilteredValue = sortedItems.reduce((acc, curr) => acc + curr.estimatedValue * (curr.quantity || 1), 0);

  return (
    <div className="space-y-3 pb-24 animate-fadeIn text-stone-100">
      
      {/* 1. SEARCH BAR + VIEW TOGGLES */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-amber-400/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="inventory-search-input"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Sök tillgång, märke, certifikat, serienr..."
              className="w-full bg-[#121826] border border-stone-800 text-stone-100 text-xs font-medium pl-9 pr-8 py-2.5 rounded-2xl shadow-inner focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder:text-stone-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter sheet trigger */}
          <button
            type="button"
            onClick={() => setShowFilterModal(true)}
            className={`p-2.5 rounded-2xl border flex items-center justify-center transition-all cursor-pointer ${
              selectedCategory !== 'Alla kategorier' || sortBy !== 'newest'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-600 text-stone-950 border-amber-400 font-bold shadow-md shadow-amber-500/20'
                : 'bg-[#121826] text-stone-300 border-stone-800 hover:border-stone-700'
            }`}
            title="Filter och sortering"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* View Mode Toggle */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'cards' ? 'compact' : 'cards')}
            className="p-2.5 rounded-2xl border border-stone-800 bg-[#121826] text-stone-300 hover:border-stone-700 flex items-center justify-center cursor-pointer"
            title="Byt vy"
          >
            {viewMode === 'cards' ? <List className="w-4 h-4" /> : <Grid2X2 className="w-4 h-4" />}
          </button>
        </div>

        {/* 2. HORIZONTAL ROOM FILTER CHIPS */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
          {ROOMS_LIST.map((room) => {
            const count = room === 'Alla rum' ? items.length : items.filter(i => i.room === room).length;
            const isSelected = selectedRoom === room;
            return (
              <button
                key={room}
                type="button"
                onClick={() => onSelectRoom(room)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-serif shrink-0 transition-all active:scale-95 cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-[#121826] border border-stone-800 text-stone-300 hover:border-amber-500/40'
                }`}
              >
                <span>{ROOM_ICONS[room] || '🏛️'}</span>
                <span>{room}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-stone-950/40 text-stone-950' : 'bg-stone-900 text-amber-300/80'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. ACTIVE FILTERS & STATS SUMMARY */}
      <div className="flex items-center justify-between text-[11px] text-stone-400 font-medium px-1">
        <span>
          Visar <strong className="text-amber-300">{sortedItems.length}</strong> av {items.length} tillgångar
        </span>
        <span className="font-serif font-bold text-gold-gradient">
          Portfölj: {totalFilteredValue.toLocaleString('sv-SE')} kr
        </span>
      </div>

      {/* 4. ITEMS LIST OR EMPTY STATE */}
      {sortedItems.length > 0 ? (
        viewMode === 'cards' ? (
          /* Cards Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sortedItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="bg-[#121826]/90 border border-stone-800 hover:border-amber-500/40 rounded-2xl p-3 shadow-md hover:shadow-xl active:scale-98 transition-all cursor-pointer flex gap-3 items-center group"
              >
                {/* Thumbnail */}
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-stone-950 shrink-0 relative border border-stone-800">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {item.condition && (
                    <span className="absolute bottom-1 left-1 bg-black/80 text-amber-300 text-[8px] font-bold px-1.5 py-0.5 rounded-md border border-amber-500/20">
                      {item.condition}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-semibold mb-0.5">
                    <span>{ROOM_ICONS[item.room] || '🏛️'} {item.room}</span>
                    <span>•</span>
                    <span className="truncate text-amber-300/80">{item.category}</span>
                  </div>

                  <h3 className="font-serif font-bold text-stone-100 text-xs leading-snug truncate" title={item.name}>
                    {item.name}
                  </h3>

                  {(item.brand || item.model) && (
                    <p className="text-[10px] text-stone-400 truncate mt-0.5">
                      {item.brand} {item.model}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs font-serif font-black text-gold-gradient">
                      {item.estimatedValue.toLocaleString('sv-SE')} kr
                    </span>
                    {item.quantity > 1 && (
                      <span className="text-[10px] bg-stone-900 text-stone-300 font-bold px-1.5 py-0.5 rounded-md border border-stone-800">
                        {item.quantity} st
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Compact Rows */
          <div className="bg-[#121826]/90 border border-stone-800 rounded-2xl divide-y divide-stone-800/70 overflow-hidden shadow-md">
            {sortedItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="p-3 flex items-center justify-between hover:bg-stone-800/40 active:bg-stone-800/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-10 h-10 rounded-lg object-cover shrink-0 border border-stone-800"
                  />
                  <div className="min-w-0">
                    <div className="font-serif font-bold text-stone-100 text-xs truncate">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-stone-400 flex items-center gap-1">
                      <span>{item.room}</span>
                      {item.brand && <span className="text-amber-300/70">• {item.brand}</span>}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-2">
                  <div className="text-xs font-serif font-black text-gold-gradient">
                    {item.estimatedValue.toLocaleString('sv-SE')} kr
                  </div>
                  <div className="text-[9px] text-stone-400">
                    {item.condition}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Empty State */
        <div className="bg-[#121826]/80 border border-stone-800 rounded-3xl p-8 text-center shadow-lg">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto mb-3">
            <Layers className="w-7 h-7" />
          </div>
          <h3 className="font-serif font-bold text-stone-100 text-sm mb-1">
            Inga tillgångar hittades
          </h3>
          <p className="text-xs text-stone-400 max-w-xs mx-auto mb-4">
            {searchQuery || selectedCategory !== 'Alla kategorier' || selectedRoom !== 'Alla rum'
              ? 'Prova att rensa sökningen eller ändra dina filter.'
              : 'Portföljen är tom. Fota din första lyxtillgång för att starta inventeringen!'}
          </p>
          <button
            type="button"
            onClick={onOpenScanner}
            className="bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 text-stone-950 font-serif font-bold text-xs px-4 py-2.5 rounded-xl inline-flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Fota tillgång
          </button>
        </div>
      )}

      {/* FILTER & SORT BOTTOM SHEET MODAL */}
      {showFilterModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center animate-fadeIn"
          onClick={() => setShowFilterModal(false)}
        >
          <div 
            className="w-full max-w-md bg-[#101624] border-t border-amber-500/30 rounded-t-3xl p-5 shadow-2xl space-y-4 animate-slideUp text-stone-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-stone-700 rounded-full mx-auto mb-2" />
            
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h3 className="font-serif font-bold text-stone-100 text-sm">
                Filter & Sortering
              </h3>
              <button
                type="button"
                onClick={() => {
                  onSelectCategory('Alla kategorier');
                  onSelectRoom('Alla rum');
                  onSortChange('newest');
                }}
                className="text-xs text-amber-400 font-bold hover:underline cursor-pointer"
              >
                Återställ alla
              </button>
            </div>

            {/* Sortering */}
            <div>
              <label className="block text-[11px] font-serif font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                Sortera efter
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  { id: 'newest', label: '✨ Nyast först' },
                  { id: 'value-desc', label: '💎 Högst värde' },
                  { id: 'value-asc', label: '📉 Lägst värde' },
                  { id: 'name-asc', label: '🔤 Namn (A-Ö)' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onSortChange(s.id as SortOption)}
                    className={`py-2 px-3 rounded-xl text-left font-semibold transition-all cursor-pointer ${
                      sortBy === s.id
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-bold'
                        : 'bg-[#161f33] text-stone-300 hover:bg-[#1a253d]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Kategori Filter */}
            <div>
              <label className="block text-[11px] font-serif font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                Kategori
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1 scrollbar-none">
                {CATEGORIES_LIST.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onSelectCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-amber-400 text-stone-950 font-bold'
                        : 'bg-[#161f33] text-stone-300 hover:bg-[#1a253d]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowFilterModal(false)}
              className="w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-600 text-stone-950 rounded-xl font-serif font-bold text-xs shadow-lg mt-2 cursor-pointer"
            >
              Tillämpa filter
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
