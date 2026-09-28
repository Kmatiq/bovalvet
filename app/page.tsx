/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Camera, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Mail, 
  KeyRound, 
  Loader2, 
  Archive,
  ArrowRight,
  LogOut
} from "lucide-react";
import { sanitizeAndCompressImage } from "@/lib/sanitizeImage";
import { supabase } from "@/lib/supabaseClient";

interface ItemAnalysisResult {
  title: string;
  category: string;
  brand: string;
  model: string;
  estimated_replacement_cost_sek: number;
  market_value_sek: number;
  condition: "Nyskick" | "Mycket gott" | "Gott" | "Slitage" | "Defekt";
  serial_number_hint: string;
  confidence: number;
}

export default function HomePage() {
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64ForSave, setBase64ForSave] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<ItemAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Soft Gate Auth Modal
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authIsSignUp, setAuthIsSignUp] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Valvstatistik
  const [savedItemsCount, setSavedItemsCount] = useState<number>(0);
  const [totalValuationSek, setTotalValuationSek] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user || null;
      setSessionUser(user);
      if (user) {
        fetchVaultStats(user.id);
      }
    };
    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      setSessionUser(user);
      if (user) {
        fetchVaultStats(user.id);
      } else {
        setSavedItemsCount(0);
        setTotalValuationSek(0);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchVaultStats = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("estimated_replacement_cost_sek")
        .eq("user_id", userId);

      if (!error && data) {
        setSavedItemsCount(data.length);
        const total = data.reduce((sum, item) => sum + (Number(item.estimated_replacement_cost_sek) || 0), 0);
        setTotalValuationSek(total);
      }
    } catch (e) {
      console.error("Kunde inte hämta statistik:", e);
    }
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setResult(null);
    setIsAnalyzing(true);

    try {
      const processed = await sanitizeAndCompressImage(file);
      setPreviewUrl(processed.previewUrl);
      setBase64ForSave(processed.base64ForGemini);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Image: processed.base64ForGemini,
          mimeType: processed.mimeType,
        }),
      });

      const response = await res.json();
      if (response.success && response.data) {
        setResult(response.data);
      } else {
        setErrorMessage(response.error || "Kunde inte tolka föremålet.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Nätverksfel: ${msg}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executeSaveItem = async (userId: string) => {
    if (!result || !base64ForSave) return;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      // Skapa fil från Base64
      const byteCharacters = atob(base64ForSave);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/jpeg" });

      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      
      // Ladda upp bild till Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("item-photos")
        .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });

      if (uploadError) {
        throw new Error(`Lagringsfel: ${uploadError.message}`);
      }

      // Spara metadata i tabellen items
      const { error: insertError } = await supabase.from("items").insert({
        user_id: userId,
        title: result.title,
        category: result.category,
        brand: result.brand,
        model: result.model,
        estimated_replacement_cost_sek: result.estimated_replacement_cost_sek,
        market_value_sek: result.market_value_sek,
        condition: result.condition,
        serial_number_hint: result.serial_number_hint,
        image_path: fileName,
        photo_path: fileName,
      });

      if (insertError) {
        throw new Error(`Databasfel: ${insertError.message}`);
      }

      await fetchVaultStats(userId);
      setSuccessMessage(`"${result.title}" har krypterats och sparats i ditt valv!`);
      setResult(null);
      setPreviewUrl(null);
      setBase64ForSave(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClick = () => {
    if (!sessionUser) {
      setShowAuthModal(true);
    } else {
      executeSaveItem(sessionUser.id);
    }
  };

  // Smart inloggning & registrering
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      let activeUser: any = null;

      if (authIsSignUp) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        });

        // Om användaren redan finns eller bekräftelse krävs, prova direkt inloggning med samma lösenord
        if (signUpData?.session) {
          activeUser = signUpData.user;
        } else {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: authEmail,
            password: authPassword,
          });

          if (signInError) {
            throw new Error(signUpError?.message || signInError.message);
          }
          activeUser = signInData.user;
        }
      } else {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (signInError) throw signInError;
        activeUser = signInData.user;
      }

      if (activeUser) {
        setSessionUser(activeUser);
        setShowAuthModal(false);
        // Vänta 300ms så att auth-headern hinner fästas
        await new Promise((r) => setTimeout(r, 300));
        await executeSaveItem(activeUser.id);
      }
    } catch (err: any) {
      setAuthError(err.message || "Kunde inte logga in. Kontrollera lösenordet.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSessionUser(null);
  };

  const resetCapture = () => {
    setPreviewUrl(null);
    setBase64ForSave(null);
    setResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/80 border-b border-slate-200/80 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              PK
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-slate-800 block leading-tight">PrylKoll</span>
              {sessionUser && (
                <span className="text-[11px] text-emerald-600 font-semibold block">● {sessionUser.email?.split("@")[0]}</span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{savedItemsCount > 0 ? `${totalValuationSek.toLocaleString("sv-SE")} kr` : "Krypterat Valv"}</span>
            </div>
            {sessionUser && (
              <button 
                onClick={handleSignOut}
                title="Logga ut"
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageCapture}
        className="hidden"
      />

      <div className="max-w-md mx-auto px-4 pt-6 space-y-6">
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl flex items-start space-x-3 text-sm shadow-sm animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Sparad i Valvet!</p>
              <p className="text-xs text-emerald-700 mt-0.5">{successMessage}</p>
              <div className="mt-2 text-xs font-semibold text-emerald-800">
                Ditt valv innehåller nu {savedItemsCount} {savedItemsCount === 1 ? "sak" : "saker"} (totalt {totalValuationSek.toLocaleString("sv-SE")} kr)
              </div>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-xs text-emerald-600 font-bold">Stäng</button>
          </div>
        )}

        {!previewUrl && !isAnalyzing && (
          <div className="text-center space-y-2 py-4">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {savedItemsCount > 0 ? "Fota nästa ägodel" : "Fota din första ägodel"}
            </h1>
            <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
              AI:n känner omedelbart igen märke, modell och estimerar försäkringsvärdet i SEK.
            </p>
          </div>
        )}

        {!previewUrl && !isAnalyzing && (
          <div className="pt-2 flex flex-col items-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex flex-col items-center justify-center w-64 h-64 rounded-full bg-white border-4 border-dashed border-indigo-200 shadow-xl shadow-indigo-100 hover:border-indigo-400 hover:scale-105 active:scale-95 transition-all duration-300"
            >
              <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-300 group-hover:bg-indigo-700 transition">
                <Camera className="w-12 h-12" />
              </div>
              <span className="mt-4 font-semibold text-slate-700 text-sm">
                Tryck för att fota
              </span>
              <span className="text-xs text-slate-400 mt-1">eller välj från biblioteket</span>
            </button>

            {savedItemsCount > 0 && (
              <div className="mt-8 w-full bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Archive className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Mitt Privata Valv</h4>
                    <p className="text-xs text-slate-500">{savedItemsCount} inventerade föremål</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-medium">Totalt värde</span>
                  <span className="text-sm font-extrabold text-slate-900">{totalValuationSek.toLocaleString("sv-SE")} kr</span>
                </div>
              </div>
            )}
          </div>
        )}

        {isAnalyzing && (
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 text-center space-y-4 animate-in fade-in">
            {previewUrl && (
              <div className="relative w-48 h-48 mx-auto rounded-2xl overflow-hidden shadow-inner bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Skannas" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-indigo-500/20 backdrop-blur-[1px] flex items-center justify-center">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse" />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 text-indigo-600 font-semibold text-sm">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Gemini Vision analyserar...</span>
              </div>
              <p className="text-xs text-slate-400">
                Identifierar märke, skick och räknar ut marknadsvärdet.
              </p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-start space-x-3 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Något gick fel</p>
              <p className="text-xs text-rose-700 mt-1 font-mono break-all">{errorMessage}</p>
            </div>
            <button onClick={resetCapture} className="text-xs underline font-medium">Försök igen</button>
          </div>
        )}

        {result && (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="relative h-56 bg-slate-100">
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt={result.title} className="w-full h-full object-cover" />
              )}
              <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-slate-100 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-700">
                  {Math.round(result.confidence * 100)}% säkerhet
                </span>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <span className="text-xs font-bold tracking-wider uppercase text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                  {result.category}
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-2 leading-snug">
                  {result.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Fabrikat: <span className="font-medium text-slate-700">{result.brand}</span> | Modell: <span className="font-medium text-slate-700">{result.model}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-400 block">Nypris (idag)</span>
                  <span className="text-lg font-extrabold text-slate-900">
                    {result.estimated_replacement_cost_sek.toLocaleString("sv-SE")} kr
                  </span>
                </div>
                <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100">
                  <span className="text-[11px] font-medium text-emerald-700 block">Begagnatvärde</span>
                  <span className="text-lg font-extrabold text-emerald-900">
                    {result.market_value_sek.toLocaleString("sv-SE")} kr
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl space-y-1.5 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-400">Bedömt skick:</span>
                  <span className="font-semibold text-slate-800">{result.condition}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tips för serienr:</span>
                  <span className="font-medium text-slate-700 text-right">{result.serial_number_hint}</span>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  onClick={handleSaveClick}
                  disabled={isSaving}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-2xl font-semibold text-sm shadow-lg shadow-indigo-200 transition flex items-center justify-center space-x-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Krypterar och sparar...</span>
                    </>
                  ) : (
                    <span>Spara i mitt valv</span>
                  )}
                </button>
                <button
                  onClick={resetCapture}
                  disabled={isSaving}
                  className="w-full py-2.5 text-slate-500 hover:text-slate-700 text-xs font-medium transition"
                >
                  Avbryt och fota ett annat föremål
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 space-y-4">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {authIsSignUp ? "Säkra ditt personliga valv" : "Logga in till ditt valv"}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Skapa ett konto för att kryptera och spara dina inventerade ägodelar tryggt.
              </p>
            </div>

            {authError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-xl text-xs">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">E-postadress</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="din.epost@exempel.se"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Lösenord</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Minst 6 tecken"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm shadow-md transition flex items-center justify-center space-x-2"
              >
                {authLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{authIsSignUp ? "Skapa konto & Spara" : "Logga in & Spara"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setAuthIsSignUp(!authIsSignUp)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {authIsSignUp ? "Har du redan ett konto? Klicka här för att logga in" : "Inget konto än? Skapa ett här"}
              </button>
            </div>

            <button
              onClick={() => setShowAuthModal(false)}
              className="w-full py-1 text-slate-400 hover:text-slate-600 text-xs font-medium"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}
    </main>
  );
}