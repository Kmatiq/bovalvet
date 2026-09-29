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
  LogOut,
  Trash2,
  Tag,
  ArrowLeft,
  X,
  Edit3,
  Info,
  FileDown,
  Home,
  MapPin,
  Building2,
  ChevronDown,
  AlertTriangle,
  Receipt,
  Clock,
  CalendarCheck,
  ShoppingBag,
  Copy,
  Check
} from "lucide-react";
import { sanitizeAndCompressImage } from "@/lib/sanitizeImage";
import { supabase } from "@/lib/supabaseClient";
import { generateVaultPdf } from "@/lib/generatePdfReport";

const STANDARD_ROOMS = [
  "Vardagsrum",
  "Kök",
  "Badrum / Tvättstuga",
  "Sovrum",
  "Kontor / Arbetsrum",
  "Förråd / Garage",
  "Hall",
  "Balkong / Altan",
  "Övrigt"
];

interface Property {
  id: string;
  name: string;
  property_type: string;
  address?: string;
  insurance_company?: string;
  policy_number?: string;
  coverage_limit_sek: number;
  deductible_sek: number;
  has_brf_supplement: boolean;
}

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

interface VaultItem {
  id: string;
  property_id?: string;
  title: string;
  category: string;
  room?: string;
  brand: string;
  model: string;
  estimated_replacement_cost_sek: number;
  market_value_sek: number;
  condition: string;
  serial_number_hint: string;
  serial_number?: string;
  notes?: string;
  image_path?: string;
  photo_path?: string;
  imageUrl?: string;
  receipt_path?: string;
  receiptUrl?: string;
  purchase_date?: string;
  purchase_store?: string;
  purchase_price_sek?: number;
  warranty_months?: number;
  created_at: string;
}

function getWarrantyStatus(purchaseDateStr?: string, warrantyMonths: number = 36) {
  if (!purchaseDateStr) return null;
  const pDate = new Date(purchaseDateStr);
  if (isNaN(pDate.getTime())) return null;

  const now = new Date();
  const expiryDate = new Date(pDate);
  expiryDate.setMonth(expiryDate.getMonth() + warrantyMonths);

  const diffMs = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.ceil(diffDays / 30);

  if (diffDays <= 0) {
    return {
      status: "expired",
      label: "Garantin har löpt ut",
      expiryDate: expiryDate.toLocaleDateString("sv-SE"),
      badgeColor: "bg-slate-100 text-slate-500",
    };
  }

  if (diffMonths <= 2) {
    return {
      status: "expiring_soon",
      label: `Löper ut om ${diffDays} dagar!`,
      expiryDate: expiryDate.toLocaleDateString("sv-SE"),
      badgeColor: "bg-amber-100 text-amber-800 border border-amber-300",
    };
  }

  return {
    status: "active",
    label: `Aktiv garanti (${diffMonths} mån kvar)`,
    expiryDate: expiryDate.toLocaleDateString("sv-SE"),
    badgeColor: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  };
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"camera" | "vault">("camera");
  const [sessionUser, setSessionUser] = useState<any>(null);

  // Bostäder & Fastigheter
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [isEditingProperty, setIsEditingProperty] = useState(false);
  const [propertyFormData, setPropertyFormData] = useState<Partial<Property>>({});
  const [isSavingProperty, setIsSavingProperty] = useState(false);

  // Bild & Analys
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64ForSave, setBase64ForSave] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<ItemAnalysisResult | null>(null);

  // Rumsval
  const [selectedRoomForSave, setSelectedRoomForSave] = useState<string>("Vardagsrum");
  const [customRooms, setCustomRooms] = useState<string[]>([]);
  const [isAddingCustomRoom, setIsAddingCustomRoom] = useState(false);
  const [newRoomInput, setNewRoomInput] = useState("");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Soft Gate Auth Modal
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authIsSignUp, setAuthIsSignUp] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Valvstatus & lista
  const [savedItemsCount, setSavedItemsCount] = useState<number>(0);
  const [totalValuationSek, setTotalValuationSek] = useState<number>(0);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [isLoadingVault, setIsLoadingVault] = useState(false);
  const [selectedFilterType, setSelectedFilterType] = useState<"room" | "category">("room");
  const [activeFilter, setActiveFilter] = useState<string>("Alla");
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  // Detalj- och kvittohantering
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState(false);
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);

  // Blocket & Tradera-annonser
  const [listingModalItem, setListingModalItem] = useState<VaultItem | null>(null);
  const [listingData, setListingData] = useState<any>(null);
  const [isGeneratingListing, setIsGeneratingListing] = useState(false);
  const [activeListingTab, setActiveListingTab] = useState<"blocket" | "tradera">("blocket");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user || null;
      setSessionUser(user);
      if (user) {
        fetchProperties(user.id);
      }
    };
    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      setSessionUser(user);
      if (user) {
        fetchProperties(user.id);
      } else {
        setSavedItemsCount(0);
        setTotalValuationSek(0);
        setVaultItems([]);
        setProperties([]);
        setSelectedProperty(null);
        setActiveTab("camera");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchProperties = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setProperties(data);
        const current = selectedProperty ? data.find((p) => p.id === selectedProperty.id) || data[0] : data[0];
        setSelectedProperty(current);
        fetchVaultStats(userId, current.id);
        fetchVaultItems(userId, current.id);
      } else {
        const { data: newProp } = await supabase
          .from("properties")
          .insert({
            user_id: userId,
            name: "Hemma",
            property_type: "Bostadsrätt",
            coverage_limit_sek: 1000000,
            deductible_sek: 1500,
          })
          .select()
          .single();
        if (newProp) {
          setProperties([newProp]);
          setSelectedProperty(newProp);
          fetchVaultStats(userId, newProp.id);
          fetchVaultItems(userId, newProp.id);
        }
      }
    } catch (e) {
      console.error("Kunde inte hämta bostäder:", e);
    }
  };

  const fetchVaultStats = async (userId: string, propertyId?: string) => {
    try {
      let query = supabase.from("items").select("estimated_replacement_cost_sek").eq("user_id", userId);
      if (propertyId) {
        query = query.eq("property_id", propertyId);
      }
      const { data, error } = await query;

      if (!error && data) {
        setSavedItemsCount(data.length);
        const total = data.reduce((sum, item) => sum + (Number(item.estimated_replacement_cost_sek) || 0), 0);
        setTotalValuationSek(total);
      }
    } catch (e) {
      console.error("Kunde inte hämta statistik:", e);
    }
  };

  const fetchVaultItems = async (userId: string, propertyId?: string) => {
    setIsLoadingVault(true);
    try {
      let query = supabase
        .from("items")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (propertyId) {
        query = query.eq("property_id", propertyId);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        const itemsWithSignedUrls: VaultItem[] = await Promise.all(
          data.map(async (item) => {
            const rawPath = item.image_path || item.photo_path;
            let signed = "";
            if (rawPath) {
              const { data: urlData } = await supabase.storage
                .from("item-photos")
                .createSignedUrl(rawPath, 3600);
              signed = urlData?.signedUrl || "";
            }

            let receiptSigned = "";
            if (item.receipt_path) {
              const { data: rUrlData } = await supabase.storage
                .from("item-photos")
                .createSignedUrl(item.receipt_path, 3600);
              receiptSigned = rUrlData?.signedUrl || "";
            }

            return {
              ...item,
              imageUrl: signed,
              receiptUrl: receiptSigned,
            };
          })
        );
        setVaultItems(itemsWithSignedUrls);
      }
    } catch (err: any) {
      console.error("Kunde inte hämta valvföremål:", err);
    } finally {
      setIsLoadingVault(false);
    }
  };

  const handleOpenVault = () => {
    if (!sessionUser) {
      setShowAuthModal(true);
      return;
    }
    setActiveTab("vault");
    fetchVaultItems(sessionUser.id, selectedProperty?.id);
  };

  const handleDeleteItem = async (e: React.MouseEvent, item: VaultItem) => {
    e.stopPropagation();
    if (!window.confirm(`Vill du verkligen ta bort "${item.title}" från valvet?`)) return;

    setDeletingItemId(item.id);
    try {
      const { error: dbError } = await supabase.from("items").delete().eq("id", item.id);
      if (dbError) throw dbError;

      const pathToDelete = item.image_path || item.photo_path;
      if (pathToDelete) {
        await supabase.storage.from("item-photos").remove([pathToDelete]);
      }
      if (item.receipt_path) {
        await supabase.storage.from("item-photos").remove([item.receipt_path]);
      }

      setVaultItems((prev) => prev.filter((i) => i.id !== item.id));
      if (editingItem?.id === item.id) {
        setEditingItem(null);
      }
      if (sessionUser) {
        fetchVaultStats(sessionUser.id, selectedProperty?.id);
      }
    } catch (err: any) {
      alert(`Kunde inte radera: ${err.message}`);
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleSaveItemUpdates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !sessionUser) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("items")
        .update({
          title: editingItem.title,
          brand: editingItem.brand,
          model: editingItem.model,
          room: editingItem.room || "Ospecificerat",
          estimated_replacement_cost_sek: Number(editingItem.estimated_replacement_cost_sek),
          market_value_sek: Number(editingItem.market_value_sek),
          serial_number: editingItem.serial_number || "",
          notes: editingItem.notes || "",
          purchase_date: editingItem.purchase_date || null,
          purchase_store: editingItem.purchase_store || null,
          purchase_price_sek: editingItem.purchase_price_sek ? Number(editingItem.purchase_price_sek) : null,
          warranty_months: editingItem.warranty_months ? Number(editingItem.warranty_months) : 36,
          receipt_path: editingItem.receipt_path || null,
        })
        .eq("id", editingItem.id);

      if (error) throw error;

      setVaultItems((prev) =>
        prev.map((i) => (i.id === editingItem.id ? { ...editingItem } : i))
      );
      await fetchVaultStats(sessionUser.id, selectedProperty?.id);
      setEditingItem(null);
    } catch (err: any) {
      alert(`Kunde inte uppdatera: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Kvitto-uppladdning och AI-tolkning
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingItem || !sessionUser) return;

    setIsAnalyzingReceipt(true);
    try {
      const processed = await sanitizeAndCompressImage(file);

      const byteCharacters = atob(processed.base64ForGemini);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/jpeg" });
      const receiptFileName = `${sessionUser.id}/receipt-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("item-photos")
        .upload(receiptFileName, blob, { contentType: "image/jpeg", upsert: true });

      if (uploadError) throw uploadError;

      const res = await fetch("/api/analyze-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Image: processed.base64ForGemini,
          mimeType: processed.mimeType,
        }),
      });

      const response = await res.json();
      if (response.success && response.data) {
        const rData = response.data;
        setEditingItem((prev) =>
          prev
            ? {
                ...prev,
                receipt_path: receiptFileName,
                receiptUrl: processed.previewUrl,
                purchase_date: rData.purchase_date || prev.purchase_date,
                purchase_store: rData.store || prev.purchase_store,
                purchase_price_sek: rData.total_amount_sek || prev.purchase_price_sek,
                warranty_months: rData.suggested_warranty_months || 36,
              }
            : null
        );
      } else {
        setEditingItem((prev) =>
          prev
            ? {
                ...prev,
                receipt_path: receiptFileName,
                receiptUrl: processed.previewUrl,
              }
            : null
        );
      }
    } catch (err: any) {
      alert(`Kunde inte analysera kvitto: ${err.message}`);
    } finally {
      setIsAnalyzingReceipt(false);
      if (receiptInputRef.current) receiptInputRef.current.value = "";
    }
  };

  // Skapa säljannons med Gemini
  const handleOpenListingModal = async (item: VaultItem) => {
    setListingModalItem(item);
    setListingData(null);
    setIsGeneratingListing(true);
    setCopiedText(null);

    try {
      const res = await fetch("/api/generate-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });

      const response = await res.json();
      if (response.success && response.data) {
        setListingData(response.data);
      } else {
        alert(response.error || "Kunde inte generera säljannons.");
        setListingModalItem(null);
      }
    } catch (err: any) {
      alert(`Ett fel uppstod: ${err.message}`);
      setListingModalItem(null);
    } finally {
      setIsGeneratingListing(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
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
        if (response.data.category === "Vitvaror & Hushåll") {
          setSelectedRoomForSave("Badrum / Tvättstuga");
        } else if (response.data.category === "Hemelektronik & TV") {
          setSelectedRoomForSave("Vardagsrum");
        } else if (response.data.category === "Verktyg & Trädgård") {
          setSelectedRoomForSave("Förråd / Garage");
        }
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
      const byteCharacters = atob(base64ForSave);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/jpeg" });

      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("item-photos")
        .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });

      if (uploadError) {
        throw new Error(`Lagringsfel: ${uploadError.message}`);
      }

      const { error: insertError } = await supabase.from("items").insert({
        user_id: userId,
        property_id: selectedProperty?.id || null,
        title: result.title,
        category: result.category,
        room: selectedRoomForSave,
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

      await fetchVaultStats(userId, selectedProperty?.id);
      setSuccessMessage(`"${result.title}" sparades i ${selectedRoomForSave} (${selectedProperty?.name || "Hemma"})!`);
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
        await new Promise((r) => setTimeout(r, 300));
        await fetchProperties(activeUser.id);
        if (result) {
          await executeSaveItem(activeUser.id);
        }
      }
    } catch (err: any) {
      setAuthError(err.message || "Kunde inte logga in. Kontrollera uppgifterna.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSessionUser(null);
    setActiveTab("camera");
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

  // Rumslista & Filter
  const allAvailableRooms = Array.from(
    new Set([...STANDARD_ROOMS, ...customRooms, ...(vaultItems.map((i) => i.room).filter(Boolean) as string[])])
  );

  const roomFilters = ["Alla", ...Array.from(new Set(vaultItems.map((i) => i.room || "Ospecificerat")))];
  const categoryFilters = ["Alla", ...Array.from(new Set(vaultItems.map((i) => i.category)))];
  const currentFilterList = selectedFilterType === "room" ? roomFilters : categoryFilters;

  const filteredItems = vaultItems.filter((i) => {
    if (activeFilter === "Alla") return true;
    if (selectedFilterType === "room") {
      return (i.room || "Ospecificerat") === activeFilter;
    }
    return i.category === activeFilter;
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/85 border-b border-slate-200/80 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              PK
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-slate-800 block leading-tight">PrylKoll</span>
              {sessionUser && (
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <button
                    onClick={() => {
                      setPropertyFormData(
                        selectedProperty || {
                          name: "",
                          property_type: "Bostadsrätt",
                          coverage_limit_sek: 1000000,
                          deductible_sek: 1500,
                        }
                      );
                      setShowPropertyModal(true);
                    }}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg border border-indigo-200/60 transition"
                  >
                    <Building2 className="w-3 h-3 text-indigo-600" />
                    <span>{selectedProperty?.name || "Hemma"}</span>
                    <ChevronDown className="w-3 h-3 text-indigo-500" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenVault}
              className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-full border border-emerald-200/60 shadow-xs hover:bg-emerald-100 transition active:scale-95"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{savedItemsCount > 0 ? `${totalValuationSek.toLocaleString("sv-SE")} kr` : "Krypterat Valv"}</span>
            </button>
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

        {/* Tab-växlare */}
        {sessionUser && (
          <div className="max-w-md mx-auto mt-2.5 flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("camera")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === "camera" 
                  ? "bg-white text-indigo-600 shadow-xs" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Fota & Skanna
            </button>
            <button
              onClick={handleOpenVault}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center space-x-1 ${
                activeTab === "vault" 
                  ? "bg-white text-indigo-600 shadow-xs" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>Mitt Valv</span>
              {savedItemsCount > 0 && (
                <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {savedItemsCount}
                </span>
              )}
            </button>
          </div>
        )}
      </header>

      {/* Dolda filinputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageCapture}
        className="hidden"
      />
      <input
        ref={receiptInputRef}
        type="file"
        accept="image/*"
        onChange={handleReceiptUpload}
        className="hidden"
      />

      {/* VY 1: KAMERA / SKANNA */}
      {activeTab === "camera" && (
        <div className="max-w-md mx-auto px-4 pt-6 space-y-6">
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl flex items-start space-x-3 text-sm shadow-sm animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Sparad i Valvet!</p>
                <p className="text-xs text-emerald-700 mt-0.5">{successMessage}</p>
                <button
                  onClick={handleOpenVault}
                  className="mt-2 text-xs font-bold text-emerald-800 underline block"
                >
                  Visa alla inventerade föremål i valvet ➔
                </button>
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
                Placeras i <strong>{selectedProperty?.name || "Hemma"}</strong>. AI:n estimerar försäkringsvärdet direkt.
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
                <button
                  onClick={handleOpenVault}
                  className="mt-8 w-full bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition active:scale-99 flex items-center justify-between text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Archive className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Mitt Privata Valv ({selectedProperty?.name})</h4>
                      <p className="text-xs text-slate-500">{savedItemsCount} inventerade föremål</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-medium">Totalt värde</span>
                    <span className="text-sm font-extrabold text-slate-900">{totalValuationSek.toLocaleString("sv-SE")} kr</span>
                  </div>
                </button>
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

                {/* VÄLJ RUM */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-600 flex items-center space-x-1">
                      <Home className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Placering i {selectedProperty?.name || "bostaden"}:</span>
                    </label>
                    {!isAddingCustomRoom && (
                      <button
                        type="button"
                        onClick={() => setIsAddingCustomRoom(true)}
                        className="text-[11px] text-indigo-600 font-bold hover:underline"
                      >
                        + Eget rum
                      </button>
                    )}
                  </div>

                  {isAddingCustomRoom && (
                    <div className="flex items-center space-x-1.5 pb-1">
                      <input
                        type="text"
                        placeholder="t.ex. Vinkällare, Ateljé..."
                        value={newRoomInput}
                        onChange={(e) => setNewRoomInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newRoomInput.trim()) {
                            const trimmed = newRoomInput.trim();
                            setCustomRooms((prev) => [...prev, trimmed]);
                            setSelectedRoomForSave(trimmed);
                            setNewRoomInput("");
                            setIsAddingCustomRoom(false);
                          }
                        }}
                        className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl"
                      >
                        Lägg till
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewRoomInput("");
                          setIsAddingCustomRoom(false);
                        }}
                        className="px-2 py-1.5 text-slate-400 text-xs font-medium"
                      >
                        Avbryt
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {allAvailableRooms.map((room) => (
                      <button
                        key={room}
                        type="button"
                        onClick={() => setSelectedRoomForSave(room)}
                        className={`text-xs px-2.5 py-1 rounded-xl font-medium transition ${
                          selectedRoomForSave === room
                            ? "bg-indigo-600 text-white shadow-xs font-semibold"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {room}
                      </button>
                    ))}
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
      )}

      {/* VY 2: MITT PRIVATA VALV */}
      {activeTab === "vault" && (
        <div className="max-w-md mx-auto px-4 pt-4 space-y-5 animate-in fade-in">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setActiveTab("camera")}
              className="flex items-center space-x-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Fota ny pryl</span>
            </button>
            <span className="text-xs font-bold text-slate-400">
              {filteredItems.length} av {vaultItems.length} visade
            </span>
          </div>

          {/* Sammanfattningskort med Försäkringsmätare */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                  Totalt Försäkringsvärde
                </span>
                <span className="text-[10px] font-semibold bg-white/10 px-2 py-0.5 rounded-full text-indigo-200">
                  {selectedProperty?.name || "Hemma"}
                </span>
              </div>
              <div className="text-3xl font-extrabold tracking-tight">
                {totalValuationSek.toLocaleString("sv-SE")} kr
              </div>
              <p className="text-xs text-indigo-200/80 pt-1">
                Krypterad inventarieförteckning redo för försäkringsanspråk och andrahandsmarknad.
              </p>

              {/* Underförsäkringskoll */}
              {selectedProperty && (
                <div className="pt-3 border-t border-indigo-800/80 mt-2 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-indigo-200">
                      Försäkrat lösörestak: <strong>{Number(selectedProperty.coverage_limit_sek).toLocaleString("sv-SE")} kr</strong> ({selectedProperty.insurance_company || "Försäkringsbolag"})
                    </span>
                    <span className="font-bold">
                      {Math.round((totalValuationSek / (selectedProperty.coverage_limit_sek || 1)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        totalValuationSek > selectedProperty.coverage_limit_sek 
                          ? "bg-rose-500" 
                          : "bg-emerald-400"
                      }`}
                      style={{ width: `${Math.min(100, Math.round((totalValuationSek / (selectedProperty.coverage_limit_sek || 1)) * 100))}%` }}
                    />
                  </div>
                  {totalValuationSek > selectedProperty.coverage_limit_sek && (
                    <div className="flex items-center space-x-1 text-xs text-rose-300 font-semibold pt-1">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-rose-400" />
                      <span>Varning: Du är underförsäkrad med {(totalValuationSek - selectedProperty.coverage_limit_sek).toLocaleString("sv-SE")} kr!</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
              <ShieldCheck className="w-40 h-40 text-white" />
            </div>
          </div>

          {/* Exportknapp för Försäkringsunderlag */}
          {vaultItems.length > 0 && (
            <button
              onClick={() => generateVaultPdf(vaultItems, sessionUser?.email || "Användare", totalValuationSek)}
              className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-800 rounded-2xl text-xs font-bold shadow-xs hover:shadow transition flex items-center justify-center space-x-2 active:scale-98"
            >
              <FileDown className="w-4 h-4 text-indigo-600" />
              <span>Ladda ner Försäkringsrapport (PDF)</span>
            </button>
          )}

          {/* FILTERTYP-VÄXLARE */}
          {vaultItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">Filtrera på:</span>
                <div className="flex bg-slate-200/70 p-0.5 rounded-lg text-[11px]">
                  <button
                    onClick={() => {
                      setSelectedFilterType("room");
                      setActiveFilter("Alla");
                    }}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      selectedFilterType === "room" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    Rum
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFilterType("category");
                      setActiveFilter("Alla");
                    }}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      selectedFilterType === "category" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    Kategori
                  </button>
                </div>
              </div>

              {/* FILTER-PILLS */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                {currentFilterList.map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition ${
                      activeFilter === filter
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Laddningsindikator */}
          {isLoadingVault && (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
              <p className="text-xs">Hämtar och dekrypterar dina föremål...</p>
            </div>
          )}

          {/* Tomt valv */}
          {!isLoadingVault && vaultItems.length === 0 && (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-6 space-y-3">
              <Archive className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-800">Valvet är tomt för {selectedProperty?.name}</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Börja inventera genom att fota din första värdesak med kameran.
              </p>
              <button
                onClick={() => setActiveTab("camera")}
                className="mt-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition"
              >
                Fota första föremålet
              </button>
            </div>
          )}

          {/* Föremålslista (Rent och avskalat utan externa annonsknappar) */}
          {!isLoadingVault && filteredItems.length > 0 && (
            <div className="space-y-4">
              {filteredItems.map((item) => {
                const wStatus = getWarrantyStatus(item.purchase_date, item.warranty_months || 36);

                return (
                  <div
                    key={item.id}
                    onClick={() => setEditingItem({ ...item })}
                    className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md hover:border-indigo-300 transition cursor-pointer space-y-3"
                  >
                    <div className="flex space-x-3.5">
                      <div className="w-20 h-20 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden relative border border-slate-100">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Tag className="w-6 h-6" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            {item.category}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded flex items-center space-x-1">
                            <MapPin className="w-2.5 h-2.5 text-slate-400 inline" />
                            <span>{item.room || "Ospecificerat"}</span>
                          </span>
                          {item.receipt_path && (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center space-x-0.5">
                              <Receipt className="w-2.5 h-2.5 inline" />
                              <span>Kvitto ✓</span>
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm mt-1 truncate">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-500 truncate">
                          {item.brand} {item.model ? `• ${item.model}` : ""}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[11px] font-bold text-slate-800">
                            {Number(item.estimated_replacement_cost_sek).toLocaleString("sv-SE")} kr
                          </span>
                          <span className="text-[11px] text-slate-400">• Beg. {Number(item.market_value_sek).toLocaleString("sv-SE")} kr</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDeleteItem(e, item)}
                        disabled={deletingItemId === item.id}
                        className="text-slate-300 hover:text-rose-500 p-1 self-start transition"
                        title="Ta bort från valv"
                      >
                        {deletingItemId === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Garantistatus bricka */}
                    {wStatus && (
                      <div className={`rounded-xl px-2.5 py-1 text-[11px] font-semibold flex items-center justify-between ${wStatus.badgeColor}`}>
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{wStatus.label}</span>
                        </div>
                        <span className="text-[10px] opacity-75">T.o.m. {wStatus.expiryDate}</span>
                      </div>
                    )}

                    {/* Rent bottenfält */}
                    <div className="bg-slate-50 rounded-xl p-2.5 text-[11px] text-slate-600 flex justify-between items-center border border-slate-100">
                      <div>
                        <span className="text-slate-400">Skick: </span>
                        <span className="font-semibold text-slate-800">{item.condition || "Gott"}</span>
                      </div>
                      <div className="text-right text-indigo-600 font-medium text-[11px] flex items-center space-x-1">
                        <Edit3 className="w-3 h-3" />
                        <span>Klicka för kvitto & detaljer</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* DETALJ- OCH KVITTOMODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 w-full max-w-md shadow-2xl border border-slate-100 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                <span>Föremålsuppgifter</span>
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editingItem.imageUrl && (
              <div className="w-full h-44 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={editingItem.imageUrl} alt={editingItem.title} className="w-full h-full object-cover" />
              </div>
            )}

            {/* KNAPP: SKAPA SÄLJANNONS (Inne i föremålet) */}
            <button
              type="button"
              onClick={() => handleOpenListingModal(editingItem)}
              className="w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 transition active:scale-98 shadow-xs"
            >
              <ShoppingBag className="w-4 h-4 text-indigo-600" />
              <span>Skapa säljannons (Blocket / Tradera)</span>
            </button>

            {/* SEKTION: KVITTO & GARANTIVAKT */}
            <div className="bg-gradient-to-br from-indigo-50/70 to-slate-50 p-3.5 rounded-2xl border border-indigo-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-950">
                  <Receipt className="w-4 h-4 text-indigo-600" />
                  <span>Kvitto & Garantivakt</span>
                </div>
                <button
                  type="button"
                  onClick={() => receiptInputRef.current?.click()}
                  disabled={isAnalyzingReceipt}
                  className="px-2.5 py-1 bg-indigo-600 text-white text-[11px] font-bold rounded-lg hover:bg-indigo-700 transition flex items-center space-x-1"
                >
                  {isAnalyzingReceipt ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Tolkar kvitto...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3 h-3" />
                      <span>{editingItem.receipt_path ? "Byt kvitto" : "Fota kvitto"}</span>
                    </>
                  )}
                </button>
              </div>

              {editingItem.receiptUrl && (
                <div className="flex items-center space-x-2 text-xs text-indigo-900 bg-white/80 p-2.5 rounded-xl border border-indigo-100 justify-between">
                  <div className="flex items-center space-x-2 truncate">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="truncate font-medium">Kvitto sparat i valvet</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewingReceiptUrl(editingItem.receiptUrl || null)}
                    className="text-indigo-600 font-bold underline text-xs flex-shrink-0 hover:text-indigo-800"
                  >
                    Visa kvitto
                  </button>
                </div>
              )}

              {/* Formulärfält för kvitto/garanti */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Inköpt datum</label>
                  <input
                    type="date"
                    value={editingItem.purchase_date || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, purchase_date: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Inköpsbutik</label>
                  <input
                    type="text"
                    placeholder="t.ex. Elgiganten"
                    value={editingItem.purchase_store || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, purchase_store: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-xl bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Faktiskt köppris (SEK)</label>
                  <input
                    type="number"
                    placeholder="Enligt kvitto"
                    value={editingItem.purchase_price_sek || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, purchase_price_sek: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-xl bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Garanti / Reklamation</label>
                  <select
                    value={editingItem.warranty_months || 36}
                    onChange={(e) => setEditingItem({ ...editingItem, warranty_months: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-xl bg-white"
                  >
                    <option value={12}>1 år (12 mån)</option>
                    <option value={24}>2 år (24 mån)</option>
                    <option value={36}>3 år (Konsumentköplagen)</option>
                    <option value={60}>5 år (Förlängd)</option>
                    <option value={120}>10 år (Trygghet)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 pt-0.5">
                <CalendarCheck className="w-3.5 h-3.5 text-indigo-500" />
                <span>Konsumentköplagen ger dig alltid 3 års lagstadgad reklamationsrätt i Sverige.</span>
              </div>
            </div>

            <form onSubmit={handleSaveItemUpdates} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Benämning</label>
                <input
                  type="text"
                  required
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Rum / Placering</label>
                <select
                  value={editingItem.room || "Vardagsrum"}
                  onChange={(e) => setEditingItem({ ...editingItem, room: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {allAvailableRooms.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Märke</label>
                  <input
                    type="text"
                    value={editingItem.brand || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, brand: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Modell</label>
                  <input
                    type="text"
                    value={editingItem.model || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, model: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Nypris (SEK)</label>
                  <input
                    type="number"
                    value={editingItem.estimated_replacement_cost_sek}
                    onChange={(e) => setEditingItem({ ...editingItem, estimated_replacement_cost_sek: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Begagnatvärde (SEK)</label>
                  <input
                    type="number"
                    value={editingItem.market_value_sek}
                    onChange={(e) => setEditingItem({ ...editingItem, market_value_sek: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-emerald-800"
                  />
                </div>
              </div>

              <div className="bg-indigo-50/60 p-3 rounded-2xl border border-indigo-100 space-y-2">
                <div className="flex items-start space-x-1.5 text-indigo-900 text-[11px]">
                  <Info className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <span><strong>AI-tips typskylt:</strong> {editingItem.serial_number_hint || "Titta på baksidan eller luckans insida."}</span>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Faktiskt serienummer / PNC</label>
                  <input
                    type="text"
                    placeholder="t.ex. 916 098 765"
                    value={editingItem.serial_number || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, serial_number: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Egna anteckningar</label>
                <textarea
                  rows={2}
                  placeholder="t.ex. Tillbehör, garantianteckningar etc."
                  value={editingItem.notes || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm shadow-md transition flex items-center justify-center space-x-2"
                >
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Spara ändringar</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-semibold text-sm transition"
                >
                  Avbryt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SÄLJANNONS-MODAL (Blocket & Tradera) */}
      {listingModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 w-full max-w-md shadow-2xl border border-slate-100 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
                <ShoppingBag className="w-4 h-4 text-indigo-600" />
                <span>AI-genererad Säljannons</span>
              </h3>
              <button
                onClick={() => setListingModalItem(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isGeneratingListing && (
              <div className="py-12 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
                <p className="text-xs text-slate-500 font-medium">
                  Gemini formulerar en säljande annons anpassad för Blocket & Tradera...
                </p>
              </div>
            )}

            {!isGeneratingListing && listingData && (
              <div className="space-y-4">
                {/* Flikar: Blocket vs Tradera */}
                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setActiveListingTab("blocket")}
                    className={`flex-1 py-1.5 rounded-lg transition ${
                      activeListingTab === "blocket" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    Blocket / Marketplace
                  </button>
                  <button
                    onClick={() => setActiveListingTab("tradera")}
                    className={`flex-1 py-1.5 rounded-lg transition ${
                      activeListingTab === "tradera" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    Tradera (Auktion)
                  </button>
                </div>

                {activeListingTab === "blocket" ? (
                  <div className="space-y-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Föreslaget pris</span>
                        <span>Fast pris</span>
                      </div>
                      <div className="text-2xl font-extrabold text-slate-900">
                        {Number(listingData.suggested_price_sek).toLocaleString("sv-SE")} kr
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="font-semibold text-slate-600">Rubrik:</label>
                        <button
                          onClick={() => copyToClipboard(listingData.blocket_title, "rubrik")}
                          className="text-[11px] text-indigo-600 font-bold hover:underline flex items-center space-x-1"
                        >
                          {copiedText === "rubrik" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedText === "rubrik" ? "Kopierad!" : "Kopiera rubrik"}</span>
                        </button>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 font-medium">
                        {listingData.blocket_title}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="font-semibold text-slate-600">Annonstext:</label>
                        <button
                          onClick={() => copyToClipboard(listingData.blocket_body, "text")}
                          className="text-[11px] text-indigo-600 font-bold hover:underline flex items-center space-x-1"
                        >
                          {copiedText === "text" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedText === "text" ? "Kopierad!" : "Kopiera text"}</span>
                        </button>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 whitespace-pre-line leading-relaxed max-h-60 overflow-y-auto font-sans">
                        {listingData.blocket_body}
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        copyToClipboard(
                          `${listingData.blocket_title}\n\nPris: ${listingData.suggested_price_sek} kr\n\n${listingData.blocket_body}`,
                          "allt"
                        )
                      }
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow transition flex items-center justify-center space-x-2"
                    >
                      {copiedText === "allt" ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-300" />
                          <span>Kopierat till urklipp!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Kopiera hela annonsen</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Föreslaget startbud</span>
                        <span>Tradera Auktion</span>
                      </div>
                      <div className="text-2xl font-extrabold text-slate-900">
                        {Number(listingData.tradera_start_bid_sek).toLocaleString("sv-SE")} kr
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="font-semibold text-slate-600">Auktionsrubrik:</label>
                        <button
                          onClick={() => copyToClipboard(listingData.tradera_title, "tradera_rubrik")}
                          className="text-[11px] text-indigo-600 font-bold hover:underline flex items-center space-x-1"
                        >
                          {copiedText === "tradera_rubrik" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedText === "tradera_rubrik" ? "Kopierad!" : "Kopiera"}</span>
                        </button>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 font-medium">
                        {listingData.tradera_title}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="font-semibold text-slate-600">Beskrivning:</label>
                        <button
                          onClick={() => copyToClipboard(listingData.tradera_body, "tradera_text")}
                          className="text-[11px] text-indigo-600 font-bold hover:underline flex items-center space-x-1"
                        >
                          {copiedText === "tradera_text" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedText === "tradera_text" ? "Kopierad!" : "Kopiera"}</span>
                        </button>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 whitespace-pre-line leading-relaxed max-h-60 overflow-y-auto font-sans">
                        {listingData.tradera_body}
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        copyToClipboard(
                          `${listingData.tradera_title}\n\nUtropspris: ${listingData.tradera_start_bid_sek} kr\n\n${listingData.tradera_body}`,
                          "tradera_allt"
                        )
                      }
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow transition flex items-center justify-center space-x-2"
                    >
                      {copiedText === "tradera_allt" ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-300" />
                          <span>Kopierat till urklipp!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Kopiera Tradera-auktionen</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* KVITTO LIGHTBOX (Inbyggd helskärmsvisare) */}
      {viewingReceiptUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in"
          onClick={() => setViewingReceiptUrl(null)}
        >
          <div
            className="relative max-w-md w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl p-2 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex justify-between items-center px-3 py-2 text-white text-xs">
              <span className="font-bold flex items-center space-x-1.5">
                <Receipt className="w-4 h-4 text-indigo-400" />
                <span>Originalkvitto</span>
              </span>
              <button
                onClick={() => setViewingReceiptUrl(null)}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="w-full max-h-[75vh] overflow-auto rounded-2xl bg-white flex items-center justify-center p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewingReceiptUrl}
                alt="Kvitto"
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* BOSTADS-MODAL */}
      {showPropertyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-1.5">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>{isEditingProperty ? "Redigera bostad" : "Mina Bostäder & Tillgångar"}</span>
              </h3>
              <button
                onClick={() => {
                  setShowPropertyModal(false);
                  setIsEditingProperty(false);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!isEditingProperty ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  {properties.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedProperty(p);
                        if (sessionUser) {
                          fetchVaultStats(sessionUser.id, p.id);
                          fetchVaultItems(sessionUser.id, p.id);
                        }
                        setShowPropertyModal(false);
                      }}
                      className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                        selectedProperty?.id === p.id 
                          ? "bg-indigo-50/70 border-indigo-300" 
                          : "bg-slate-50 border-slate-200/80 hover:bg-slate-100"
                      }`}
                    >
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{p.name}</h4>
                        <p className="text-[10px] text-slate-500">{p.property_type} • {p.insurance_company || "Försäkringsbolag"}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPropertyFormData(p);
                          setIsEditingProperty(true);
                        }}
                        className="text-[11px] text-indigo-600 font-semibold px-2 py-1 rounded hover:bg-indigo-100"
                      >
                        Inställningar
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setPropertyFormData({
                      name: "Fritidshuset",
                      property_type: "Fritidshus",
                      insurance_company: "Länsförsäkringar",
                      coverage_limit_sek: 500000,
                      deductible_sek: 1500,
                      has_brf_supplement: false,
                    });
                    setIsEditingProperty(true);
                  }}
                  className="w-full py-2.5 border border-dashed border-indigo-300 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-50 transition"
                >
                  + Lägg till ny bostad / förråd
                </button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!sessionUser) return;
                  setIsSavingProperty(true);
                  try {
                    if (propertyFormData.id) {
                      const { error } = await supabase
                        .from("properties")
                        .update({
                          name: propertyFormData.name,
                          property_type: propertyFormData.property_type,
                          insurance_company: propertyFormData.insurance_company,
                          coverage_limit_sek: Number(propertyFormData.coverage_limit_sek),
                          deductible_sek: Number(propertyFormData.deductible_sek),
                          address: propertyFormData.address || "",
                          has_brf_supplement: Boolean(propertyFormData.has_brf_supplement),
                        })
                        .eq("id", propertyFormData.id);
                      if (error) throw error;
                    } else {
                      const { error } = await supabase.from("properties").insert({
                        user_id: sessionUser.id,
                        name: propertyFormData.name || "Ny bostad",
                        property_type: propertyFormData.property_type || "Bostadsrätt",
                        insurance_company: propertyFormData.insurance_company || "Länsförsäkringar",
                        coverage_limit_sek: Number(propertyFormData.coverage_limit_sek) || 1000000,
                        deductible_sek: Number(propertyFormData.deductible_sek) || 1500,
                        address: propertyFormData.address || "",
                        has_brf_supplement: Boolean(propertyFormData.has_brf_supplement),
                      });
                      if (error) throw error;
                    }
                    await fetchProperties(sessionUser.id);
                    setIsEditingProperty(false);
                    setShowPropertyModal(false);
                  } catch (err: any) {
                    alert(`Kunde inte spara bostad: ${err.message}`);
                  } finally {
                    setIsSavingProperty(false);
                  }
                }}
                className="space-y-2.5 text-xs"
              >
                <div>
                  <label className="font-semibold text-slate-600 block mb-0.5">Bostadens namn</label>
                  <input
                    type="text"
                    required
                    value={propertyFormData.name || ""}
                    onChange={(e) => setPropertyFormData({ ...propertyFormData, name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-600 block mb-0.5">Boendeform</label>
                    <select
                      value={propertyFormData.property_type || "Bostadsrätt"}
                      onChange={(e) => setPropertyFormData({ ...propertyFormData, property_type: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-xl bg-white"
                    >
                      <option value="Bostadsrätt">Bostadsrätt</option>
                      <option value="Villa / Småhus">Villa / Småhus</option>
                      <option value="Hyresrätt">Hyresrätt</option>
                      <option value="Fritidshus">Fritidshus</option>
                      <option value="Externt förråd">Externt förråd</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-0.5">Försäkringsbolag</label>
                    <input
                      type="text"
                      placeholder="t.ex. If, Folksam"
                      value={propertyFormData.insurance_company || ""}
                      onChange={(e) => setPropertyFormData({ ...propertyFormData, insurance_company: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-600 block mb-0.5">Lösörestak (SEK)</label>
                    <input
                      type="number"
                      value={propertyFormData.coverage_limit_sek || 1000000}
                      onChange={(e) => setPropertyFormData({ ...propertyFormData, coverage_limit_sek: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-0.5">Självrisk (SEK)</label>
                    <input
                      type="number"
                      value={propertyFormData.deductible_sek || 1500}
                      onChange={(e) => setPropertyFormData({ ...propertyFormData, deductible_sek: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                {propertyFormData.property_type === "Bostadsrätt" && (
                  <label className="flex items-center space-x-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={propertyFormData.has_brf_supplement || false}
                      onChange={(e) => setPropertyFormData({ ...propertyFormData, has_brf_supplement: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-[11px] text-slate-700 font-medium">Bostadsrättstillägg är tecknat</span>
                  </label>
                )}

                <div className="pt-2 flex space-x-2">
                  <button
                    type="submit"
                    disabled={isSavingProperty}
                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow hover:bg-indigo-700"
                  >
                    {isSavingProperty ? "Sparar..." : "Spara bostad"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingProperty(false)}
                    className="px-3 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-semibold text-xs"
                  >
                    Tillbaka
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* AUTH MODAL */}
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