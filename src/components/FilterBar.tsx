import React from 'react';
import { Search, Filter, ArrowUpDown, LayoutGrid, List, Plus } from 'lucide-react';
import { ROOMS_LIST, CATEGORIES_LIST } from '../data/sampleItems';
import { SortOption } from '../types';

interface FilterBarProps {
  selectedRoom: string;
  onSelectRoom: (room: string) => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  totalFilteredCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  selectedRoom,
  onSelectRoom,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  viewMode,
  onViewModeChange,
  totalFilteredCount,
}) => {
  return (
    <div className="space-y-4 mb-6">
      
      {/* Top filter row: Search, Category, Sort, View toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Sök föremål, märke, serienummer..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600 px-1"
            >
              Rensa
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => onSelectCategory(e.target.value)}
            className="px-3 py-2 text-xs sm:text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-stone-700 shadow-2xs cursor-pointer"
          >
            {CATEGORIES_LIST.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="px-3 py-2 text-xs sm:text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-stone-700 shadow-2xs cursor-pointer"
            >
              <option value="newest">Nyast först</option>
              <option value="oldest">Äldst först</option>
              <option value="value-desc">Högsta värde</option>
              <option value="value-asc">Lägsta värde</option>
              <option value="name-asc">Namn (A-Ö)</option>
              <option value="room-asc">Rum</option>
            </select>
          </div>

          {/* Grid / List view toggle */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 shrink-0">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
              title="Rutnätsvy"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
              title="Listvy"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

      {/* Room Pills (Horizontal scrollable) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar scroll-smooth">
        {ROOMS_LIST.map((room) => {
          const isSelected = selectedRoom === room;
          return (
            <button
              key={room}
              onClick={() => onSelectRoom(room)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                isSelected
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-900 border border-stone-200'
              }`}
            >
              {room}
            </button>
          );
        })}
      </div>

    </div>
  );
};
