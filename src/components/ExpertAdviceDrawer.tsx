import React from 'react';
import { 
  X, 
  Lightbulb, 
  CheckCircle2, 
  TrendingUp, 
  ShieldCheck, 
  Sparkles, 
  Users, 
  Zap, 
  Target,
  ArrowRight
} from 'lucide-react';

interface ExpertAdviceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onTryScan: () => void;
}

export const ExpertAdviceDrawer: React.FC<ExpertAdviceDrawerProps> = ({
  isOpen,
  onClose,
  onTryScan,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0c101c] text-stone-100 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-amber-500/30 overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-stone-950 relative">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-stone-950 text-amber-400 flex items-center justify-center shadow-lg">
              <Lightbulb className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-serif font-extrabold uppercase tracking-widest text-amber-950">
                Lead Fullstack & Private Wealth Strategi
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-stone-950">
                Strategisk arkitektur för heminventering
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-stone-950 hover:text-black rounded-full bg-black/10 hover:bg-black/20 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm text-stone-300 leading-relaxed font-serif">
          
          {/* Summary Box */}
          <div className="p-4 bg-emerald-950/60 rounded-2xl border border-emerald-500/30 text-emerald-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-base text-emerald-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Sammanfattning: Exceptionell marknadspotential
            </div>
            <p className="text-xs sm:text-sm text-emerald-200/90 leading-relaxed">
              Lösningen eliminerar den största friktionen inom private wealth och hushållsekonomi: ingen dokumenterar sina faktiska tillgångar manuellt. Med vision-baserad multiobjektsigenkänning förvandlas timmar av arbete till sekunder per rum.
            </p>
          </div>

          {/* 4 Pillars Analysis */}
          <div className="space-y-4">
            <h3 className="font-serif font-bold text-stone-100 text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" />
              1. Varför behovet är så markant (Market Fit)
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm bg-[#121826] p-4 rounded-2xl border border-stone-800">
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-400 shrink-0">•</span>
                <span><strong>Hushåll & Försäkringsbehov:</strong> Över 85% av premiumhushåll saknar fotodokumentation vid skadereglering av konst, klockor och möbler.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-400 shrink-0">•</span>
                <span><strong>Flera fastigheter & Delad ekonomi:</strong> Enkelt att fördela lösöre mellan Karlatornet, Visby-sommarhuset eller fjällstugan.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-400 shrink-0">•</span>
                <span><strong>Auktion & Andrahandsvärdering:</strong> Direkt tillgång till uppskattade marknadspriser i SEK vid försäljning eller arvsskifte.</span>
              </li>
            </ul>
          </div>

          {/* UX Success Factors */}
          <div className="space-y-4">
            <h3 className="font-serif font-bold text-stone-100 text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              2. Framgångsfaktorer för användarupplevelsen (UX)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-[#121826] border border-stone-800 rounded-xl">
                <div className="font-serif font-bold text-amber-300 mb-1">⚡ Zero Learning Curve</div>
                <p className="text-stone-400">
                  Inga krångliga formulär i förväg. Öppna appen → Fota → Se AI:ns gissning → Klicka på "Spara". Klart!
                </p>
              </div>

              <div className="p-3.5 bg-[#121826] border border-stone-800 rounded-xl">
                <div className="font-serif font-bold text-amber-300 mb-1">💎 Marknadsvärdering i SEK</div>
                <p className="text-stone-400">
                  AI:n föreslår direkt realistiskt auktions- och andrahandsvärde baserat på märke och skick.
                </p>
              </div>

              <div className="p-3.5 bg-[#121826] border border-stone-800 rounded-xl">
                <div className="font-serif font-bold text-amber-300 mb-1">🎯 Multimarkering i ett foto</div>
                <p className="text-stone-400">
                  Möjlighet att klicka på flera intressanta föremål i samma översiktsbild sparar tid.
                </p>
              </div>

              <div className="p-3.5 bg-[#121826] border border-stone-800 rounded-xl">
                <div className="font-serif font-bold text-amber-300 mb-1">📑 Certifierad PDF-rapport</div>
                <p className="text-stone-400">
                  Direkt export av stämplat intyg för bank- och försäkringsärenden.
                </p>
              </div>
            </div>
          </div>

          {/* Monetization & Business Model */}
          <div className="space-y-4">
            <h3 className="font-serif font-bold text-stone-100 text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              3. Affärsmodell & Private Wealth
            </h3>
            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="p-3.5 bg-[#171f33] rounded-xl border border-amber-500/30">
                <strong className="text-amber-300 block mb-1">A. Family Office Edition:</strong>
                <span>Årslicens för obegränsat antal tillgångar, samlingar, kvitto-OCR och bankstämplade intyg.</span>
              </div>
              <div className="p-3.5 bg-[#121826] rounded-xl border border-stone-800">
                <strong className="text-stone-200 block mb-1">B. B2B Partnerskap med Försäkringsbolag & Banker:</strong>
                <span>Privatbanker och försäkringsbolag (t.ex. If Private, Länsförsäkringar) subventionerar appen för sina förmögenhetskunder.</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-800 bg-[#090d16] flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-serif font-semibold text-stone-400 hover:text-stone-200 cursor-pointer"
          >
            Stäng rådgivning
          </button>

          <button
            onClick={() => {
              onClose();
              onTryScan();
            }}
            className="px-5 py-2.5 text-xs sm:text-sm font-serif font-bold text-stone-950 bg-gradient-to-r from-amber-400 to-yellow-500 hover:brightness-110 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Testa AI-inventeringen nu
          </button>
        </div>

      </div>
    </div>
  );
};
