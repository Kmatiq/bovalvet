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
  LogOut, 
  Trash2, 
  Tag, 
  X, 
  Edit3, 
  FileDown, 
  Building2, 
  ChevronDown, 
  AlertTriangle, 
  Receipt, 
  CalendarCheck,
  Info,
  ShoppingBag, 
  Copy, 
  Check, 
  ShieldAlert, 
  Flame, 
  Droplets, 
  Zap, 
  CheckSquare, 
  Square,
  Image as ImageIcon,
  PenTool,
  Phone,
  ExternalLink,
  ChevronRight,
  Plus,
  Home as HomeIcon,
  LayoutGrid,
  MoreHorizontal
} from "lucide-react";
import { sanitizeAndCompressImage } from "@/lib/sanitizeImage";
import { supabase } from "@/lib/supabaseClient";
import { generateVaultPdf, generateIncidentPdf } from "@/lib/generatePdfReport";

const STANDARD_ROOMS: Record<string, string> = {
  "Vardagsrum": "🛋️",
  "Kök": "🍳",
  "Badrum": "🛁",
  "Tvättstuga": "🧺",
  "Sovrum": "🛏️",
  "Hall": "🚪",
  "Förråd": "📦",
};

const INSURANCE_HELP = [
  { name: "Länsförsäkringar", phone: "0771-666 115", web: "https://www.lansforsakringar.se/skada/" },
  { name: "Folksam", phone: "0771-950 950", web: "https://www.folksam.se/anmal-skada" },
  { name: "If Skadeförsäkring", phone: "0771-655 655", web: "https://www.if.se/anmal-skada" },
  { name: "Trygg-Hansa", phone: "0771-111 500", web: "https://www.trygghansa.se/anmal-skada" },
  { name: "Hedvig", phone: "010-45 99 200", web: "https://www.hedvig.com/se/skada" },
];

const INCIDENT_TYPES = [
  { label: "Vattenskada / Läckage", icon: Droplets },
  { label: "Inbrott / Stöld", icon: ShieldAlert },
  { label: "Brand / Rökutveckling", icon: Flame },
  { label: "Åska / Elöverslag", icon: Zap },
  { label: "Allrisk / Drulle", icon: AlertTriangle },
];

interface Property {
  id: string;
  name: string;
  property_type: string;
  address?: string;
  living_area_sqm?: number;
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
  image_paths?: string[];
  imageUrls?: string[];
  receipt_path?: string;
  receiptUrl?: string;
  purchase_date?: string;
  purchase_store?: string;
  purchase_price_sek?: number;
  warranty_months?: number;
  created_at: string;
}

function formatItemsCount(count: number) {
  if (count === 1) return "1 sak";
  return `${count} saker`;
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
      badgeClass: "bg-[var(--color-expired-bg)] text-[var(--color-expired-text)]",
    };
  }

  if (diffMonths <= 2) {
    return {
      status: "expiring_soon",
      label: `Löper ut om ${diffDays} dagar!`,
      expiryDate: expiryDate.toLocaleDateString("sv-SE"),
      badgeClass: "bg-[var(--color-warn-bg)] text-[var(--color-warn-text)] border border-[var(--color-border)]",
    };
  }

  return {
    status: "active",
    label: `Aktiv garanti (${diffMonths} mån kvar)`,
    expiryDate: expiryDate.toLocaleDateString("sv-SE"),
    badgeClass: "bg-[var(--color-success-bg)] text-[var(--color-success-text)]",
  };
}

export default function HomePage() {
  const [currentNav, setCurrentNav] = useState<"home" | "rooms" | "insurance" | "more">("home");
  const [sessionUser, setSessionUser] = useState<any>(null);

  // Bostäder
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [isEditingProperty, setIsEditingProperty] = useState(false);
  const [propertyFormData, setPropertyFormData] = useState<Partial<Property>>({});
  const [isSavingProperty, setIsSavingProperty] = useState(false);

  // Rumsläge
  const [activeRoom, setActiveRoom] = useState<string>("Vardagsrum");
  const [showRoomPickerScreen, setShowRoomPickerScreen] = useState(false);

  // Bild & Analys
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64ForSave, setBase64ForSave] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<ItemAnalysisResult | null>(null);

  // Valvstatus
  const [totalValuationSek, setTotalValuationSek] = useState<number>(0);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>("Alla");

  // Detaljvy
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingItemPhoto, setIsUploadingItemPhoto] = useState(false);
  const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState(false);
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);

  // Raderingsbekräftelse
  const [itemToDelete, setItemToDelete] = useState<VaultItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sheets
  const [showAddActionSheet, setShowAddActionSheet] = useState(false);
  const [showEditPhotoOptions, setShowEditPhotoOptions] = useState(false);

  // Manuell registrering
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualFormData, setManualFormData] = useState<Partial<VaultItem>>({
    room: "Vardagsrum",
    category: "Övrigt hem & inredning",
    condition: "Mycket gott",
  });
  const [manualPhotoFile, setManualPhotoFile] = useState<File | null>(null);
  const [manualPhotoPreview, setManualPhotoPreview] = useState<string | null>(null);
  const [isSavingManual, setIsSavingManual] = useState(false);

  // Blocket/Tradera
  const [listingModalItem, setListingModalItem] = useState<VaultItem | null>(null);
  const [listingData, setListingData] = useState<any>(null);
  const [isGeneratingListing, setIsGeneratingListing] = useState(false);
  const [activeListingTab, setActiveListingTab] = useState<"blocket" | "tradera">("blocket");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Incident Modal
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentType, setIncidentType] = useState("Vattenskada / Läckage");
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split("T")[0]);
  const [policeReportNumber, setPoliceReportNumber] = useState("");
  const [incidentDescription, setIncidentDescription] = useState("");
  const [selectedIncidentItemIds, setSelectedIncidentItemIds] = useState<string[]>([]);

  // Auth Modal
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authIsSignUp, setAuthIsSignUp] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Input refs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const manualPhotoInputRef = useRef<HTMLInputElement>(null);
  const editItemCameraInputRef = useRef<HTMLInputElement>(null);
  const editItemGalleryInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user || null;
      setSessionUser(user);
      if (user) fetchProperties(user.id);
    };
    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      setSessionUser(user);
      if (user) {
        fetchProperties(user.id);
      } else {
        setTotalValuationSek(0);
        setVaultItems([]);
        setProperties([]);
        setSelectedProperty(null);
        setCurrentNav("home");
      }
    });

    return () => authListener.subscription.unsubscribe();
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
            living_area_sqm: 75,
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
      if (propertyId) query = query.eq("property_id", propertyId);
      const { data, error } = await query;

      if (!error && data) {
        const total = data.reduce((sum, item) => sum + (Number(item.estimated_replacement_cost_sek) || 0), 0);
        setTotalValuationSek(total);
      }
    } catch (e) {
      console.error("Kunde inte hämta statistik:", e);
    }
  };

  const fetchVaultItems = async (userId: string, propertyId?: string) => {
    try {
      let query = supabase.from("items").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (propertyId) query = query.eq("property_id", propertyId);

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        const itemsWithSignedUrls: VaultItem[] = await Promise.all(
          data.map(async (item) => {
            let rawPaths: string[] = [];
            if (Array.isArray(item.image_paths) && item.image_paths.length > 0) {
              rawPaths = item.image_paths;
            } else if (item.image_path || item.photo_path) {
              rawPaths = [item.image_path || item.photo_path];
            }

            const signedUrls: string[] = [];
            for (const path of rawPaths) {
              if (path) {
                const { data: urlData } = await supabase.storage.from("item-photos").createSignedUrl(path, 3600);
                if (urlData?.signedUrl) signedUrls.push(urlData.signedUrl);
              }
            }

            let receiptSigned = "";
            if (item.receipt_path) {
              const { data: rUrlData } = await supabase.storage.from("item-photos").createSignedUrl(item.receipt_path, 3600);
              receiptSigned = rUrlData?.signedUrl || "";
            }

            return { 
              ...item, 
              image_paths: rawPaths,
              imageUrls: signedUrls,
              imageUrl: signedUrls[0] || "",
              receiptUrl: receiptSigned 
            };
          })
        );
        setVaultItems(itemsWithSignedUrls);
      }
    } catch (err: any) {
      console.error("Kunde inte hämta valv:", err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);

    try {
      await supabase.from("items").delete().eq("id", itemToDelete.id);
      
      const pathsToDelete = itemToDelete.image_paths && itemToDelete.image_paths.length > 0 
        ? itemToDelete.image_paths 
        : [itemToDelete.image_path || itemToDelete.photo_path].filter(Boolean);

      if (pathsToDelete.length > 0) {
        await supabase.storage.from("item-photos").remove(pathsToDelete as string[]);
      }
      if (itemToDelete.receipt_path) {
        await supabase.storage.from("item-photos").remove([itemToDelete.receipt_path]);
      }

      setVaultItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));
      if (editingItem?.id === itemToDelete.id) setEditingItem(null);
      if (sessionUser) fetchVaultStats(sessionUser.id, selectedProperty?.id);
      
      setItemToDelete(null);
      showToast("Prylen är borttagen");
    } catch (err: any) {
      alert(`Kunde inte radera: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUploadAdditionalPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingItem || !sessionUser) return;

    const currentPaths = editingItem.image_paths || [];
    if (currentPaths.length >= 3) {
      alert("Föremålet har redan max 3 bilder.");
      return;
    }

    setIsUploadingItemPhoto(true);
    setShowEditPhotoOptions(false);

    try {
      const processed = await sanitizeAndCompressImage(file);
      const byteCharacters = atob(processed.base64ForGemini);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/jpeg" });
      const newFileName = `${sessionUser.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

      const { error: upErr } = await supabase.storage
        .from("item-photos")
        .upload(newFileName, blob, { contentType: "image/jpeg", upsert: true });

      if (upErr) throw upErr;

      const updatedPaths = [...currentPaths, newFileName];
      const updatedUrls = [...(editingItem.imageUrls || []), processed.previewUrl];

      await supabase
        .from("items")
        .update({
          image_paths: updatedPaths,
          image_path: updatedPaths[0],
          photo_path: updatedPaths[0],
        })
        .eq("id", editingItem.id);

      const updatedItem: VaultItem = {
        ...editingItem,
        image_paths: updatedPaths,
        imageUrls: updatedUrls,
        imageUrl: updatedUrls[0],
        image_path: updatedPaths[0],
      };

      setEditingItem(updatedItem);
      setVaultItems((prev) => prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
      setActiveImageIndex(updatedUrls.length - 1);
      showToast("Bilden har lagts till ✓");
    } catch (err: any) {
      alert(`Kunde inte ladda upp bild: ${err.message}`);
    } finally {
      setIsUploadingItemPhoto(false);
      if (editItemCameraInputRef.current) editItemCameraInputRef.current.value = "";
      if (editItemGalleryInputRef.current) editItemGalleryInputRef.current.value = "";
    }
  };

  const handleRemoveSpecificPhoto = async (indexToRemove: number) => {
    if (!editingItem) return;

    const pathToRemove = editingItem.image_paths?.[indexToRemove];
    const newPaths = (editingItem.image_paths || []).filter((_, idx) => idx !== indexToRemove);
    const newUrls = (editingItem.imageUrls || []).filter((_, idx) => idx !== indexToRemove);

    try {
      if (pathToRemove) {
        await supabase.storage.from("item-photos").remove([pathToRemove]);
      }

      await supabase
        .from("items")
        .update({
          image_paths: newPaths,
          image_path: newPaths[0] || null,
          photo_path: newPaths[0] || null,
        })
        .eq("id", editingItem.id);

      const updatedItem: VaultItem = {
        ...editingItem,
        image_paths: newPaths,
        imageUrls: newUrls,
        imageUrl: newUrls[0] || "",
        image_path: newPaths[0] || "",
      };

      setEditingItem(updatedItem);
      setVaultItems((prev) => prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
      setActiveImageIndex(0);
      showToast("Bilden har raderats");
    } catch (err: any) {
      alert(`Kunde inte ta bort bild: ${err.message}`);
    }
  };

  const handleSaveItemUpdates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !sessionUser) return;

    setIsUpdating(true);
    try {
      await supabase
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
          image_paths: editingItem.image_paths || [],
          image_path: editingItem.image_paths?.[0] || null,
          photo_path: editingItem.image_paths?.[0] || null,
        })
        .eq("id", editingItem.id);

      setVaultItems((prev) => prev.map((i) => (i.id === editingItem.id ? { ...editingItem } : i)));
      await fetchVaultStats(sessionUser.id, selectedProperty?.id);
      setEditingItem(null);
      showToast("Ändringarna sparades ✓");
    } catch (err: any) {
      alert(`Kunde inte uppdatera: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingItem || !sessionUser) return;

    setIsAnalyzingReceipt(true);
    try {
      const processed = await sanitizeAndCompressImage(file);
      const byteCharacters = atob(processed.base64ForGemini);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/jpeg" });
      const receiptFileName = `${sessionUser.id}/receipt-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

      await supabase.storage.from("item-photos").upload(receiptFileName, blob, { contentType: "image/jpeg", upsert: true });

      const res = await fetch("/api/analyze-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Image: processed.base64ForGemini, mimeType: processed.mimeType }),
      });

      const response = await res.json();
      if (response.success && response.data) {
        const rData = response.data;
        setEditingItem((prev) =>
          prev ? {
            ...prev,
            receipt_path: receiptFileName,
            receiptUrl: processed.previewUrl,
            purchase_date: rData.purchase_date || prev.purchase_date,
            purchase_store: rData.store || prev.purchase_store,
            purchase_price_sek: rData.total_amount_sek || prev.purchase_price_sek,
            warranty_months: rData.suggested_warranty_months || 36,
          } : null
        );
        showToast("Kvittot är tolkat och sparat ✓");
      }
    } catch (err: any) {
      alert(`Kunde inte tolka kvitto: ${err.message}`);
    } finally {
      setIsAnalyzingReceipt(false);
      if (receiptInputRef.current) receiptInputRef.current.value = "";
    }
  };

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
      if (response.success && response.data) setListingData(response.data);
    } catch (err: any) {
      alert(`Fel: ${err.message}`);
    } finally {
      setIsGeneratingListing(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowAddActionSheet(false);
    setShowRoomPickerScreen(false);
    setResult(null);
    setIsAnalyzing(true);

    try {
      const processed = await sanitizeAndCompressImage(file);
      setPreviewUrl(processed.previewUrl);
      setBase64ForSave(processed.base64ForGemini);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Image: processed.base64ForGemini, mimeType: processed.mimeType }),
      });

      const response = await res.json();
      if (response.success && response.data) {
        setResult(response.data);
      } else {
        alert(response.error || "Kunde inte tolka föremålet.");
      }
    } catch (err: unknown) {
      alert(`Nätverksfel: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executeSaveAiItem = async (userId: string) => {
    if (!result || !base64ForSave) return;
    setIsSaving(true);

    try {
      const byteCharacters = atob(base64ForSave);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/jpeg" });
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

      await supabase.storage.from("item-photos").upload(fileName, blob, { contentType: "image/jpeg", upsert: true });

      await supabase.from("items").insert({
        user_id: userId,
        property_id: selectedProperty?.id || null,
        title: result.title,
        category: result.category,
        room: activeRoom,
        brand: result.brand,
        model: result.model,
        estimated_replacement_cost_sek: result.estimated_replacement_cost_sek,
        market_value_sek: result.market_value_sek,
        condition: result.condition,
        serial_number_hint: result.serial_number_hint,
        image_path: fileName,
        photo_path: fileName,
        image_paths: [fileName],
      });

      await fetchVaultStats(userId, selectedProperty?.id);
      await fetchVaultItems(userId, selectedProperty?.id);
      
      setResult(null);
      setPreviewUrl(null);
      setBase64ForSave(null);
      
      setShowRoomPickerScreen(true);
      showToast(`Sparad i ${activeRoom} ✓ Fota fler eller tryck Klar`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveManualItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionUser) {
      setShowAuthModal(true);
      return;
    }
    if (!manualFormData.title) return;

    setIsSavingManual(true);
    try {
      let uploadedFileName = null;
      if (manualPhotoFile) {
        const processed = await sanitizeAndCompressImage(manualPhotoFile);
        const byteCharacters = atob(processed.base64ForGemini);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "image/jpeg" });
        uploadedFileName = `${sessionUser.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

        await supabase.storage.from("item-photos").upload(uploadedFileName, blob, { contentType: "image/jpeg", upsert: true });
      }

      const repCost = Number(manualFormData.estimated_replacement_cost_sek) || 0;
      const mktVal = Number(manualFormData.market_value_sek) || Math.round(repCost * 0.5);

      await supabase.from("items").insert({
        user_id: sessionUser.id,
        property_id: selectedProperty?.id || null,
        title: manualFormData.title,
        category: manualFormData.category || "Övrigt hem & inredning",
        room: manualFormData.room || activeRoom,
        brand: manualFormData.brand || "",
        model: manualFormData.model || "",
        estimated_replacement_cost_sek: repCost,
        market_value_sek: mktVal,
        condition: manualFormData.condition || "Mycket gott",
        serial_number: manualFormData.serial_number || "",
        notes: manualFormData.notes || "",
        image_path: uploadedFileName,
        photo_path: uploadedFileName,
        image_paths: uploadedFileName ? [uploadedFileName] : [],
      });

      await fetchVaultStats(sessionUser.id, selectedProperty?.id);
      await fetchVaultItems(sessionUser.id, selectedProperty?.id);
      
      setShowManualModal(false);
      setManualFormData({ room: activeRoom, category: "Övrigt hem & inredning", condition: "Mycket gott" });
      setManualPhotoFile(null);
      setManualPhotoPreview(null);
      showToast(`"${manualFormData.title}" sparades ✓`);
    } catch (err: any) {
      alert(`Kunde inte spara: ${err.message}`);
    } finally {
      setIsSavingManual(false);
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
          if (signInError) throw new Error(signUpError?.message || signInError.message);
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
        if (result) executeSaveAiItem(activeUser.id);
      }
    } catch (err: any) {
      setAuthError(err.message || "Kunde inte logga in.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSessionUser(null);
    setCurrentNav("home");
    showToast("Du har loggat ut");
  };

  const roomKeys = Object.keys(STANDARD_ROOMS);
  const startedRoomCount = roomKeys.filter((r) => vaultItems.some((i) => i.room === r)).length;
  const firstEmptyRoom = roomKeys.find((r) => !vaultItems.some((i) => i.room === r));

  const filteredItemsByRoom = vaultItems.filter((i) => {
    if (selectedRoomFilter === "Alla") return true;
    return (i.room || "Ospecificerat") === selectedRoomFilter;
  });

  const openIncidentModal = () => {
    setSelectedIncidentItemIds([]);
    setShowIncidentModal(true);
  };

  const toggleIncidentItem = (id: string) => {
    setSelectedIncidentItemIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleRoomItemsForIncident = (roomName: string) => {
    const roomItemIds = vaultItems.filter((i) => (i.room || "Ospecificerat") === roomName).map((i) => i.id);
    const allSelected = roomItemIds.length > 0 && roomItemIds.every((id) => selectedIncidentItemIds.includes(id));
    if (allSelected) setSelectedIncidentItemIds((prev) => prev.filter((id) => !roomItemIds.includes(id)));
    else setSelectedIncidentItemIds((prev) => Array.from(new Set([...prev, ...roomItemIds])));
  };

  const selectedIncidentItems = vaultItems.filter((i) => selectedIncidentItemIds.includes(i.id));
  const incidentTotalCost = selectedIncidentItems.reduce((sum, i) => sum + (Number(i.estimated_replacement_cost_sek) || 0), 0);

  const handleGenerateIncidentReport = () => {
    if (!selectedProperty || selectedIncidentItems.length === 0) {
      alert("Välj minst ett drabbat föremål.");
      return;
    }
    generateIncidentPdf({
      incidentType,
      incidentDate,
      policeReportNumber: policeReportNumber.trim() || undefined,
      description: incidentDescription.trim() || undefined,
      property: selectedProperty,
      userEmail: sessionUser?.email || "Användare",
      items: selectedIncidentItems,
    });
    setShowIncidentModal(false);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex justify-center selection:bg-[var(--color-primary-soft)] selection:text-[var(--color-primary)]">
      <div className="w-full max-w-[480px] min-h-screen flex flex-col relative pb-32">

        {/* TOPPBAR (64 px) */}
        {!showRoomPickerScreen && !isAnalyzing && !result && !editingItem && (
          <header className="h-16 px-5 flex items-center justify-between z-20">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)] text-[var(--color-onp,#fff)] flex items-center justify-center font-extrabold text-base shadow-xs">
                PK
              </div>
              <button
                onClick={() => {
                  setPropertyFormData(selectedProperty || {});
                  setShowPropertyModal(true);
                }}
                className="min-h-[44px] flex items-center gap-1.5 text-[15px] font-bold text-[var(--color-text)] hover:opacity-80 transition"
              >
                <span>{selectedProperty?.name || "Hemma"} · {selectedProperty?.living_area_sqm || 75} m²</span>
                <ChevronDown className="w-4 h-4 opacity-60" />
              </button>
            </div>

            <button
              onClick={() => setCurrentNav("more")}
              className="w-11 h-11 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] flex items-center justify-center font-bold text-base border-0"
              aria-label="Profil och inställningar"
            >
              {sessionUser?.email ? sessionUser.email[0].toUpperCase() : "K"}
            </button>
          </header>
        )}

        {/* Dolda fil-inputs */}
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageSelected} className="hidden" />
        <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleImageSelected} className="hidden" />
        <input ref={receiptInputRef} type="file" accept="image/*" onChange={handleReceiptUpload} className="hidden" />
        <input ref={manualPhotoInputRef} type="file" accept="image/*" onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            setManualPhotoFile(f);
            setManualPhotoPreview(URL.createObjectURL(f));
          }
        }} className="hidden" />
        <input ref={editItemCameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleUploadAdditionalPhoto} className="hidden" />
        <input ref={editItemGalleryInputRef} type="file" accept="image/*" onChange={handleUploadAdditionalPhoto} className="hidden" />

        {/* HUVUDINNEHÅLL */}
        <main className="flex-1 px-5 pt-1 space-y-6 overflow-y-auto">

          {/* RUMSLÄGET ("Var är du?") */}
          {showRoomPickerScreen && !isAnalyzing && !result && !editingItem && (
            <div className="space-y-4 animate-in fade-in pt-2">
              <button 
                onClick={() => setShowRoomPickerScreen(false)}
                className="min-h-[44px] flex items-center gap-1 text-[var(--color-primary)] font-bold text-base -ml-2"
              >
                ← Klar
              </button>

              <div>
                <h1 className="text-[24px] font-extrabold text-[var(--color-text)]">Var är du?</h1>
                <p className="text-[14px] text-[var(--color-text-soft)] mt-1">
                  Vi sparar allt du fotar här tills du byter rum.
                </p>
              </div>

              {/* Rums-grid (Stora 64px knappar med emojis) */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                {roomKeys.map((rName) => {
                  const isSelected = activeRoom === rName;
                  return (
                    <button
                      key={rName}
                      type="button"
                      onClick={() => setActiveRoom(rName)}
                      className={`min-h-[64px] rounded-2xl border-2 p-3 text-left flex items-center gap-3 transition font-semibold text-base ${
                        isSelected 
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-text)] shadow-xs" 
                          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
                      }`}
                    >
                      <span className="text-2xl">{STANDARD_ROOMS[rName]}</span>
                      <span>{rName}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-6 space-y-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="min-h-[52px] w-full rounded-2xl bg-[var(--color-primary)] text-white font-bold text-base flex items-center justify-center gap-2 shadow-sm transition active:scale-[.98]"
                >
                  <Camera className="w-5 h-5" />
                  <span>Ta foto i {activeRoom}</span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="min-h-[44px] w-full text-[var(--color-text-soft)] text-sm font-semibold text-center hover:underline"
                >
                  eller välj från mobilens album
                </button>
              </div>
            </div>
          )}

          {/* AI-SKANNING PÅGÅR */}
          {isAnalyzing && (
            <div className="py-20 text-center space-y-4 animate-in fade-in">
              <div className="relative w-48 h-48 mx-auto rounded-3xl overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] shadow-md flex items-center justify-center">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Skannas" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-16 h-16 text-[var(--color-primary)] opacity-40 animate-pulse" />
                )}
                <div className="absolute inset-x-0 h-1 bg-[var(--color-primary)] animate-pulse top-1/2" />
              </div>
              <h2 className="text-xl font-bold text-[var(--color-text)]">Vi tittar på din pryl…</h2>
              <p className="text-[14px] text-[var(--color-text-soft)]">
                Känner igen märke, modell, skick och räknar ut nypris.
              </p>
            </div>
          )}

          {/* AI-RESULTATKORT */}
          {result && !isAnalyzing && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
              <button 
                onClick={() => {
                  setResult(null);
                  setPreviewUrl(null);
                  setBase64ForSave(null);
                }} 
                className="min-h-[44px] flex items-center gap-1 text-[var(--color-primary)] font-bold text-base -ml-2"
              >
                ← Fota om
              </button>

              <div className="relative h-56 rounded-3xl overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
                {previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt={result.title} className="w-full h-full object-cover" />
                )}
                <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-xs border border-stone-200 flex items-center gap-1.5 text-slate-800">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-[14px] font-semibold">{Math.round(result.confidence * 100)} % säker</span>
                </div>
              </div>

              <div>
                <input 
                  type="text" 
                  value={result.title} 
                  onChange={(e) => setResult({ ...result, title: e.target.value })}
                  className="w-full min-h-[52px] px-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] font-bold text-xl text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <p className="text-[14px] text-[var(--color-text-soft)] mt-1.5 font-medium">
                  {result.brand} · {result.model}
                </p>
              </div>

              {/* Värderutor */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[var(--color-surface)] p-3.5 rounded-2xl border border-[var(--color-border)] shadow-card">
                  <span className="text-[14px] text-[var(--color-text-soft)] block font-medium">Nypris idag</span>
                  <span className="text-[22px] font-black text-[var(--color-text)]">
                    {result.estimated_replacement_cost_sek.toLocaleString("sv-SE")} kr
                  </span>
                </div>
                <div className="bg-[var(--color-surface)] p-3.5 rounded-2xl border border-[var(--color-border)] shadow-card">
                  <span className="text-[14px] text-[var(--color-text-soft)] block font-medium">Värde begagnat</span>
                  <span className="text-[22px] font-black text-[var(--color-primary)]">
                    {result.market_value_sek.toLocaleString("sv-SE")} kr
                  </span>
                </div>
              </div>

              {/* Rumsrad */}
              <button
                type="button"
                onClick={() => setShowRoomPickerScreen(true)}
                className="w-full min-h-[56px] px-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between font-semibold text-base text-[var(--color-text)]"
              >
                <span>Placering: <strong>{activeRoom}</strong></span>
                <span className="text-[var(--color-primary)] font-bold">Ändra</span>
              </button>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!sessionUser) setShowAuthModal(true);
                    else executeSaveAiItem(sessionUser.id);
                  }}
                  disabled={isSaving}
                  className="min-h-[56px] w-full rounded-2xl bg-[var(--color-primary)] text-white font-bold text-base flex items-center justify-center gap-2 shadow-sm transition active:scale-[.98]"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Spara i {activeRoom}</span>}
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="min-h-[44px] w-full text-[var(--color-text-soft)] text-sm font-semibold"
                >
                  Fota om
                </button>
              </div>
            </div>
          )}

          {/* FLIK 1: HEM */}
          {!showRoomPickerScreen && !isAnalyzing && !result && !editingItem && currentNav === "home" && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h1 className="text-[24px] font-extrabold text-[var(--color-text)]">Hej!</h1>
                <p className="text-[16px] text-[var(--color-text-soft)] mt-0.5">
                  Du har säkrat {formatItemsCount(vaultItems.length)}[cite: 11]
                </p>
              </div>

              {/* Värdekortet */}
              <div className="bg-gradient-to-br from-[var(--color-primary-soft)] to-[var(--color-surface)] rounded-3xl p-5 border border-[var(--color-border)] shadow-card space-y-3">
                <span className="text-[14px] text-[var(--color-text-soft)] font-semibold block">
                  Värdet på dina saker
                </span>
                <div className="text-[40px] font-black tracking-tight text-[var(--color-text)] leading-none">
                  {totalValuationSek.toLocaleString("sv-SE")} kr
                </div>
                <p className="text-[16px] text-[var(--color-text)] leading-snug">
                  {formatItemsCount(vaultItems.length)} säkrade med foto, kvitto och serienummer
                </p>

                {/* Progress */}
                <div className="pt-2 space-y-1.5">
                  <div className="w-full bg-[var(--color-border)] rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500"
                      style={{ width: `${Math.round((startedRoomCount / 7) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[14px] text-[var(--color-text-soft)] font-medium block">
                    Hemmets inventering: {startedRoomCount} av 7 rum påbörjade
                  </span>
                </div>

                <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-[14px] text-[var(--color-text-soft)]">
                  <span>Försäkring gäller upp till {Number(selectedProperty?.coverage_limit_sek || 1000000).toLocaleString("sv-SE")} kr</span>
                  <button onClick={() => setCurrentNav("insurance")} className="text-[var(--color-primary)] font-bold hover:underline">
                    Se försäkring
                  </button>
                </div>
              </div>

              {/* NÄSTA STEG-KORT */}
              {firstEmptyRoom && (
                <div className="bg-[var(--color-surface)] p-4 rounded-3xl border border-[var(--color-border)] shadow-card flex flex-col gap-3">
                  <b className="text-[16px] text-[var(--color-text)]">
                    {firstEmptyRoom} är tomt. Ta en runda?
                  </b>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveRoom(firstEmptyRoom);
                      setShowRoomPickerScreen(true);
                    }}
                    className="min-h-[52px] w-full rounded-2xl bg-[var(--color-primary)] text-white font-bold text-base flex items-center justify-center gap-2 active:scale-[.98] transition"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Fota i {firstEmptyRoom}</span>
                  </button>
                </div>
              )}

              {/* RUM (Horisontell scroll) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h2 className="text-[20px] font-extrabold text-[var(--color-text)]">Rum</h2>
                  <button onClick={() => setCurrentNav("rooms")} className="text-[var(--color-primary)] font-bold text-base">
                    Visa alla
                  </button>
                </div>

                <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-2 scrollbar-none">
                  {roomKeys
                    .sort((a, b) => {
                      const countA = vaultItems.filter((i) => i.room === a).length;
                      const countB = vaultItems.filter((i) => i.room === b).length;
                      return countB - countA;
                    })
                    .map((rName) => {
                      const count = vaultItems.filter((i) => i.room === rName).length;
                      return (
                        <div
                          key={rName}
                          onClick={() => {
                            setSelectedRoomFilter(rName);
                            setCurrentNav("rooms");
                          }}
                          className="flex-shrink-0 w-[150px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-card text-left cursor-pointer active:scale-[.98] transition"
                        >
                          <div className="h-[76px] bg-[var(--color-primary-soft)] flex items-center justify-center text-3xl">
                            {STANDARD_ROOMS[rName]}
                          </div>
                          <div className="p-3">
                            <b className="text-base text-[var(--color-text)] block truncate">{rName}</b>
                            <span className="text-[14px] text-[var(--color-text-soft)]">{formatItemsCount(count)}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* SENAST TILLAGDA SAKER */}
              <div className="space-y-3">
                <h2 className="text-[20px] font-extrabold text-[var(--color-text)]">Senast tillagt</h2>
                {vaultItems.length === 0 ? (
                  <div className="text-center py-10 bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 space-y-3 shadow-card">
                    <span className="text-4xl">📷</span>
                    <h3 className="font-bold text-lg text-[var(--color-text)]">Börja med en pryl</h3>
                    <p className="text-[14px] text-[var(--color-text-soft)]">
                      Ta ett foto, så fyller vi i märke, modell och värde åt dig.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowRoomPickerScreen(true)}
                      className="min-h-[52px] px-6 rounded-2xl bg-[var(--color-primary)] text-white font-bold text-base inline-flex items-center gap-2"
                    >
                      <Camera className="w-5 h-5" />
                      <span>Fota din första pryl</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {vaultItems.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setEditingItem({ ...item });
                          setActiveImageIndex(0);
                        }}
                        className="bg-[var(--color-surface)] p-3 rounded-2xl border border-[var(--color-border)] shadow-card flex items-center gap-3 cursor-pointer active:scale-[.98] transition"
                      >
                        <div className="w-[72px] h-[72px] rounded-xl bg-[var(--color-primary-soft)] flex-shrink-0 overflow-hidden flex items-center justify-center text-2xl border border-[var(--color-border)]">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <span>{STANDARD_ROOMS[item.room || ""] || "📦"}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[14px] text-[var(--color-text-soft)] block font-medium">{item.room}</span>
                          <b className="text-base text-[var(--color-text)] block truncate">{item.title}</b>
                          <span className="text-base font-extrabold text-[var(--color-text)]">
                            {Number(item.estimated_replacement_cost_sek).toLocaleString("sv-SE")} kr
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-[var(--color-text-soft)] opacity-50 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FLIK 2: RUM */}
          {!showRoomPickerScreen && !isAnalyzing && !result && !editingItem && currentNav === "rooms" && (
            <div className="space-y-4 animate-in fade-in">
              <h1 className="text-[24px] font-extrabold text-[var(--color-text)] pt-1">Dina rum</h1>

              {/* Filterchips */}
              <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedRoomFilter("Alla")}
                  className={`min-h-[44px] px-4 rounded-full font-bold text-base whitespace-nowrap border transition ${
                    selectedRoomFilter === "Alla"
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                      : "bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)]"
                  }`}
                >
                  Alla ({vaultItems.length})
                </button>
                {roomKeys.map((r) => {
                  const count = vaultItems.filter((i) => i.room === r).length;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedRoomFilter(r)}
                      className={`min-h-[44px] px-4 rounded-full font-semibold text-base whitespace-nowrap border transition ${
                        selectedRoomFilter === r
                          ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                          : "bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)]"
                      }`}
                    >
                      {r} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Listan */}
              <div className="space-y-2.5 pt-1">
                {filteredItemsByRoom.length === 0 ? (
                  <div className="text-center py-12 bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 space-y-3">
                    <span className="text-5xl">{STANDARD_ROOMS[selectedRoomFilter] || "📷"}</span>
                    <h2 className="text-xl font-bold text-[var(--color-text)]">Här är det tomt</h2>
                    <p className="text-[14px] text-[var(--color-text-soft)]">
                      Ta ett foto, så fyller vi i märke, modell och värde åt dig.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveRoom(selectedRoomFilter === "Alla" ? "Vardagsrum" : selectedRoomFilter);
                        setShowRoomPickerScreen(true);
                      }}
                      className="min-h-[52px] px-6 rounded-2xl bg-[var(--color-primary)] text-white font-bold text-base"
                    >
                      Fota i {selectedRoomFilter === "Alla" ? "Vardagsrum" : selectedRoomFilter}
                    </button>
                  </div>
                ) : (
                  filteredItemsByRoom.map((item) => {
                    const wStatus = getWarrantyStatus(item.purchase_date, item.warranty_months || 36);

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setEditingItem({ ...item });
                          setActiveImageIndex(0);
                        }}
                        className="bg-[var(--color-surface)] p-3 rounded-2xl border border-[var(--color-border)] shadow-card flex items-center gap-3 cursor-pointer active:scale-[.98] transition"
                      >
                        <div className="w-[72px] h-[72px] rounded-xl bg-[var(--color-primary-soft)] flex-shrink-0 overflow-hidden flex items-center justify-center text-2xl border border-[var(--color-border)]">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <span>{STANDARD_ROOMS[item.room || ""] || "📦"}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[14px] text-[var(--color-text-soft)] block font-medium">{item.room}</span>
                          <b className="text-base text-[var(--color-text)] block truncate">{item.title}</b>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-base font-extrabold text-[var(--color-text)]">
                              {Number(item.estimated_replacement_cost_sek).toLocaleString("sv-SE")} kr
                            </span>
                            {wStatus && (
                              <span className={`text-[12px] font-bold px-2 py-0.5 rounded-md ${wStatus.badgeClass}`}>
                                Garanti ✓
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-[var(--color-text-soft)] opacity-50 flex-shrink-0" />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* FLIK 3: FÖRSÄKRING */}
          {!showRoomPickerScreen && !isAnalyzing && !result && !editingItem && currentNav === "insurance" && (
            <div className="space-y-5 animate-in fade-in">
              <h1 className="text-[24px] font-extrabold text-[var(--color-text)] pt-1">Försäkring</h1>

              <div className="bg-[var(--color-surface)] rounded-3xl p-5 border border-[var(--color-border)] shadow-card space-y-2">
                <span className="text-[14px] text-[var(--color-text-soft)] font-semibold block">Så här står du</span>
                <div className="text-[20px] text-[var(--color-text)]">
                  <strong>{totalValuationSek.toLocaleString("sv-SE")} kr</strong> säkrat av <strong>{Number(selectedProperty?.coverage_limit_sek || 1000000).toLocaleString("sv-SE")} kr</strong>
                </div>
                <p className="text-[14px] text-[var(--color-text-soft)]">
                  Du kan fortsätta lägga till saker när som helst.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={openIncidentModal}
                  className="min-h-[52px] w-full rounded-2xl bg-[var(--color-primary)] text-white font-bold text-base flex items-center justify-center gap-2 shadow-sm"
                >
                  <ShieldAlert className="w-5 h-5" />
                  <span>Något har hänt? Skapa skadeanmälan</span>
                </button>

                <button
                  type="button"
                  onClick={() => generateVaultPdf(vaultItems, sessionUser?.email || "Användare", totalValuationSek)}
                  className="min-h-[52px] w-full rounded-2xl bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] font-bold text-base flex items-center justify-center gap-2 shadow-card"
                >
                  <FileDown className="w-5 h-5" />
                  <span>Ladda ner inventarielista</span>
                </button>
              </div>

              {/* Direktkontakt vid skada */}
              <div className="space-y-3 pt-2">
                <h2 className="text-[20px] font-extrabold text-[var(--color-text)]">Direktkontakt vid skada</h2>
                <div className="space-y-2">
                  {INSURANCE_HELP.map((ins) => (
                    <a
                      key={ins.name}
                      href={`tel:${ins.phone}`}
                      className="min-h-[56px] p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between no-underline text-[var(--color-text)] shadow-2xs"
                    >
                      <div>
                        <b className="text-base block">{ins.name}</b>
                        <span className="text-[14px] text-[var(--color-text-soft)]">{ins.phone}</span>
                      </div>
                      <span className="px-3 py-1.5 rounded-xl bg-[var(--color-success-bg)] text-[var(--color-success-text)] font-bold text-sm flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        <span>Ring</span>
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* FLIK 4: MER */}
          {!showRoomPickerScreen && !isAnalyzing && !result && !editingItem && currentNav === "more" && (
            <div className="space-y-4 animate-in fade-in">
              <h1 className="text-[24px] font-extrabold text-[var(--color-text)] pt-1">Mer</h1>

              <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] overflow-hidden shadow-card">
                <button
                  onClick={() => {
                    setPropertyFormData(selectedProperty || {});
                    setShowPropertyModal(true);
                  }}
                  className="min-h-[56px] w-full px-5 flex items-center justify-between border-b border-[var(--color-border)] text-base font-semibold text-[var(--color-text)] text-left"
                >
                  <span>Mina bostäder ({selectedProperty?.name})</span>
                  <ChevronRight className="w-5 h-5 text-[var(--color-text-soft)]" />
                </button>

                <button
                  onClick={() => showToast("Dina bilder används aldrig för att träna AI. Platsdata tas bort.")}
                  className="min-h-[56px] w-full px-5 flex items-center justify-between border-b border-[var(--color-border)] text-base font-semibold text-[var(--color-text)] text-left"
                >
                  <span>Integritet och AI</span>
                  <ChevronRight className="w-5 h-5 text-[var(--color-text-soft)]" />
                </button>

                <button
                  onClick={() => showToast("Konsumentköplagen ger dig alltid 3 års lagstadgad reklamationsrätt.")}
                  className="min-h-[56px] w-full px-5 flex items-center justify-between border-b border-[var(--color-border)] text-base font-semibold text-[var(--color-text)] text-left"
                >
                  <span>Konsumentköplagen (3 år)</span>
                  <ChevronRight className="w-5 h-5 text-[var(--color-text-soft)]" />
                </button>

                {sessionUser && (
                  <button
                    onClick={handleSignOut}
                    className="min-h-[56px] w-full px-5 flex items-center justify-between text-base font-bold text-rose-600 text-left"
                  >
                    <span>Logga ut ({sessionUser.email})</span>
                    <LogOut className="w-5 h-5" />
                  </button>
                )}
              </div>

              <p className="text-[14px] text-[var(--color-text-soft)] px-2 leading-relaxed">
                Dina bilder används aldrig för att träna AI. Platsdata tas bort på din telefon innan bilden sparas.
              </p>
            </div>
          )}

          {/* DETALJVY MED ALLA ÅTERSTÄLLDA FÄLT OCH FUNKTIONER */}
          {editingItem && (
            <div className="space-y-4 animate-in fade-in pt-1 pb-6">
              <button 
                onClick={() => setEditingItem(null)} 
                className="min-h-[44px] flex items-center gap-1 text-[var(--color-primary)] font-bold text-base -ml-2"
              >
                ← Tillbaka
              </button>

              {/* Bildgalleri (max 3 bilder) */}
              <div className="space-y-2">
                {editingItem.imageUrls && editingItem.imageUrls.length > 0 ? (
                  <div className="relative h-64 rounded-3xl overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={editingItem.imageUrls[activeImageIndex] || editingItem.imageUrls[0]} 
                      alt={editingItem.title} 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                      {activeImageIndex + 1} / {editingItem.imageUrls.length}
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => setShowEditPhotoOptions(true)}
                    className="h-44 rounded-3xl border-2 border-dashed border-[var(--color-border)] flex flex-col items-center justify-center text-[var(--color-text-soft)] cursor-pointer bg-[var(--color-surface)] hover:border-[var(--color-primary)] transition"
                  >
                    <span className="text-4xl">📷</span>
                    <b className="text-base mt-2">+ Lägg till första bilden</b>
                    <span className="text-xs text-[var(--color-text-soft)]">Fota direkt eller välj från album</span>
                  </div>
                )}

                {/* Miniatyrer */}
                <div className="flex items-center gap-2">
                  {(editingItem.imageUrls || []).map((url, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden cursor-pointer border-2 transition ${
                        activeImageIndex === idx ? "border-[var(--color-primary)] shadow-xs" : "border-[var(--color-border)] opacity-70"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Bild ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSpecificPhoto(idx);
                        }}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-black/70 text-white rounded-full hover:bg-rose-600 transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {(editingItem.image_paths?.length || 0) < 3 && (
                    <button
                      type="button"
                      onClick={() => setShowEditPhotoOptions(true)}
                      className="w-16 h-16 rounded-xl border-2 border-dashed border-[var(--color-border)] text-[var(--color-text-soft)] flex flex-col items-center justify-center font-bold text-xs hover:border-[var(--color-primary)] transition"
                    >
                      {isUploadingItemPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>+ Foto</span>}
                    </button>
                  )}
                </div>
              </div>

              {/* KNAPP: SKAPA SÄLJANNONS */}
              <button
                type="button"
                onClick={() => handleOpenListingModal(editingItem)}
                className="min-h-[52px] w-full rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] font-bold text-base flex items-center justify-center gap-2 text-[var(--color-text)] shadow-card active:scale-[.98] transition"
              >
                <ShoppingBag className="w-5 h-5 text-[var(--color-primary)]" />
                <span>Skapa säljannons (Blocket / Tradera)</span>
              </button>

              {/* SEKTION: KVITTO & GARANTIVAKT */}
              <div className="bg-[var(--color-surface)] p-4 rounded-3xl border border-[var(--color-border)] shadow-card space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-base font-bold text-[var(--color-text)]">
                    <Receipt className="w-5 h-5 text-[var(--color-primary)]" />
                    <span>Kvitto & Garantivakt</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => receiptInputRef.current?.click()}
                    disabled={isAnalyzingReceipt}
                    className="min-h-[38px] px-3 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:opacity-90"
                  >
                    {isAnalyzingReceipt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                    <span>{editingItem.receipt_path ? "Byt kvitto" : "Fota kvitto"}</span>
                  </button>
                </div>

                {editingItem.receiptUrl && (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--color-primary-soft)] text-sm">
                    <div className="flex items-center gap-2 truncate">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="font-semibold truncate">Kvitto sparat i valvet</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewingReceiptUrl(editingItem.receiptUrl || null)}
                      className="text-[var(--color-primary)] font-bold underline text-xs flex-shrink-0 ml-2"
                    >
                      Visa kvitto
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[12px] font-semibold text-[var(--color-text-soft)] block mb-1">Inköpsdatum</label>
                    <input
                      type="date"
                      value={editingItem.purchase_date || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, purchase_date: e.target.value })}
                      className="w-full min-h-[44px] px-3 text-sm border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)]"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-[var(--color-text-soft)] block mb-1">Inköpsbutik</label>
                    <input
                      type="text"
                      placeholder="t.ex. Elgiganten"
                      value={editingItem.purchase_store || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, purchase_store: e.target.value })}
                      className="w-full min-h-[44px] px-3 text-sm border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[12px] font-semibold text-[var(--color-text-soft)] block mb-1">Köppris (SEK)</label>
                    <input
                      type="number"
                      placeholder="Enligt kvitto"
                      value={editingItem.purchase_price_sek || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, purchase_price_sek: Number(e.target.value) })}
                      className="w-full min-h-[44px] px-3 text-sm border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] font-bold text-[var(--color-text)]"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-[var(--color-text-soft)] block mb-1">Garanti / Reklamation</label>
                    <select
                      value={editingItem.warranty_months || 36}
                      onChange={(e) => setEditingItem({ ...editingItem, warranty_months: Number(e.target.value) })}
                      className="w-full min-h-[44px] px-2 text-sm border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)]"
                    >
                      <option value={12}>1 år (12 mån)</option>
                      <option value={24}>2 år (24 mån)</option>
                      <option value={36}>3 år (Konsumentköplagen)</option>
                      <option value={60}>5 år (Förlängd)</option>
                      <option value={120}>10 år (Trygghet)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-soft)] pt-1">
                  <CalendarCheck className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0" />
                  <span>Konsumentköplagen ger dig 3 års reklamationsrätt i Sverige.</span>
                </div>
              </div>

              {/* FÖREMÅLSUPPGIFTER FORMULÄR */}
              <form onSubmit={handleSaveItemUpdates} className="space-y-3.5 text-sm">
                <div>
                  <label className="font-semibold text-[var(--color-text-soft)] block mb-1 text-xs">Benämning</label>
                  <input
                    type="text"
                    required
                    value={editingItem.title}
                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                    className="w-full min-h-[50px] px-3.5 text-base border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)] font-semibold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[var(--color-text-soft)] block mb-1 text-xs">Rum</label>
                  <select
                    value={editingItem.room || "Vardagsrum"}
                    onChange={(e) => setEditingItem({ ...editingItem, room: e.target.value })}
                    className="w-full min-h-[50px] px-3 text-base border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)] font-medium"
                  >
                    {roomKeys.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-[var(--color-text-soft)] block mb-1 text-xs">Märke</label>
                    <input
                      type="text"
                      value={editingItem.brand || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, brand: e.target.value })}
                      className="w-full min-h-[46px] px-3 text-sm border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[var(--color-text-soft)] block mb-1 text-xs">Modell</label>
                    <input
                      type="text"
                      value={editingItem.model || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, model: e.target.value })}
                      className="w-full min-h-[46px] px-3 text-sm border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-[var(--color-text-soft)] block mb-1 text-xs">Nypris idag (SEK)</label>
                    <input
                      type="number"
                      value={editingItem.estimated_replacement_cost_sek}
                      onChange={(e) => setEditingItem({ ...editingItem, estimated_replacement_cost_sek: Number(e.target.value) })}
                      className="w-full min-h-[46px] px-3 text-base border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] font-extrabold text-[var(--color-text)]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[var(--color-text-soft)] block mb-1 text-xs">Begagnatvärde (SEK)</label>
                    <input
                      type="number"
                      value={editingItem.market_value_sek}
                      onChange={(e) => setEditingItem({ ...editingItem, market_value_sek: Number(e.target.value) })}
                      className="w-full min-h-[46px] px-3 text-base border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] font-extrabold text-[var(--color-primary)]"
                    />
                  </div>
                </div>

                {/* AI TYPSKYLT & SERIENUMMER */}
                <div className="bg-[var(--color-primary-soft)] p-3.5 rounded-2xl border border-[var(--color-border)] space-y-2">
                  <div className="flex items-start gap-1.5 text-xs text-[var(--color-text)]">
                    <Info className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                    <span><strong>AI-tips typskylt:</strong> {editingItem.serial_number_hint || "Titta på baksidan eller undersidan."}</span>
                  </div>
                  <div>
                    <label className="font-semibold text-[var(--color-text-soft)] block mb-1 text-xs">Faktiskt serienummer / PNC</label>
                    <input
                      type="text"
                      placeholder="t.ex. 916 098 765"
                      value={editingItem.serial_number || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, serial_number: e.target.value })}
                      className="w-full min-h-[46px] px-3 text-sm font-mono border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-[var(--color-text-soft)] block mb-1 text-xs">Egna anteckningar</label>
                  <textarea
                    rows={2}
                    placeholder="t.ex. Kvitto sparat, garanti, tillbehör..."
                    value={editingItem.notes || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                    className="w-full p-3 text-sm border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)]"
                  />
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="min-h-[52px] w-full rounded-2xl bg-[var(--color-primary)] text-white font-bold text-base flex items-center justify-center gap-2 shadow-sm transition active:scale-[.98]"
                  >
                    {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Spara ändringar</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setItemToDelete(editingItem)}
                    className="min-h-[44px] w-full text-[var(--color-text-soft)] text-sm font-semibold hover:text-rose-600 transition"
                  >
                    Ta bort pryl
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>

        {/* BOTTENMENY (Höjd 70 px – FAB-knappen upplyft och centrerad) */}
        {!showRoomPickerScreen && !isAnalyzing && !result && !editingItem && (
          <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-surface)] border-t border-[var(--color-border)] h-[70px] flex items-center justify-around px-2 shadow-sm">
            <div className="w-full max-w-[480px] mx-auto flex items-center justify-around">
              <button
                type="button"
                onClick={() => setCurrentNav("home")}
                className={`flex-1 min-h-[56px] flex flex-col items-center justify-center gap-0.5 border-0 bg-none cursor-pointer ${
                  currentNav === "home" ? "text-[var(--color-primary)] font-bold" : "text-[var(--color-text-soft)]"
                }`}
              >
                <HomeIcon className="w-6 h-6" />
                <span className="text-[13px]">Hem</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentNav("rooms")}
                className={`flex-1 min-h-[56px] flex flex-col items-center justify-center gap-0.5 border-0 bg-none cursor-pointer ${
                  currentNav === "rooms" ? "text-[var(--color-primary)] font-bold" : "text-[var(--color-text-soft)]"
                }`}
              >
                <LayoutGrid className="w-6 h-6" />
                <span className="text-[13px]">Rum</span>
              </button>

              {/* UPP-HÖJD KORALL KAMERA-FAB */}
              <div className="w-[76px] relative flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAddActionSheet(true)}
                  className="absolute -top-7 w-[62px] h-[62px] rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center border-4 border-[var(--color-bg)] shadow-[0_8px_20px_rgba(224,83,58,0.4)] active:scale-95 transition"
                  aria-label="Lägg till pryl"
                >
                  <Camera className="w-7 h-7 stroke-[2.2]" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setCurrentNav("insurance")}
                className={`flex-1 min-h-[56px] flex flex-col items-center justify-center gap-0.5 border-0 bg-none cursor-pointer ${
                  currentNav === "insurance" ? "text-[var(--color-primary)] font-bold" : "text-[var(--color-text-soft)]"
                }`}
              >
                <ShieldCheck className="w-6 h-6" />
                <span className="text-[13px]">Försäkring</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentNav("more")}
                className={`flex-1 min-h-[56px] flex flex-col items-center justify-center gap-0.5 border-0 bg-none cursor-pointer ${
                  currentNav === "more" ? "text-[var(--color-primary)] font-bold" : "text-[var(--color-text-soft)]"
                }`}
              >
                <MoreHorizontal className="w-6 h-6" />
                <span className="text-[13px]">Mer</span>
              </button>
            </div>
          </nav>
        )}

        {/* ACTION SHEET FÖR ATT LÄGGA TILL PRYL */}
        {showAddActionSheet && (
          <div 
            className="fixed inset-0 z-50 bg-black/45 flex items-end animate-in fade-in"
            onClick={() => setShowAddActionSheet(false)}
          >
            <div 
              className="w-full max-w-[480px] mx-auto bg-[var(--color-surface)] rounded-t-[28px] p-5 pb-8 space-y-3 animate-in slide-in-from-bottom duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-11 h-1.5 bg-[var(--color-border)] rounded-full mx-auto mb-2" />
              <h2 className="text-[20px] font-extrabold text-[var(--color-text)]">Lägg till pryl</h2>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddActionSheet(false);
                    setShowRoomPickerScreen(true);
                  }}
                  className="w-full min-h-[72px] rounded-2xl bg-[var(--color-primary)] text-white p-4 flex items-center gap-3.5 text-left active:scale-[.98] transition"
                >
                  <span className="text-3xl">📷</span>
                  <div>
                    <b className="text-[17px] block">Fota och låt AI fylla i</b>
                    <span className="text-[15px] opacity-90">Vi hittar märke, modell och värde</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAddActionSheet(false);
                    galleryInputRef.current?.click();
                  }}
                  className="w-full min-h-[72px] rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] p-4 flex items-center gap-3.5 text-left active:scale-[.98] transition"
                >
                  <span className="text-3xl">🖼️</span>
                  <div>
                    <b className="text-[17px] block">Välj från albumet</b>
                    <span className="text-[15px] text-[var(--color-text-soft)]">Använd bilder du redan tagit</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAddActionSheet(false);
                    setShowManualModal(true);
                  }}
                  className="w-full min-h-[72px] rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] p-4 flex items-center gap-3.5 text-left active:scale-[.98] transition"
                >
                  <span className="text-3xl">✍️</span>
                  <div>
                    <b className="text-[17px] block">Lägg till själv</b>
                    <span className="text-[15px] text-[var(--color-text-soft)]">Privat, utan AI. Bra för smycken och konst</span>
                  </div>
                </button>
              </div>

              <p className="text-[14px] text-[var(--color-text-soft)] text-center pt-2">
                Bilderna används inte för att träna AI.
              </p>
            </div>
          </div>
        )}

        {/* RADERINGS-BEKRÄFTELSE (Bottom Sheet) */}
        {itemToDelete && (
          <div 
            className="fixed inset-0 z-60 bg-black/45 flex items-end animate-in fade-in"
            onClick={() => setItemToDelete(null)}
          >
            <div 
              className="w-full max-w-[480px] mx-auto bg-[var(--color-surface)] rounded-t-[28px] p-5 pb-8 space-y-3 animate-in slide-in-from-bottom"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-11 h-1.5 bg-[var(--color-border)] rounded-full mx-auto mb-2" />
              <h2 className="text-[20px] font-extrabold text-[var(--color-text)]">
                Ta bort {itemToDelete.title}?
              </h2>
              <p className="text-[14px] text-[var(--color-text-soft)]">
                Det går inte att ångra. Föremålet raderas permanent från valvet.
              </p>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="min-h-[52px] w-full rounded-2xl bg-[var(--color-danger)] text-white font-bold text-base flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Ta bort</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setItemToDelete(null)}
                  className="min-h-[52px] w-full rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] font-bold text-base"
                >
                  Behåll
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ACTION SHEET FÖR KAMERA VS ALBUM VID BEFINTLIGT FÖREMÅL */}
        {showEditPhotoOptions && (
          <div 
            className="fixed inset-0 z-60 bg-black/45 flex items-end"
            onClick={() => setShowEditPhotoOptions(false)}
          >
            <div 
              className="w-full max-w-[480px] mx-auto bg-[var(--color-surface)] rounded-t-[28px] p-5 pb-8 space-y-2.5 animate-in slide-in-from-bottom"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-11 h-1.5 bg-[var(--color-border)] rounded-full mx-auto mb-2" />
              <h2 className="text-[20px] font-extrabold text-[var(--color-text)]">Lägg till foto</h2>

              <button
                type="button"
                onClick={() => {
                  setShowEditPhotoOptions(false);
                  editItemCameraInputRef.current?.click();
                }}
                className="w-full min-h-[56px] rounded-2xl bg-[var(--color-primary)] text-white font-bold text-base flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                <span>Ta foto med kameran</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowEditPhotoOptions(false);
                  editItemGalleryInputRef.current?.click();
                }}
                className="w-full min-h-[56px] rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] font-bold text-base flex items-center justify-center gap-2"
              >
                <ImageIcon className="w-5 h-5" />
                <span>Välj från mobilens album</span>
              </button>
            </div>
          </div>
        )}

        {/* KVITTO LIGHTBOX */}
        {viewingReceiptUrl && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in" 
            onClick={() => setViewingReceiptUrl(null)}
          >
            <div 
              className="relative max-w-md w-full bg-[var(--color-surface)] rounded-3xl overflow-hidden p-3 flex flex-col items-center" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full flex justify-between items-center px-3 py-2 text-[var(--color-text)] text-sm">
                <span className="font-bold flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-[var(--color-primary)]" />
                  <span>Originalkvitto</span>
                </span>
                <button onClick={() => setViewingReceiptUrl(null)} className="p-1 rounded-full hover:bg-[var(--color-border)] text-[var(--color-text)]">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="w-full max-h-[75vh] overflow-auto rounded-2xl bg-white flex items-center justify-center p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={viewingReceiptUrl} alt="Kvitto" className="max-h-[70vh] w-auto object-contain rounded-xl" />
              </div>
            </div>
          </div>
        )}

        {/* TOAST NOTIFIERING */}
        {toastMessage && (
          <div className="fixed left-5 right-5 bottom-28 max-w-[440px] mx-auto bg-[var(--color-text)] text-[var(--color-bg)] rounded-2xl p-4 font-semibold text-sm z-50 shadow-lg animate-in slide-in-from-bottom">
            {toastMessage}
          </div>
        )}

        {/* SÄLJANNONS MODAL */}
        {listingModalItem && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-[var(--color-surface)] rounded-3xl p-5 w-full max-w-sm border border-[var(--color-border)] space-y-4">
              <div className="flex justify-between items-center">
                <b className="text-base text-[var(--color-text)]">AI-säljannons</b>
                <button onClick={() => setListingModalItem(null)} className="text-[var(--color-text-soft)]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isGeneratingListing && (
                <div className="py-8 text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--color-primary)]" />
                  <p className="text-sm text-[var(--color-text-soft)]">Formulerar annonser...</p>
                </div>
              )}

              {!isGeneratingListing && listingData && (
                <div className="space-y-3 text-sm">
                  <div className="flex bg-[var(--color-bg)] p-1 rounded-xl">
                    <button
                      onClick={() => setActiveListingTab("blocket")}
                      className={`flex-1 py-1.5 rounded-lg font-bold text-xs ${activeListingTab === "blocket" ? "bg-[var(--color-surface)] shadow-xs" : "opacity-60"}`}
                    >
                      Blocket
                    </button>
                    <button
                      onClick={() => setActiveListingTab("tradera")}
                      className={`flex-1 py-1.5 rounded-lg font-bold text-xs ${activeListingTab === "tradera" ? "bg-[var(--color-surface)] shadow-xs" : "opacity-60"}`}
                    >
                      Tradera
                    </button>
                  </div>

                  <div>
                    <span className="text-xs text-[var(--color-text-soft)] block font-semibold">Pris</span>
                    <b className="text-lg text-[var(--color-text)]">
                      {activeListingTab === "blocket" ? `${listingData.suggested_price_sek} kr` : `Startbud ${listingData.tradera_start_bid_sek} kr`}
                    </b>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Rubrik</span>
                      <button 
                        onClick={() => copyToClipboard(activeListingTab === "blocket" ? listingData.blocket_title : listingData.tradera_title, "titel")} 
                        className="text-[var(--color-primary)] font-bold"
                      >
                        {copiedText === "titel" ? "Kopierad!" : "Kopiera"}
                      </button>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[var(--color-bg)] font-medium text-xs">
                      {activeListingTab === "blocket" ? listingData.blocket_title : listingData.tradera_title}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Text</span>
                      <button 
                        onClick={() => copyToClipboard(activeListingTab === "blocket" ? listingData.blocket_body : listingData.tradera_body, "body")} 
                        className="text-[var(--color-primary)] font-bold"
                      >
                        {copiedText === "body" ? "Kopierad!" : "Kopiera"}
                      </button>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[var(--color-bg)] font-medium text-xs max-h-40 overflow-y-auto whitespace-pre-line">
                      {activeListingTab === "blocket" ? listingData.blocket_body : listingData.tradera_body}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SKADEANMÄLAN MODAL */}
        {showIncidentModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-[var(--color-surface)] rounded-3xl p-5 w-full max-w-sm border border-[var(--color-border)] space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center">
                <b className="text-base text-[var(--color-text)]">Skapa Skadeanmälan</b>
                <button onClick={() => setShowIncidentModal(false)} className="text-[var(--color-text-soft)]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-soft)] block mb-1">Typ av skada</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {INCIDENT_TYPES.map((t) => (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => setIncidentType(t.label)}
                        className={`p-2 rounded-xl border text-xs font-semibold text-left transition ${
                          incidentType === t.label ? "bg-[var(--color-primary-soft)] border-[var(--color-primary)] text-[var(--color-text)]" : "border-[var(--color-border)] opacity-70"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-text-soft)] block mb-0.5">Datum</label>
                    <input 
                      type="date" 
                      value={incidentDate} 
                      onChange={(e) => setIncidentDate(e.target.value)} 
                      className="w-full px-2 py-1.5 border border-[var(--color-border)] rounded-xl text-xs bg-[var(--color-surface)]" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-text-soft)] block mb-0.5">Polisnr</label>
                    <input 
                      type="text" 
                      placeholder="Valfritt" 
                      value={policeReportNumber} 
                      onChange={(e) => setPoliceReportNumber(e.target.value)} 
                      className="w-full px-2 py-1.5 border border-[var(--color-border)] rounded-xl text-xs bg-[var(--color-surface)]" 
                    />
                  </div>
                </div>

                {/* Välj rum */}
                <div>
                  <span className="text-xs font-semibold text-[var(--color-text-soft)] block mb-1">Välj drabbat rum</span>
                  <div className="flex flex-wrap gap-1">
                    {roomKeys.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleRoomItemsForIncident(r)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-[var(--color-border)] font-semibold"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lista */}
                <div className="max-h-36 overflow-y-auto space-y-1 border border-[var(--color-border)] rounded-xl p-1 bg-[var(--color-bg)]">
                  {vaultItems.map((item) => {
                    const isSelected = selectedIncidentItemIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleIncidentItem(item.id)}
                        className={`p-2 rounded-lg cursor-pointer flex items-center gap-2 text-xs ${isSelected ? "bg-[var(--color-surface)] font-bold shadow-2xs" : "opacity-60"}`}
                      >
                        {isSelected ? <CheckSquare className="w-4 h-4 text-rose-600" /> : <Square className="w-4 h-4 opacity-40" />}
                        <span className="truncate">{item.title} ({Number(item.estimated_replacement_cost_sek).toLocaleString("sv-SE")} kr)</span>
                      </div>
                    );
                  })}
                </div>

                <div className="font-bold text-sm">
                  Totalt anspråk: {incidentTotalCost.toLocaleString("sv-SE")} kr
                </div>

                <button
                  type="button"
                  onClick={handleGenerateIncidentReport}
                  disabled={selectedIncidentItemIds.length === 0}
                  className="min-h-[52px] w-full rounded-2xl bg-[var(--color-primary)] text-white font-bold text-base flex items-center justify-center gap-2 shadow-sm"
                >
                  <FileDown className="w-5 h-5" />
                  <span>Ladda ner Skadepaket (PDF)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MANUELL REGISTRERING */}
        {showManualModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-[var(--color-surface)] rounded-3xl p-5 w-full max-w-sm border border-[var(--color-border)] space-y-3">
              <div className="flex justify-between items-center">
                <b className="text-base text-[var(--color-text)]">Lägg till själv</b>
                <button onClick={() => setShowManualModal(false)} className="text-[var(--color-text-soft)]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveManualItem} className="space-y-3 text-sm">
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-soft)] block mb-0.5">Benämning</label>
                  <input
                    type="text"
                    required
                    placeholder="t.ex. Guldring 18k, Ärvt matbord"
                    value={manualFormData.title || ""}
                    onChange={(e) => setManualFormData({ ...manualFormData, title: e.target.value })}
                    className="w-full min-h-[44px] px-3 border border-[var(--color-border)] rounded-xl font-medium bg-[var(--color-surface)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-text-soft)] block mb-0.5">Rum</label>
                    <select
                      value={manualFormData.room || activeRoom}
                      onChange={(e) => setManualFormData({ ...manualFormData, room: e.target.value })}
                      className="w-full min-h-[44px] px-2 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]"
                    >
                      {roomKeys.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-text-soft)] block mb-0.5">Nypris (SEK)</label>
                    <input
                      type="number"
                      required
                      placeholder="12000"
                      value={manualFormData.estimated_replacement_cost_sek || ""}
                      onChange={(e) => setManualFormData({ ...manualFormData, estimated_replacement_cost_sek: Number(e.target.value) })}
                      className="w-full min-h-[44px] px-2 border border-[var(--color-border)] rounded-xl font-bold bg-[var(--color-surface)]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingManual}
                  className="min-h-[52px] w-full rounded-2xl bg-[var(--color-primary)] text-white font-bold text-base flex items-center justify-center gap-2 shadow-sm"
                >
                  {isSavingManual ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Spara pryl</span>}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* BOSTADS-MODAL */}
        {showPropertyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
            <div className="bg-[var(--color-surface)] rounded-3xl p-5 w-full max-w-sm shadow-2xl border border-[var(--color-border)] space-y-4 my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-1 border-b border-[var(--color-border)]">
                <h3 className="font-bold text-base text-[var(--color-text)] flex items-center space-x-1.5">
                  <Building2 className="w-4 h-4 text-[var(--color-primary)]" />
                  <span>{isEditingProperty ? "Redigera bostad" : "Mina Bostäder"}</span>
                </h3>
                <button onClick={() => { setShowPropertyModal(false); setIsEditingProperty(false); }} className="text-[var(--color-text-soft)]">
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
                          selectedProperty?.id === p.id ? "bg-[var(--color-primary-soft)] border-[var(--color-primary)]" : "bg-[var(--color-bg)] border-[var(--color-border)]"
                        }`}
                      >
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <h4 className="font-bold text-xs text-[var(--color-text)]">{p.name}</h4>
                            {p.living_area_sqm && <span className="text-[10px] bg-[var(--color-surface)] text-[var(--color-text-soft)] px-1.5 py-0.2 rounded font-medium">{p.living_area_sqm} m²</span>}
                          </div>
                          <p className="text-[10px] text-[var(--color-text-soft)]">{p.property_type} • {p.insurance_company || "Försäkringsbolag"}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPropertyFormData(p);
                            setIsEditingProperty(true);
                          }}
                          className="text-[11px] text-[var(--color-primary)] font-bold px-2 py-1 rounded hover:bg-[var(--color-primary-soft)]"
                        >
                          Ändra
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setPropertyFormData({
                        name: "Sommarstugan",
                        property_type: "Fritidshus",
                        insurance_company: "Länsförsäkringar",
                        coverage_limit_sek: 600000,
                        deductible_sek: 1500,
                        living_area_sqm: 55,
                      });
                      setIsEditingProperty(true);
                    }}
                    className="w-full py-2.5 border border-dashed border-[var(--color-border)] text-[var(--color-primary)] rounded-xl text-xs font-bold hover:bg-[var(--color-primary-soft)] transition"
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
                        await supabase.from("properties").update({
                          name: propertyFormData.name,
                          property_type: propertyFormData.property_type,
                          insurance_company: propertyFormData.insurance_company,
                          coverage_limit_sek: Number(propertyFormData.coverage_limit_sek),
                          deductible_sek: Number(propertyFormData.deductible_sek),
                          address: propertyFormData.address || "",
                          living_area_sqm: propertyFormData.living_area_sqm ? Number(propertyFormData.living_area_sqm) : null,
                          has_brf_supplement: Boolean(propertyFormData.has_brf_supplement),
                        }).eq("id", propertyFormData.id);
                      } else {
                        await supabase.from("properties").insert({
                          user_id: sessionUser.id,
                          name: propertyFormData.name || "Ny bostad",
                          property_type: propertyFormData.property_type || "Bostadsrätt",
                          insurance_company: propertyFormData.insurance_company || "Länsförsäkringar",
                          coverage_limit_sek: Number(propertyFormData.coverage_limit_sek) || 1000000,
                          deductible_sek: Number(propertyFormData.deductible_sek) || 1500,
                          address: propertyFormData.address || "",
                          living_area_sqm: propertyFormData.living_area_sqm ? Number(propertyFormData.living_area_sqm) : null,
                          has_brf_supplement: Boolean(propertyFormData.has_brf_supplement),
                        });
                      }
                      await fetchProperties(sessionUser.id);
                      setIsEditingProperty(false);
                      setShowPropertyModal(false);
                      showToast("Bostaden sparades ✓");
                    } catch (err: any) {
                      alert(`Kunde inte spara: ${err.message}`);
                    } finally {
                      setIsSavingProperty(false);
                    }
                  }}
                  className="space-y-2.5 text-xs"
                >
                  <div>
                    <label className="font-semibold text-[var(--color-text-soft)] block mb-0.5">Bostadens namn</label>
                    <input
                      type="text"
                      required
                      value={propertyFormData.name || ""}
                      onChange={(e) => setPropertyFormData({ ...propertyFormData, name: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-semibold text-[var(--color-text-soft)] block mb-0.5">Typ</label>
                      <select
                        value={propertyFormData.property_type || "Bostadsrätt"}
                        onChange={(e) => setPropertyFormData({ ...propertyFormData, property_type: e.target.value })}
                        className="w-full px-2 py-1.5 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)]"
                      >
                        <option value="Bostadsrätt">Bostadsrätt</option>
                        <option value="Villa / Småhus">Villa</option>
                        <option value="Hyresrätt">Hyresrätt</option>
                        <option value="Fritidshus">Fritidshus</option>
                        <option value="Externt förråd">Förråd</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold text-[var(--color-text-soft)] block mb-0.5">Boyta (kvm)</label>
                      <input
                        type="number"
                        value={propertyFormData.living_area_sqm || ""}
                        onChange={(e) => setPropertyFormData({ ...propertyFormData, living_area_sqm: Number(e.target.value) })}
                        className="w-full px-2 py-1.5 border border-[var(--color-border)] rounded-xl font-bold bg-[var(--color-surface)] text-[var(--color-text)]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-semibold text-[var(--color-text-soft)] block mb-0.5">Lösörestak (SEK)</label>
                      <input
                        type="number"
                        value={propertyFormData.coverage_limit_sek || 1000000}
                        onChange={(e) => setPropertyFormData({ ...propertyFormData, coverage_limit_sek: Number(e.target.value) })}
                        className="w-full px-2 py-1.5 border border-[var(--color-border)] rounded-xl font-bold bg-[var(--color-surface)] text-[var(--color-text)]"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-[var(--color-text-soft)] block mb-0.5">Bolag</label>
                      <input
                        type="text"
                        placeholder="t.ex. Folksam"
                        value={propertyFormData.insurance_company || ""}
                        onChange={(e) => setPropertyFormData({ ...propertyFormData, insurance_company: e.target.value })}
                        className="w-full px-2 py-1.5 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)]"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex space-x-2">
                    <button type="submit" disabled={isSavingProperty} className="flex-1 py-2.5 bg-[var(--color-primary)] text-white rounded-xl font-bold text-xs">
                      {isSavingProperty ? "Sparar..." : "Spara"}
                    </button>
                    <button type="button" onClick={() => setIsEditingProperty(false)} className="px-3 py-2.5 bg-[var(--color-border)] text-[var(--color-text)] rounded-xl text-xs font-semibold">
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
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[var(--color-surface)] rounded-3xl p-6 w-full max-w-sm border border-[var(--color-border)] space-y-4 shadow-xl">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] flex items-center justify-center mx-auto font-black text-lg">
                  PK
                </div>
                <h3 className="text-lg font-bold text-[var(--color-text)]">
                  {authIsSignUp ? "Säkra ditt hem" : "Logga in"}
                </h3>
                <p className="text-xs text-[var(--color-text-soft)]">
                  Dina inventarier krypteras och sparas tryggt.
                </p>
              </div>

              {authError && (
                <div className="bg-rose-50 text-rose-800 p-2.5 rounded-xl text-xs">
                  {authError}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-3">
                <input
                  type="email"
                  required
                  placeholder="din.epost@exempel.se"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full min-h-[48px] px-3.5 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-surface)] text-[var(--color-text)]"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Lösenord"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full min-h-[48px] px-3.5 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-surface)] text-[var(--color-text)]"
                />
                <button
                  type="submit"
                  disabled={authLoading}
                  className="min-h-[52px] w-full rounded-2xl bg-[var(--color-primary)] text-white font-bold text-base flex items-center justify-center gap-2"
                >
                  {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>{authIsSignUp ? "Skapa konto & Spara" : "Logga in"}</span>}
                </button>
              </form>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setAuthIsSignUp(!authIsSignUp)}
                  className="text-xs text-[var(--color-primary)] font-bold hover:underline"
                >
                  {authIsSignUp ? "Har du redan ett konto? Logga in" : "Inget konto? Skapa ett"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}