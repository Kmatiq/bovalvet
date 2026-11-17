import React from 'react';
import { 
  X, 
  Crown, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  FileText, 
  Infinity, 
  Zap, 
  Building2,
  Lock
} from 'lucide-react';
import { AppSettings } from '../types';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onTogglePremium: () => void;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({
  isOpen,
  onClose,
  settings,
  onTogglePremium,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0c101c] text-stone-100 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-amber-500/30 overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-[#0c101c] via-[#161c2c] to-[#241a0d] text-white relative overflow-hidden border-b border-stone-800">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-serif font-bold uppercase tracking-wider mb-2 border border-amber-500/30">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              Private Wealth Advisory & Licens
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-stone-100">
              Private Wealth Dossier & Portföljmodell
            </h2>
            <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-md font-serif">
              Struktur för högvärdeshushåll med samlingar, flera fastigheter och officiella bankintyg.
            </p>
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-full bg-stone-900/80 hover:bg-stone-800 border border-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Free Tier Card */}
            <div className={`p-5 rounded-2xl border ${!settings.isPremium ? 'border-amber-500/50 bg-[#121826]' : 'border-stone-800 bg-[#0c101c]'} flex flex-col justify-between`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-serif font-bold text-sm text-stone-200">Standard Client</span>
                  <span className="text-xs font-serif font-bold px-2 py-0.5 rounded-md bg-stone-800 text-stone-300">0 kr</span>
                </div>
                <p className="text-xs text-stone-400 mb-4 font-serif">
                  För inledande inventering och värdering av de 15 mest värdefulla tillgångarna.
                </p>

                <ul className="space-y-2.5 text-xs text-stone-300 font-serif">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Upp till 15 tillgångar</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>AI-värdering med marknadsanalys</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Krypterad lokal säkerhet</span>
                  </li>
                  <li className="flex items-center gap-2 text-stone-500">
                    <X className="w-4 h-4 text-stone-600 shrink-0" />
                    <span>Inget officiellt revisionsintyg</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Premium Card */}
            <div className={`p-5 rounded-2xl border ${settings.isPremium ? 'border-amber-400 ring-2 ring-amber-400/30 bg-[#171f33]' : 'border-amber-500/30 bg-[#121826]'} flex flex-col justify-between relative`}>
              <div className="absolute -top-2.5 right-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-stone-950 text-[10px] font-serif font-bold uppercase px-2 py-0.5 rounded-full shadow-md">
                Private Wealth
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-serif font-bold text-sm text-amber-300 flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-400" />
                    Family Office Edition
                  </span>
                  <span className="text-xs font-serif font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">199 kr / år</span>
                </div>
                <p className="text-xs text-stone-300 mb-4 font-serif">
                  Fullständigt skydd för hela hushållets portfölj, konst och samlingar.
                </p>

                <ul className="space-y-2.5 text-xs text-stone-200 font-serif">
                  <li className="flex items-center gap-2 font-medium">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    <span><strong>Obegränsat antal</strong> tillgångar & zoner</span>
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Stämplat <strong>PDF-försäkringsintyg</strong></span>
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Certifikat & serienummer-register</span>
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Flera fastigheter (Karlatornet, Visby, mm)</span>
                  </li>
                </ul>
              </div>
            </div>

          </div>

          {/* Interactive Toggle for the user to test both experiences */}
          <div className="bg-[#121826] p-4 rounded-2xl border border-stone-800 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-serif font-bold text-stone-100">
                Testa appen som {settings.isPremium ? 'Family Office-klient' : 'Standard-klient'}
              </div>
              <p className="text-[11px] text-stone-400 font-serif">
                Växla läge direkt för att verifiera säkerhetsgränser och intygslås.
              </p>
            </div>

            <button
              onClick={onTogglePremium}
              className={`px-4 py-2 rounded-xl text-xs font-serif font-bold transition-all cursor-pointer ${
                settings.isPremium
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-stone-950 shadow-md hover:brightness-110'
                  : 'bg-stone-900 border border-stone-700 text-white hover:bg-stone-800'
              }`}
            >
              {settings.isPremium ? 'Aktiv: Family Office' : 'Aktivera Private Wealth'}
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-800 bg-[#090d16] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs sm:text-sm font-serif font-bold text-stone-200 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-xl cursor-pointer"
          >
            Stäng
          </button>
        </div>

      </div>
    </div>
  );
};
