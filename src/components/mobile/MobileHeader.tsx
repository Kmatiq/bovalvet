import React from 'react';
import { Sparkles, Crown, Search, Plus, Building2 } from 'lucide-react';
import { AppSettings } from '../../types';

interface MobileHeaderProps {
  settings: AppSettings;
  onOpenScanner: () => void;
  onOpenPremium: () => void;
  onSwitchTab?: (tab: 'items' | 'home') => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  settings,
  onOpenScanner,
  onOpenPremium,
  onSwitchTab,
}) => {
  return (
    <header 
      id="mobile-top-header"
      className="sticky top-0 z-30 bg-[#0c101c]/95 backdrop-blur-xl border-b border-amber-500/15 px-4 py-3 select-none"
    >
      <div className="max-w-md mx-auto flex items-center justify-between">
        
        {/* Left: App Logo & Current Estate */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-700 text-stone-950 flex items-center justify-center shadow-lg shadow-amber-950/40 ring-1 ring-amber-400/30">
            <Building2 className="w-4 h-4 stroke-[2.2] text-stone-950" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-serif font-bold text-stone-100 text-base leading-tight tracking-tight">
                {settings.homeName || 'Karlatornet Penthouse'}
              </h1>
              <span className="bg-amber-500/15 text-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1 tracking-wider uppercase">
                <Crown className="w-2.5 h-2.5 text-amber-400" /> Private Wealth
              </span>
            </div>
            <p className="text-[11px] text-stone-400 font-medium flex items-center gap-1.5 mt-0.5">
              <span className="text-amber-400/90 font-semibold">{settings.homeType || 'Privatbostad'}</span>
              <span className="text-stone-600">•</span>
              <span>{settings.totalAreaSqm || 185} m²</span>
              <span className="text-stone-600">•</span>
              <span className="text-emerald-400 font-medium">Lodjursstråket</span>
            </p>
          </div>
        </div>

        {/* Right: Quick actions */}
        <div className="flex items-center gap-1.5">
          {onSwitchTab && (
            <button
              type="button"
              id="header-search-btn"
              onClick={() => onSwitchTab('items')}
              className="w-9 h-9 rounded-xl bg-stone-900/90 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-800 flex items-center justify-center active:scale-95 transition-all"
              aria-label="Sök tillgångar"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            id="header-quick-add-btn"
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-stone-950 text-xs font-black px-3.5 py-2 rounded-xl shadow-md shadow-amber-500/15 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Inventera</span>
          </button>
        </div>

      </div>
    </header>
  );
};
