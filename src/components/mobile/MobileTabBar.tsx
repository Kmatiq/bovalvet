import React from 'react';
import { 
  Home, 
  Layers, 
  Camera, 
  ShieldCheck, 
  Settings,
  Sparkles
} from 'lucide-react';

export type MobileTab = 'home' | 'items' | 'scan' | 'insurance' | 'settings';

interface MobileTabBarProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  onOpenScanner: () => void;
  itemCount: number;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({
  activeTab,
  onTabChange,
  onOpenScanner,
  itemCount,
}) => {
  return (
    <nav 
      id="mobile-bottom-nav"
      aria-label="Huvudnavigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#0c101c]/95 backdrop-blur-xl border-t border-amber-500/20 shadow-2xl safe-area-bottom select-none transition-all"
    >
      <div className="max-w-md mx-auto px-2 py-1.5 flex items-center justify-between relative">
        
        {/* Tab 1: Hem */}
        <button
          type="button"
          id="tab-btn-home"
          onClick={() => onTabChange('home')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center rounded-2xl transition-all ${
            activeTab === 'home'
              ? 'text-amber-400 font-bold scale-102'
              : 'text-stone-400 hover:text-stone-200 active:scale-95'
          }`}
        >
          <div className="relative">
            <Home className={`w-5 h-5 transition-transform ${activeTab === 'home' ? 'stroke-[2.5px] text-amber-400' : 'stroke-2'}`} />
            {activeTab === 'home' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-amber-400 rounded-full shadow-sm shadow-amber-400" />
            )}
          </div>
          <span className="text-[11px] tracking-tight mt-0.5">Översikt</span>
        </button>

        {/* Tab 2: Prylar / Inventarie */}
        <button
          type="button"
          id="tab-btn-items"
          onClick={() => onTabChange('items')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center rounded-2xl transition-all ${
            activeTab === 'items'
              ? 'text-amber-400 font-bold scale-102'
              : 'text-stone-400 hover:text-stone-200 active:scale-95'
          }`}
        >
          <div className="relative">
            <Layers className={`w-5 h-5 transition-transform ${activeTab === 'items' ? 'stroke-[2.5px] text-amber-400' : 'stroke-2'}`} />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 text-[9px] font-black px-1.5 py-0.2 rounded-full min-w-[16px] text-center shadow-xs">
                {itemCount}
              </span>
            )}
          </div>
          <span className="text-[11px] tracking-tight mt-0.5">Tillgångar</span>
        </button>

        {/* CENTER BIG BUTTON: Fota / AI Scanner */}
        <div className="flex-1 flex items-center justify-center relative -mt-5">
          <button
            type="button"
            id="tab-btn-camera-main"
            onClick={onOpenScanner}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-500 text-stone-950 flex flex-col items-center justify-center shadow-lg shadow-amber-500/25 ring-4 ring-[#0c101c] active:scale-90 transition-all cursor-pointer group hover:brightness-110"
            title="Inventera ny tillgång med AI"
          >
            <Camera className="w-6 h-6 text-stone-950 group-hover:scale-110 transition-transform stroke-[2.4]" />
            <span className="text-[8.5px] font-black uppercase tracking-wider text-stone-950 -mt-0.5">
              SCAN
            </span>
          </button>
        </div>

        {/* Tab 4: Försäkring */}
        <button
          type="button"
          id="tab-btn-insurance"
          onClick={() => onTabChange('insurance')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center rounded-2xl transition-all ${
            activeTab === 'insurance'
              ? 'text-emerald-400 font-bold scale-102'
              : 'text-stone-400 hover:text-stone-200 active:scale-95'
          }`}
        >
          <div className="relative">
            <ShieldCheck className={`w-5 h-5 transition-transform ${activeTab === 'insurance' ? 'stroke-[2.5px] text-emerald-400' : 'stroke-2'}`} />
            {activeTab === 'insurance' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-400 rounded-full shadow-sm shadow-emerald-400" />
            )}
          </div>
          <span className="text-[11px] tracking-tight mt-0.5">Intyg</span>
        </button>

        {/* Tab 5: Inställningar & Mer */}
        <button
          type="button"
          id="tab-btn-settings"
          onClick={() => onTabChange('settings')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center rounded-2xl transition-all ${
            activeTab === 'settings'
              ? 'text-amber-400 font-bold scale-102'
              : 'text-stone-400 hover:text-stone-200 active:scale-95'
          }`}
        >
          <div className="relative">
            <Settings className={`w-5 h-5 transition-transform ${activeTab === 'settings' ? 'stroke-[2.5px] text-amber-400' : 'stroke-2'}`} />
            {activeTab === 'settings' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-amber-400 rounded-full shadow-sm shadow-amber-400" />
            )}
          </div>
          <span className="text-[11px] tracking-tight mt-0.5">Portfölj</span>
        </button>

      </div>
    </nav>
  );
};
