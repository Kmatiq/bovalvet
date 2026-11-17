import React from 'react';
import { Tag, MapPin, Sparkles, Trash2, Edit3, Eye, FileCheck } from 'lucide-react';
import { InventoryItem } from '../types';
import { formatCurrency, getConditionColor } from '../utils/formatters';

interface ItemCardProps {
  item: InventoryItem;
  viewMode: 'grid' | 'list';
  onSelect: (item: InventoryItem) => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  viewMode,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const conditionColor = getConditionColor(item.condition);

  if (viewMode === 'list') {
    return (
      <div 
        onClick={() => onSelect(item)}
        className="group bg-white rounded-2xl border border-stone-200/90 hover:border-amber-300 hover:shadow-md transition-all p-3 sm:p-4 flex items-center justify-between gap-4 cursor-pointer"
      >
        {/* Thumbnail & Info */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200/60 relative">
            <img
              src={item.imageUrl || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80'}
              alt={item.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              referrerPolicy="no-referrer"
            />
            {item.quantity > 1 && (
              <span className="absolute bottom-1 right-1 bg-stone-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-1.5 py-0.2 rounded-sm">
                x{item.quantity}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm sm:text-base text-stone-900 truncate">
                {item.name}
              </h3>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${conditionColor}`}>
                {item.condition}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-stone-500 mt-1">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-stone-400" />
                {item.room}
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline text-stone-400">{item.category}</span>
              {item.brand && (
                <>
                  <span className="hidden md:inline">•</span>
                  <span className="hidden md:inline font-medium text-stone-600">{item.brand}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Value and Actions */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="text-base sm:text-lg font-extrabold text-stone-900">
              {formatCurrency(item.estimatedValue * (item.quantity || 1))}
            </div>
            {item.quantity > 1 && (
              <div className="text-[11px] text-stone-400">
                {formatCurrency(item.estimatedValue)} / st
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(item);
              }}
              className="p-2 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              title="Redigera"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Vill du ta bort "${item.name}" från inventeringen?`)) {
                  onDelete(item.id);
                }
              }}
              className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Ta bort"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div 
      onClick={() => onSelect(item)}
      className="group bg-white rounded-2xl border border-stone-200/80 hover:border-amber-300 hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col justify-between cursor-pointer"
    >
      {/* Top Image area */}
      <div className="relative aspect-4/3 w-full bg-stone-100 overflow-hidden">
        <img
          src={item.imageUrl || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80'}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          referrerPolicy="no-referrer"
        />

        {/* Badges on image */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
          <span className="bg-stone-900/80 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
            <MapPin className="w-3 h-3 text-amber-300" />
            {item.room}
          </span>
          {item.quantity > 1 && (
            <span className="bg-amber-600/90 backdrop-blur-md text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-xs">
              x{item.quantity}
            </span>
          )}
        </div>

        <div className="absolute top-2.5 right-2.5">
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-md shadow-xs ${conditionColor} bg-white/95`}>
            {item.condition}
          </span>
        </div>

        {/* AI Analyzed Indicator */}
        {item.confidenceScore && item.confidenceScore > 80 && (
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-amber-300" />
            <span>AI-verifierad ({item.confidenceScore}%)</span>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 mb-1">
            {item.category}
          </div>
          <h3 className="font-bold text-stone-900 text-base leading-snug group-hover:text-amber-800 transition-colors line-clamp-1">
            {item.name}
          </h3>
          <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
            {item.description || 'Ingen ytterligare beskrivning tillagd.'}
          </p>
        </div>

        {/* Footer with price & actions */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-semibold text-stone-400">
              Uppskattat värde
            </div>
            <div className="text-lg font-black text-stone-900 tracking-tight">
              {formatCurrency(item.estimatedValue * (item.quantity || 1))}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(item);
              }}
              className="p-2 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
              title="Redigera föremål"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Vill du ta bort "${item.name}"?`)) {
                  onDelete(item.id);
                }
              }}
              className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              title="Radera"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
