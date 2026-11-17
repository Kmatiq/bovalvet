import React from 'react';
import { Camera, FileText, Sparkles, Crown, Lightbulb, ShieldCheck, Download, Plus } from 'lucide-react';
import { AppSettings } from '../types';
import { formatCurrency } from '../utils/formatters';

interface HeaderProps {
  totalValue: number;
  totalItems: number;
  settings: AppSettings;
  onOpenScan: () => void;
  onOpenReport: () => void;
  onOpenPremium: () => void;
  onOpenAdvice: () => void;
  onExportCSV: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalValue,
  totalItems,
  settings,
  onOpenScan,
  onOpenReport,
  onOpenPremium,
  onOpenAdvice,
  onExportCSV,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-400 flex items-center justify-center text-white shadow-md shadow-amber-500/20 ring-2 ring-white">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg sm:text-xl text-stone-900 tracking-tight flex items-center gap-1.5">
                  HemKoll <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">AI</span>
                </h1>
                {settings.isPremium ? (
                  <button 
                    onClick={onOpenPremium}
                    className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-stone-950 shadow-xs hover:opacity-90 transition-opacity"
                  >
                    <Crown className="w-3 h-3" /> PRO
                  </button>
                ) : (
                  <button 
                    onClick={onOpenPremium}
                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200 transition-colors"
                  >
                    Gratisplan ({totalItems}/{settings.freeItemLimit})
                  </button>
                )}
              </div>
              <p className="text-xs text-stone-500 hidden sm:block">
                Smart heminventering för försäkring & ordning
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Expert feedback on user prompt */}
            <button
              onClick={onOpenAdvice}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-amber-900 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 rounded-xl transition-all shadow-xs"
              title="Expertens omdöme om heminventerings-idén"
            >
              <Lightbulb className="w-4 h-4 text-amber-600" />
              <span className="hidden md:inline font-semibold">Expertens syn på idén</span>
              <span className="md:hidden font-semibold">Idé & Råd</span>
            </button>

            {/* Insurance Report Button */}
            <button
              onClick={onOpenReport}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-stone-700 bg-stone-100 hover:bg-stone-200/80 border border-stone-200 rounded-xl transition-all shadow-xs"
            >
              <FileText className="w-4 h-4 text-stone-600" />
              <span className="hidden sm:inline">Försäkringsrapport</span>
              <span className="sm:hidden">Rapport</span>
            </button>

            {/* Primary Action: Snap / Scan */}
            <button
              onClick={onOpenScan}
              className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold text-white bg-stone-900 hover:bg-stone-800 active:scale-98 rounded-xl shadow-md transition-all ring-1 ring-stone-900"
            >
              <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              <span className="hidden xs:inline">Fota & Inventera</span>
              <span className="xs:hidden">Fota</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
