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
  ChevronUp, 
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
  ChevronRight, 
  Plus, 
  Home as HomeIcon, 
  LayoutGrid, 
  MoreHorizontal, 
  Clock, 
  Shield, 
  Users, 
  Wrench, 
  BookOpen, 
  ExternalLink, 
  Archive, 
  RotateCcw, 
  Scale, 
  WifiOff, 
  Layers, 
  MousePointerClick, 
  Download, 
  Share2,
  SlidersHorizontal,
  MapPin,
  FolderPlus,
  ArrowRight
} from "lucide-react";
import { sanitizeAndCompressImage } from "@/lib/sanitizeImage";
import { supabase } from "@/lib/supabaseClient";
import { exportToCsv, generateVaultPdf, generateIncidentPdf } from "@/lib/exportVault";

const STANDARD_ROOMS: Record<string, string> = {
  "Vardagsrum": "🛋️",
  "Kök": "🍳",
  "Sovrum": "🛏️",
  "Garderob": "👗",
  "Hall": "🚪",
  "Badrum": "🛁",
  "Tvättstuga": "🧺",
  "Förråd": "📦",
  "Balkong / Altan": "🪴",
  "Garage": "🚗",
};

export function getRoomEmoji(roomName?: string): string {
  if (!roomName) return "📦";
  if (STANDARD_ROOMS[roomName]) return STANDARD_ROOMS[roomName];
  const lower = roomName.toLowerCase();
  if (lower.includes("garderob") || lower.includes("kläd") || lower.includes("closet")) return "👗";
  if (lower.includes("sko")) return "👠";
  if (lower.includes("barn")) return "🧸";
  if (lower.includes("kontor") || lower.includes("arbete")) return "💻";
  if (lower.includes("garage") || lower.includes("bil")) return "🚗";
  if (lower.includes("balkong") || lower.includes("altan") || lower.includes("ute") || lower.includes("trädgård")) return "🪴";
  if (lower.includes("källar") || lower.includes("vind") || lower.includes("förråd")) return "📦";
  if (lower.includes("gäst")) return "🛌";
  return "🏠";
}

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

const SCAN_MESSAGES = [
  "Letar efter föremål i bilden...",
  "Känner igen modeller och skick...",
  "Hämtar aktuella marknadsvärden...",
  "Förbereder dina markeringar...",
];

const SCAN_ICONS = ["👗", "🛋️", "📺", "☕", "🎸", "🪴", "🚲", "⌚", "💻"];

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
  box_2d?: [number, number, number, number];
  previewCropUrl?: string;
  tempReceiptPath?: string;
  tempReceiptPreview?: string;
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
  maintenance_done?: boolean;
  maintenance_date?: string;
  is_archived?: boolean;
  archive_reason?: string;
  created_at: string;
}

function formatItemsCount(count: number) {
  if (count === 0) return "inga föremål ännu";
  if (count === 1) return "1 föremål";
  return `${count} föremål`;
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
      diffDays,
      label: "Garantin har löpt ut",
      expiryDate: expiryDate.toLocaleDateString("sv-SE"),
      badgeClass: "bg-[var(--color-expired-bg)] text-[var(--color-expired-text)]",
    };
  }

  if (diffDays <= 60) {
    return {
      status: "expiring_soon",
      diffDays,
      label: `Löper ut om ${diffDays} dagar!`,
      expiryDate: expiryDate.toLocaleDateString("sv-SE"),
      badgeClass: "bg-[var(--color-warn-bg)] text-[var(--color-warn-text)] border border-[var(--color-border)] font-bold",
    };
  }

  return {
    status: "active",
    diffDays,
    label: `Aktiv (${diffMonths} mån kvar)`,
    expiryDate: expiryDate.toLocaleDateString("sv-SE"),
    badgeClass: "bg-[var(--color-success-bg)] text-[var(--color-success-text)]",
  };
}

function requiresManualOrCare(item: VaultItem): boolean {
  const text = `${item.category || ""} ${item.title || ""} ${item.model || ""}`.toLowerCase();
  
  const ignoreList = [
    "konst", "figurin", "staty", "skulptur", "prydnad", "tavla", "vas", 
    "smycke", "klocka", "kläder", "möbel", "stol", "bord", "matta", "bok", "jacka", "skor", "kängor", "väska"
  ];
  if (ignoreList.some((word) => text.includes(word))) {
    return false;
  }

  const applianceKeywords = [
    "elektronik", "vitvaror", "maskin", "pump", "tvätt", "tork", "disk", 
    "ugn", "spis", "kyl", "frys", "kaffe", "espresso", "robot", "klippare", 
    "dammsugare", "verktyg", "såg", "borr", "tv", "ljud", "router", "skärm", "dusch"
  ];

  return applianceKeywords.some((word) => text.includes(word));
}

async function cropImageFromBox(
  imageSrc: string,
  box: [number, number, number, number],
  paddingPercent: number = 0.20
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const [ymin, xmin, ymax, xmax] = box;
      const origW = img.naturalWidth;
      const origH = img.naturalHeight;

      let x1 = (xmin / 1000) * origW;
      let y1 = (ymin / 1000) * origH;
      let x2 = (xmax / 1000) * origW;
      let y2 = (ymax / 1000) * origH;

      const padX = Math.max((x2 - x1) * paddingPercent, 35);
      const padY = Math.max((y2 - y1) * paddingPercent, 35);

      x1 = Math.max(0, x1 - padX);
      y1 = Math.max(0, y1 - padY);
      x2 = Math.min(origW, x2 + padX);
      y2 = Math.min(origH, y2 + padY);

      let w = x2 - x1;
      let h = y2 - y1;

      const minDimension = 280;
      if (w < minDimension && origW >= minDimension) {
        const diff = (minDimension - w) / 2;
        x1 = Math.max(0, x1 - diff);
        x2 = Math.min(origW, x2 + diff);
        w = x2 - x1;
      }
      if (h < minDimension && origH >= minDimension) {
        const diff = (minDimension - h) / 2;
        y1 = Math.max(0, y1 - diff);
        y2 = Math.min(origH, y2 + diff);
        h = y2 - y1;
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(w));
      canvas.height = Math.max(1, Math.round(h));
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        return reject(new Error("Kunde inte starta canvas-kontext"));
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(img, x1, y1, w, h, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Kunde inte beskära bild"));
        },
        "image/jpeg",
        0.94
      );
    };
    img.onerror = (e) => reject(e);
    img.src = imageSrc;
  });
}

async function cropImageToDataUrl(
  imageSrc: string,
  box: [number, number, number, number],
  paddingPercent: number = 0.25
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const [ymin, xmin, ymax, xmax] = box;
      const origW = img.naturalWidth;
      const origH = img.naturalHeight;

      let x1 = (xmin / 1000) * origW;
      let y1 = (ymin / 1000) * origH;
      let x2 = (xmax / 1000) * origW;
      let y2 = (ymax / 1000) * origH;

      const padX = Math.max((x2 - x1) * paddingPercent, 40);
      const padY = Math.max((y2 - y1) * paddingPercent, 40);

      x1 = Math.max(0, x1 - padX);
      y1 = Math.max(0, y1 - padY);
      x2 = Math.min(origW, x2 + padX);
      y2 = Math.min(origH, y2 + padY);

      let w = x2 - x1;
      let h = y2 - y1;

      const minDimension = 280;
      if (w < minDimension && origW >= minDimension) {
        const diff = (minDimension - w) / 2;
        x1 = Math.max(0, x1 - diff);
        x2 = Math.min(origW, x2 + diff);
        w = x2 - x1;
      }
      if (h < minDimension && origH >= minDimension) {
        const diff = (minDimension - h) / 2;
        y1 = Math.max(0, y1 - diff);
        y2 = Math.min(origH, y2 + diff);
        h = y2 - y1;
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(w));
      canvas.height = Math.max(1, Math.round(h));
      const ctx = canvas.getContext("2d");

      if (!ctx) return resolve(imageSrc);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, x1, y1, w, h, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

export default function HomePage() {
  const [currentNav, setCurrentNav] = useState<"home" | "rooms" | "insurance" | "more">("home");
  const [sessionUser, setSessionUser] = useState<any>(null);

  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);

  const [displayName, setDisplayName] = useState<string>("");
  const [displayNameInput, setDisplayNameInput] = useState<string>("");
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [openGuideCard, setOpenGuideCard] = useState<string | null>("warranty");

  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [isEditingProperty, setIsEditingProperty] = useState(false);
  const [propertyFormData, setPropertyFormData] = useState<Partial<Property>>({});
  const [isSavingProperty, setIsSavingProperty] = useState(false);

  const [propertyMembers, setPropertyMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  const [activeRoom, setActiveRoom] = useState<string>("Vardagsrum");
  const [showRoomPickerScreen, setShowRoomPickerScreen] = useState(false);
  const [customRooms, setCustomRooms] = useState<string[]>([]);
  const [showAddRoomForm, setShowAddRoomForm] = useState(false);
  const [newRoomNameInput, setNewRoomNameInput] = useState("");

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64ForSave, setBase64ForSave] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [scanMessageIndex, setScanMessageIndex] = useState(0);
  const [isTextFading, setIsTextFading] = useState(false);
  const [scanIconIndex, setScanIconIndex] = useState(0);

  const [result, setResult] = useState<ItemAnalysisResult | null>(null);
  const [multiResults, setMultiResults] = useState<ItemAnalysisResult[]>([]);
  const [multiReviewStep, setMultiReviewStep] = useState<number | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  // SPAR-BEKRÄFTELSE MODAL (DOPAMINKORTET)
  const [savedSuccessInfo, setSavedSuccessInfo] = useState<{
    count: number;
    totalAddedSek: number;
    room: string;
  } | null>(null);

  const [totalValuationSek, setTotalValuationSek] = useState<number>(0);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>("Alla");

  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [showMoreItemDetails, setShowMoreItemDetails] = useState<boolean>(false);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingItemPhoto, setIsUploadingItemPhoto] = useState(false);
  const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState(false);
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);

  const [itemToDelete, setItemToDelete] = useState<VaultItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showArchiveHub, setShowArchiveHub] = useState(false);
  const [itemToArchive, setItemToArchive] = useState<VaultItem | null>(null);
  const [archiveReasonInput, setArchiveReasonInput] = useState<string>("Såld");

  const [showAddActionSheet, setShowAddActionSheet] = useState(false);
  const [showEditPhotoOptions, setShowEditPhotoOptions] = useState(false);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportRoomFilter, setExportRoomFilter] = useState<string>("Alla");

  const [showManualModal, setShowManualModal] = useState(false);
  const [manualFormData, setManualFormData] = useState<Partial<VaultItem>>({
    room: "Vardagsrum",
    category: "Övrigt hem & inredning",
    condition: "Mycket gott",
  });
  const [manualPhotoFile, setManualPhotoFile] = useState<File | null>(null);
  const [manualPhotoPreview, setManualPhotoPreview] = useState<string | null>(null);
  const [isSavingManual, setIsSavingManual] = useState(false);

  const [listingModalItem, setListingModalItem] = useState<VaultItem | null>(null);
  const [listingData, setListingData] = useState<any>(null);
  const [isGeneratingListing, setIsGeneratingListing] = useState(false);
  const [activeListingTab, setActiveListingTab] = useState<"blocket" | "marketplace" | "tradera">("blocket");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentType, setIncidentType] = useState("Vattenskada / Läckage");
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split("T")[0]);
  const [policeReportNumber, setPoliceReportNumber] = useState("");
  const [selectedIncidentItemIds, setSelectedIncidentItemIds] = useState<string[]>([]);

  const [warrantyFilter, setWarrantyFilter] = useState<"all" | "expiring_soon" | "active">("all");

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authIsSignUp, setAuthIsSignUp] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "facebook" | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const wizardReceiptInputRef = useRef<HTMLInputElement>(null);
  const manualPhotoInputRef = useRef<HTMLInputElement>(null);
  const editItemCameraInputRef = useRef<HTMLInputElement>(null);
  const editItemGalleryInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const openEditItem = (item: VaultItem) => {
    setEditingItem({ ...item });
    setActiveImageIndex(0);
    setShowMoreItemDetails(Boolean(item.brand || item.model || item.serial_number || item.notes || item.purchase_store));
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bovalvet_custom_rooms");
      if (saved) {
        setCustomRooms(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const activeVaultItems = vaultItems.filter((i) => !i.is_archived);
  const archivedVaultItems = vaultItems.filter((i) => i.is_archived);

  const allRooms: string[] = Array.from(
    new Set([
      ...Object.keys(STANDARD_ROOMS),
      ...customRooms,
      ...activeVaultItems.map((i) => i.room).filter((r): r is string => Boolean(r) && r !== "Ospecificerat")
    ])
  );

  const handleCreateNewRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newRoomNameInput.trim();
    if (!cleanName) return;

    if (!allRooms.includes(cleanName)) {
      const updated = [...customRooms, cleanName];
      setCustomRooms(updated);
      try {
        localStorage.setItem("bovalvet_custom_rooms", JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
    }

    setActiveRoom(cleanName);
    setNewRoomNameInput("");
    setShowAddRoomForm(false);
    showToast(`Rummet "${cleanName}" har lagts till ✓`);
  };

  const removeMultiItem = (indexToRemove: number) => {
    setMultiResults((prev) => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      if (updated.length === 0) {
        setPreviewUrl(null);
        setBase64ForSave(null);
        setMultiReviewStep(null);
      } else if (multiReviewStep !== null && multiReviewStep >= updated.length) {
        setMultiReviewStep(updated.length - 1);
      }
      return updated;
    });
  };

  const updateMultiItemField = (
    index: number,
    field: "title" | "estimated_replacement_cost_sek",
    value: string | number
  ) => {
    setMultiResults((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleWizardReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || multiReviewStep === null || !sessionUser) return;

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

      setMultiResults((prev) =>
        prev.map((item, idx) =>
          idx === multiReviewStep
            ? { ...item, tempReceiptPath: receiptFileName, tempReceiptPreview: processed.previewUrl }
            : item
        )
      );

      showToast("Kvitto bifogat ✓");
    } catch (err: any) {
      alert(`Kunde inte ladda upp kvitto: ${err.message}`);
    } finally {
      setIsAnalyzingReceipt(false);
      if (wizardReceiptInputRef.current) wizardReceiptInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!isAnalyzing) return;

    const msgInterval = setInterval(() => {
      setIsTextFading(true);
      setTimeout(() => {
        setScanMessageIndex((prev) => (prev + 1) % SCAN_MESSAGES.length);
        setIsTextFading(false);
      }, 350);
    }, 3200);

    const iconInterval = setInterval(() => {
      setScanIconIndex((prev) => (prev + 1) % SCAN_ICONS.length);
    }, 1200);

    return () => {
      clearInterval(msgInterval);
      clearInterval(iconInterval);
    };
  }, [isAnalyzing]);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      showToast("Åter ansluten till nätet ✓");
      processOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast("Tappade anslutningen. Offlineläge aktivt.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const savedQueue = localStorage.getItem("bovalvet_offline_queue");
    if (savedQueue) {
      try {
        setOfflineQueue(JSON.parse(savedQueue));
      } catch (e) {
        console.error(e);
      }
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const processOfflineQueue = async () => {
    const queue = JSON.parse(localStorage.getItem("bovalvet_offline_queue") || "[]");
    if (queue.length === 0 || !sessionUser) return;

    showToast(`Synkar ${queue.length} offline-sparade föremål...`);

    const remainingQueue = [];
    for (const item of queue) {
      try {
        await supabase.from("items").insert({
          user_id: sessionUser.id,
          property_id: selectedProperty?.id || null,
          title: item.title,
          category: item.category,
          room: item.room,
          brand: item.brand,
          model: item.model,
          estimated_replacement_cost_sek: item.estimated_replacement_cost_sek,
          market_value_sek: item.market_value_sek,
          condition: item.condition,
          is_archived: false
        });
      } catch (err) {
        remainingQueue.push(item);
      }
    }

    localStorage.setItem("bovalvet_offline_queue", JSON.stringify(remainingQueue));
    setOfflineQueue(remainingQueue);
    if (sessionUser) {
      fetchVaultStats(sessionUser.id, selectedProperty?.id);
      fetchVaultItems(sessionUser.id, selectedProperty?.id);
    }
    showToast("Synkning klar ✓");
  };

  const processPendingGuestData = async (userId: string) => {
    const pendingJson = localStorage.getItem("bovalvet_pending_guest_item");
    if (!pendingJson) return;

    try {
      const pending = JSON.parse(pendingJson);
      localStorage.removeItem("bovalvet_pending_guest_item");

      showToast("Sparar dina fotade föremål till ditt valv...");

      if (pending.base64ForSave && (pending.result || (pending.multiResults && pending.multiResults.length > 0))) {
        const byteCharacters = atob(pending.base64ForSave);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "image/jpeg" });
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

        await supabase.storage.from("item-photos").upload(fileName, blob, { 
          contentType: "image/jpeg", 
          upsert: true 
        });

        if (pending.multiResults && pending.multiResults.length > 0) {
          const inserts = pending.multiResults.map((item: any) => ({
            user_id: userId,
            property_id: selectedProperty?.id || null,
            title: item.title,
            category: item.category,
            room: pending.room || "Vardagsrum",
            brand: item.brand || "",
            model: item.model || "",
            estimated_replacement_cost_sek: Number(item.estimated_replacement_cost_sek) || 0,
            market_value_sek: Number(item.market_value_sek) || 0,
            condition: item.condition || "Mycket gott",
            serial_number_hint: item.serial_number_hint || "",
            image_path: fileName,
            photo_path: fileName,
            image_paths: [fileName],
            is_archived: false
          }));

          const { error: insertErr } = await supabase.from("items").insert(inserts);
          if (!insertErr) {
            await fetchVaultStats(userId, selectedProperty?.id);
            await fetchVaultItems(userId, selectedProperty?.id);
            showToast(`${inserts.length} föremål har sparats i ditt valv ✓`);
          }
        } else if (pending.result) {
          const { data: insertedData, error: insertErr } = await supabase.from("items").insert({
            user_id: userId,
            property_id: selectedProperty?.id || null,
            title: pending.result.title,
            category: pending.result.category,
            room: pending.room || "Vardagsrum",
            brand: pending.result.brand,
            model: pending.result.model,
            estimated_replacement_cost_sek: pending.result.estimated_replacement_cost_sek,
            market_value_sek: pending.result.market_value_sek,
            condition: pending.result.condition,
            serial_number_hint: pending.result.serial_number_hint,
            image_path: fileName,
            photo_path: fileName,
            image_paths: [fileName],
            is_archived: false
          }).select().single();

          if (!insertErr && insertedData) {
            await fetchVaultStats(userId, selectedProperty?.id);
            await fetchVaultItems(userId, selectedProperty?.id);
            showToast(`"${pending.result.title}" har sparats i ditt valv ✓`);
          }
        }
      }
    } catch (e) {
      console.error("Kunde inte synka gästdata:", e);
    }
  };

  useEffect(() => {
    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user || null;
      setSessionUser(user);
      if (user) {
        const storedName = user.user_metadata?.display_name || user.user_metadata?.full_name || "";
        setDisplayName(storedName);
        setDisplayNameInput(storedName);
        await fetchProperties(user.id);
        await processPendingGuestData(user.id);
      }
    };
    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user || null;
      setSessionUser(user);
      if (user) {
        const storedName = user.user_metadata?.display_name || user.user_metadata?.full_name || "";
        setDisplayName(storedName);
        setDisplayNameInput(storedName);
        await fetchProperties(user.id);
        await processPendingGuestData(user.id);
      } else {
        setDisplayName("");
        setDisplayNameInput("");
        setTotalValuationSek(0);
        setVaultItems([]);
        setProperties([]);
        setSelectedProperty(null);
        setCurrentNav("home");
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedProperty?.id) {
      fetchPropertyMembers(selectedProperty.id);
    }
  }, [selectedProperty]);

  const handleSaveDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionUser) return;
    setIsUpdatingName(true);

    try {
      const cleanName = displayNameInput.trim();
      const { data, error } = await supabase.auth.updateUser({
        data: { display_name: cleanName, full_name: cleanName }
      });

      if (error) throw error;

      if (data?.user) {
        setSessionUser(data.user);
        setDisplayName(cleanName);
        showToast("Ditt namn har sparats ✓");
      }
    } catch (err: any) {
      alert(`Kunde inte spara namn: ${err.message}`);
    } finally {
      setIsUpdatingName(false);
    }
  };

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

  const fetchPropertyMembers = async (propertyId: string) => {
    try {
      const { data, error } = await supabase
        .from("property_members")
        .select("*")
        .eq("property_id", propertyId);

      if (!error && data) {
        setPropertyMembers(data);
      }
    } catch (e) {
      console.error("Kunde inte hämta hushållsmedlemmar:", e);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty || !inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      const { error } = await supabase.from("property_members").insert({
        property_id: selectedProperty.id,
        user_email: inviteEmail.trim(),
        role: "member"
      });

      if (error) throw error;

      setInviteEmail("");
      await fetchPropertyMembers(selectedProperty.id);
      showToast("Inbjudan skickad ✓");
    } catch (err: any) {
      alert(`Kunde inte bjuda in: ${err.message}`);
    } finally {
      setIsInviting(false);
    }
  };

  const fetchVaultStats = async (userId: string, propertyId?: string) => {
    try {
      let query = supabase.from("items").select("estimated_replacement_cost_sek").eq("user_id", userId).eq("is_archived", false);
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
              is_archived: Boolean(item.is_archived),
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
      showToast("Föremålet är borttaget");
    } catch (err: any) {
      alert(`Kunde inte radera: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchiveItem = async () => {
    if (!itemToArchive || !sessionUser) return;
    try {
      await supabase
        .from("items")
        .update({
          is_archived: true,
          archive_reason: archiveReasonInput,
        })
        .eq("id", itemToArchive.id);

      const updated = { ...itemToArchive, is_archived: true, archive_reason: archiveReasonInput };
      setVaultItems((prev) => prev.map((i) => (i.id === itemToArchive.id ? updated : i)));
      if (editingItem?.id === itemToArchive.id) setEditingItem(null);
      await fetchVaultStats(sessionUser.id, selectedProperty?.id);
      setItemToArchive(null);
      showToast(`Flyttad till arkivet (${archiveReasonInput}) ✓`);
    } catch (err: any) {
      alert(`Kunde inte arkivera: ${err.message}`);
    }
  };

  const handleRestoreItem = async (item: VaultItem) => {
    if (!sessionUser) return;
    try {
      await supabase
        .from("items")
        .update({ is_archived: false, archive_reason: null })
        .eq("id", item.id);

      const updated = { ...item, is_archived: false, archive_reason: undefined };
      setVaultItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      await fetchVaultStats(sessionUser.id, selectedProperty?.id);
      showToast(`"${item.title}" har återställts till valvet ✓`);
    } catch (err: any) {
      alert(`Kunde inte återställa: ${err.message}`);
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

  const handleLaunchPlatform = async (platform: "blocket" | "marketplace" | "tradera") => {
    if (!listingModalItem || !listingData) return;

    let textToCopy = "";
    let destinationUrl = "";

    if (platform === "blocket") {
      textToCopy = `${listingData.blocket_title || listingModalItem.title}\n\nPris: ${listingData.suggested_price_sek || listingModalItem.market_value_sek} kr\nSkick: ${listingModalItem.condition}\n\n${listingData.blocket_body || ""}`;
      destinationUrl = "https://www.blocket.se/create-item/start";
    } else if (platform === "marketplace") {
      textToCopy = `${listingData.blocket_title || listingModalItem.title}\n\nPris: ${listingData.suggested_price_sek || listingModalItem.market_value_sek} kr\nSkick: ${listingModalItem.condition}\n\n${listingData.blocket_body || ""}\n\nBetalning sker via Swish. Hämtas på plats!`;
      destinationUrl = "https://www.facebook.com/marketplace/create/item";
    } else {
      textToCopy = `${listingData.tradera_title || listingModalItem.title}\n\nStartbud: ${listingData.tradera_start_bid_sek || 49} kr\nSkick: ${listingModalItem.condition}\n\n${listingData.tradera_body || ""}`;
      destinationUrl = "https://www.tradera.com/selling/new";
    }

    window.open(destinationUrl, "_blank", "noopener,noreferrer");

    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch (e) {
      console.error("Urklipp misslyckades:", e);
    }

    if (listingModalItem.imageUrl) {
      try {
        const res = await fetch(listingModalItem.imageUrl);
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `${listingModalItem.title.replace(/[^a-zA-Z0-9åäöÅÄÖ]/g, "_")}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      } catch (err) {
        console.warn("Kunde inte ladda ner bild:", err);
      }
    }

    const platformName = platform === "blocket" ? "Blocket" : platform === "marketplace" ? "Marketplace" : "Tradera";
    showToast(`Bild sparad & text kopierad! Klistra in på ${platformName} ✓`);
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowAddActionSheet(false);
    setShowRoomPickerScreen(false);
    setResult(null);
    setMultiResults([]);
    setMultiReviewStep(null);
    setHighlightedIndex(null);

    setIsAnalyzing(true);
    setScanMessageIndex(0);
    setIsTextFading(false);
    setScanIconIndex(0);

    try {
      const processed = await sanitizeAndCompressImage(file);
      setPreviewUrl(processed.previewUrl);
      setBase64ForSave(processed.base64ForGemini);

      if (!navigator.onLine) {
        setIsAnalyzing(false);
        setResult({
          title: "Föremål (Sparat offline)",
          category: "Övrigt hem & inredning",
          brand: "",
          model: "",
          estimated_replacement_cost_sek: 1000,
          market_value_sek: 500,
          condition: "Mycket gott",
          serial_number_hint: "",
          confidence: 1
        });
        showToast("Offlineläge: Fyll i uppgifter manuellt och spara.");
        return;
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Image: processed.base64ForGemini, mimeType: processed.mimeType }),
      });

      const response = await res.json();
      if (response.success && response.items) {
        const detected: ItemAnalysisResult[] = response.items.filter((item: ItemAnalysisResult) => {
          const isTooExpensive = item.estimated_replacement_cost_sek > 10_000_000;
          const isBuildingOrVehicle = /skyskrapa|byggnad|fastighet|spårvagn|tunnelbana|lokaltrafik|tåg/i.test(
            (item.title || "") + (item.category || "")
          );
          return !isTooExpensive && !isBuildingOrVehicle;
        });

        if (detected.length === 0) {
          alert("Inga heminventarier eller godkänt lösöre kunde identifieras. Kontrollera att bilden föreställer ett privat föremål.");
          setIsAnalyzing(false);
          setPreviewUrl(null);
          setBase64ForSave(null);
          return;
        }

        if (!sessionUser) {
          localStorage.setItem("bovalvet_pending_guest_item", JSON.stringify({
            result: detected.length === 1 ? detected[0] : null,
            multiResults: detected.length > 1 ? detected : null,
            base64ForSave: processed.base64ForGemini,
            room: activeRoom
          }));
        }
        
        if (detected.length === 1) {
          let single = detected[0];
          if (single.box_2d && single.box_2d.length === 4 && processed.previewUrl) {
            try {
              const cropUrl = await cropImageToDataUrl(processed.previewUrl, single.box_2d);
              single = { ...single, previewCropUrl: cropUrl };
            } catch (cropErr) {
              console.warn("Kunde inte beskära enskilt föremål:", cropErr);
            }
          }
          setResult(single);
          setMultiResults([]);
          setMultiReviewStep(null);
        } else if (detected.length > 1) {
          const withCrops = await Promise.all(
            detected.map(async (item) => {
              if (item.box_2d && item.box_2d.length === 4 && processed.previewUrl) {
                try {
                  const cropUrl = await cropImageToDataUrl(processed.previewUrl, item.box_2d);
                  return { ...item, previewCropUrl: cropUrl };
                } catch {
                  return item;
                }
              }
              return item;
            })
          );
          setMultiResults(withCrops);
          setMultiReviewStep(null);
          showToast(`Hittade ${withCrops.length} föremål i ${activeRoom}!`);
        }
      } else {
        alert(response.error || "Kunde inte tolka föremålet.");
      }
    } catch (err: unknown) {
      setIsAnalyzing(false);
      setResult({
        title: "Föremål (Sparat offline)",
        category: "Övrigt hem & inredning",
        brand: "",
        model: "",
        estimated_replacement_cost_sek: 1000,
        market_value_sek: 500,
        condition: "Mycket gott",
        serial_number_hint: "",
        confidence: 1
      });
      showToast("Ingen anslutning. Sparad i offline-kö.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executeSaveAiItem = async (userId: string) => {
    if (!result || !base64ForSave) return;

    if (!userId) {
      const guestData = {
        result,
        base64ForSave,
        room: activeRoom,
      };
      localStorage.setItem("bovalvet_pending_guest_item", JSON.stringify(guestData));
      setShowAuthModal(true);
      showToast("Logga in för att spara ditt föremål i valvet!");
      return;
    }

    setIsSaving(true);
    const addedValue = Number(result.estimated_replacement_cost_sek) || 0;

    try {
      const byteCharacters = atob(base64ForSave);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/jpeg" });
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

      await supabase.storage.from("item-photos").upload(fileName, blob, { contentType: "image/jpeg", upsert: true });

      const { error: insertErr } = await supabase.from("items").insert({
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
        is_archived: false
      }).select().single();

      if (insertErr) throw insertErr;

      await fetchVaultStats(userId, selectedProperty?.id);
      await fetchVaultItems(userId, selectedProperty?.id);
      
      setResult(null);
      setPreviewUrl(null);
      setBase64ForSave(null);

      setSavedSuccessInfo({
        count: 1,
        totalAddedSek: addedValue,
        room: activeRoom,
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const executeSaveMultiItems = async (userId?: string) => {
    const itemsToSave = multiResults;
    if (itemsToSave.length === 0 || !base64ForSave || !previewUrl) return;

    if (!userId) {
      const guestData = {
        multiResults: itemsToSave,
        base64ForSave,
        room: activeRoom,
      };
      localStorage.setItem("bovalvet_pending_guest_item", JSON.stringify(guestData));
      setShowAuthModal(true);
      showToast("Logga in för att spara dina föremål!");
      return;
    }

    setIsSaving(true);
    const totalAdded = itemsToSave.reduce((sum, item) => sum + (Number(item.estimated_replacement_cost_sek) || 0), 0);

    try {
      const byteCharacters = atob(base64ForSave);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
      const origBlob = new Blob([new Uint8Array(byteNumbers)], { type: "image/jpeg" });
      
      const overviewFileName = `${userId}/overview-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      await supabase.storage.from("item-photos").upload(overviewFileName, origBlob, { 
        contentType: "image/jpeg", 
        upsert: true 
      });

      const inserts = [];

      for (let i = 0; i < itemsToSave.length; i++) {
        const item = itemsToSave[i];
        let itemCroppedFileName = overviewFileName;

        if (item.previewCropUrl && item.previewCropUrl.startsWith("data:image/")) {
          try {
            const byteString = atob(item.previewCropUrl.split(",")[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let b = 0; b < byteString.length; b++) {
              ia[b] = byteString.charCodeAt(b);
            }
            const croppedBlob = new Blob([ab], { type: "image/jpeg" });
            const cropName = `${userId}/crop-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}.jpg`;
            const { error: cropErr } = await supabase.storage
              .from("item-photos")
              .upload(cropName, croppedBlob, { contentType: "image/jpeg", upsert: true });

            if (!cropErr) {
              itemCroppedFileName = cropName;
            }
          } catch (cropErr) {
            console.warn("Kunde inte ladda upp beskuren bild:", cropErr);
          }
        } else if (item.box_2d && item.box_2d.length === 4) {
          try {
            const croppedBlob = await cropImageFromBox(previewUrl, item.box_2d);
            const cropName = `${userId}/crop-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}.jpg`;
            
            const { error: cropErr } = await supabase.storage
              .from("item-photos")
              .upload(cropName, croppedBlob, { contentType: "image/jpeg", upsert: true });

            if (!cropErr) {
              itemCroppedFileName = cropName;
            }
          } catch (cropErr) {
            console.warn("Kunde inte beskära föremål, använder översiktsbild:", cropErr);
          }
        }

        const finalImagePaths = itemCroppedFileName !== overviewFileName
          ? [itemCroppedFileName, overviewFileName]
          : [overviewFileName];

        inserts.push({
          user_id: userId,
          property_id: selectedProperty?.id || null,
          title: item.title,
          category: item.category,
          room: activeRoom,
          brand: item.brand || "",
          model: item.model || "",
          estimated_replacement_cost_sek: Number(item.estimated_replacement_cost_sek) || 0,
          market_value_sek: Number(item.market_value_sek) || 0,
          condition: item.condition || "Mycket gott",
          serial_number_hint: item.serial_number_hint || "",
          receipt_path: item.tempReceiptPath || null,
          image_path: itemCroppedFileName,
          photo_path: itemCroppedFileName,
          image_paths: finalImagePaths,
          is_archived: false,
        });
      }

      const { error: insertErr } = await supabase.from("items").insert(inserts);
      if (insertErr) throw insertErr;

      await fetchVaultStats(userId, selectedProperty?.id);
      await fetchVaultItems(userId, selectedProperty?.id);

      const savedCount = itemsToSave.length;
      setMultiResults([]);
      setMultiReviewStep(null);
      setPreviewUrl(null);
      setBase64ForSave(null);

      setSavedSuccessInfo({
        count: savedCount,
        totalAddedSek: totalAdded,
        room: activeRoom,
      });
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
      if (manualPhotoFile && navigator.onLine) {
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

      const { error: insertErr } = await supabase.from("items").insert({
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
        is_archived: false
      }).select().single();

      if (insertErr) throw insertErr;

      await fetchVaultStats(sessionUser.id, selectedProperty?.id);
      await fetchVaultItems(sessionUser.id, selectedProperty?.id);
      
      setShowManualModal(false);
      setManualFormData({ room: activeRoom, category: "Övrigt hem & inredning", condition: "Mycket gott" });
      setManualPhotoFile(null);
      setManualPhotoPreview(null);

      setSavedSuccessInfo({
        count: 1,
        totalAddedSek: repCost,
        room: manualFormData.room || activeRoom,
      });
    } catch (err: any) {
      alert(`Kunde inte spara: ${err.message}`);
    } finally {
      setIsSavingManual(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "facebook") => {
    setSocialLoading(provider);
    setAuthError(null);

    if (base64ForSave && (result || multiResults.length > 0)) {
      localStorage.setItem("bovalvet_pending_guest_item", JSON.stringify({
        result,
        multiResults: multiResults.length > 0 ? multiResults : null,
        base64ForSave,
        room: activeRoom
      }));
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(`Kunde inte logga in med ${provider === "google" ? "Google" : "Facebook"}: ${err.message}`);
      setSocialLoading(null);
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
        const storedName = activeUser.user_metadata?.display_name || activeUser.user_metadata?.full_name || "";
        setDisplayName(storedName);
        setDisplayNameInput(storedName);
        setShowAuthModal(false);
        await new Promise((r) => setTimeout(r, 300));
        await fetchProperties(activeUser.id);
        await processPendingGuestData(activeUser.id);
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
    setShowProfileModal(false);
    setCurrentNav("home");
    showToast("Du har loggat ut");
  };

  const startedRoomCount = allRooms.filter((r) => activeVaultItems.some((i) => i.room === r)).length;
  const firstEmptyRoom = allRooms.find((r) => !activeVaultItems.some((i) => i.room === r));

  const filteredItemsByRoom = activeVaultItems.filter((i) => {
    if (selectedRoomFilter === "Alla") return true;
    return (i.room || "Ospecificerat") === selectedRoomFilter;
  });

  const itemsWithWarranty = activeVaultItems.filter((i) => Boolean(i.purchase_date));
  const expiringSoonItems = itemsWithWarranty.filter((i) => {
    const s = getWarrantyStatus(i.purchase_date, i.warranty_months || 36);
    return s?.status === "expiring_soon";
  });
  const activeWarrantyItems = itemsWithWarranty.filter((i) => {
    const s = getWarrantyStatus(i.purchase_date, i.warranty_months || 36);
    return s?.status === "active";
  });

  const displayedWarrantyItems = itemsWithWarranty.filter((i) => {
    if (warrantyFilter === "expiring_soon") {
      const s = getWarrantyStatus(i.purchase_date, i.warranty_months || 36);
      return s?.status === "expiring_soon";
    }
    if (warrantyFilter === "active") {
      const s = getWarrantyStatus(i.purchase_date, i.warranty_months || 36);
      return s?.status === "active";
    }
    return true;
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
    const roomItemIds = activeVaultItems.filter((i) => (i.room || "Ospecificerat") === roomName).map((i) => i.id);
    const allSelected = roomItemIds.length > 0 && roomItemIds.every((id) => selectedIncidentItemIds.includes(id));
    if (allSelected) setSelectedIncidentItemIds((prev) => prev.filter((id) => !roomItemIds.includes(id)));
    else setSelectedIncidentItemIds((prev) => Array.from(new Set([...prev, ...roomItemIds])));
  };

  const selectedIncidentItems = activeVaultItems.filter((i) => selectedIncidentItemIds.includes(i.id));
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
      property: selectedProperty,
      userEmail: displayName || sessionUser?.email || "Användare",
      items: selectedIncidentItems,
    });
    setShowIncidentModal(false);
  };

  const avatarLetter = (displayName || sessionUser?.email || "K").trim()[0].toUpperCase();

  return (
    <div className="min-h-screen bg-[var(--color-bg)] md:bg-[#ECE4D8] text-[var(--color-text)] flex justify-center selection:bg-[var(--color-primary-soft)] selection:text-[var(--color-primary)]">
      <div className="w-full max-w-[480px] min-h-screen flex flex-col relative pb-32 bg-[var(--color-bg)] md:shadow-md md:border-x md:border-[var(--color-border)]">

        {!isOnline && (
          <div className="bg-amber-600 text-white text-xs font-bold px-4 py-2 text-center flex items-center justify-center gap-2 z-30">
            <WifiOff className="w-4 h-4" />
            <span>Offlineläge aktivt ({offlineQueue.length} i kö)</span>
          </div>
        )}

        {!showRoomPickerScreen && !isAnalyzing && !result && multiResults.length === 0 && !editingItem && !showArchiveHub && (
          <header className="h-16 px-5 flex items-center justify-between z-20">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)] text-[var(--color-onp,#fff)] flex items-center justify-center font-extrabold text-base shadow-xs">
                BV
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

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (!sessionUser) {
                    setShowAuthModal(true);
                  } else {
                    setDisplayNameInput(displayName);
                    setShowProfileModal(true);
                  }
                }}
                className="w-11 h-11 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] flex items-center justify-center font-bold text-base border-0 hover:opacity-90 active:scale-95 transition"
                aria-label="Profil och inloggning"
              >
                {sessionUser ? avatarLetter : <Lock className="w-4 h-4" />}
              </button>
            </div>
          </header>
        )}

        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageSelected} className="hidden" />
        <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleImageSelected} className="hidden" />
        <input ref={receiptInputRef} type="file" accept="image/*" onChange={handleReceiptUpload} className="hidden" />
        <input ref={wizardReceiptInputRef} type="file" accept="image/*" capture="environment" onChange={handleWizardReceiptUpload} className="hidden" />
        <input ref={manualPhotoInputRef} type="file" accept="image/*" onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            setManualPhotoFile(f);
            setManualPhotoPreview(URL.createObjectURL(f));
          }
        }} className="hidden" />
        <input ref={editItemCameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleUploadAdditionalPhoto} className="hidden" />
        <input ref={editItemGalleryInputRef} type="file" accept="image/*" onChange={handleUploadAdditionalPhoto} className="hidden" />

        <main className="flex-1 px-5 pt-1 space-y-6 overflow-y-auto">

          {/* RUMSVÄLJARE */}
          {showRoomPickerScreen && !isAnalyzing && !result && multiResults.length === 0 && !editingItem && !showArchiveHub && (
            <div className="space-y-4 animate-in fade-in pt-2">
              <button 
                onClick={() => {
                  setShowRoomPickerScreen(false);
                  setShowAddRoomForm(false);
                }}
                className="min-h-[44px] flex items-center gap-1 text-[var(--color-primary)] font-bold text-base -ml-2"
              >
                ← Klar
              </button>

              <div>
                <h1 className="text-[24px] font-extrabold text-[var(--color-text)]">Var är du?</h1>
                <p className="text-[16px] text-[var(--color-text-soft)] mt-1">
                  Vi sparar allt du fotar här tills du byter rum.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {allRooms.map((rName) => {
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
                      <span className="text-2xl">{getRoomEmoji(rName)}</span>
                      <span className="truncate">{rName}</span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setShowAddRoomForm(true)}
                  className="min-h-[64px] rounded-2xl border-2 border-dashed border-[var(--color-border)] p-3 text-left flex items-center gap-3 text-[var(--color-primary)] font-bold text-base hover:bg-[var(--color-primary-soft)] transition"
                >
                  <FolderPlus className="w-6 h-6 flex-shrink-0" />
                  <span>+ Eget rum</span>
                </button>
              </div>

              {showAddRoomForm && (
                <form onSubmit={handleCreateNewRoom} className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-3 animate-in fade-in">
                  <label className="text-xs font-bold text-[var(--color-text-soft)] block">
                    VAD HETER DITT NYA RUM?
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="t.ex. Klädkammare, Vinkällare, Gästrum..."
                    value={newRoomNameInput}
                    onChange={(e) => setNewRoomNameInput(e.target.value)}
                    className="w-full min-h-[48px] px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] font-semibold text-base"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 min-h-[44px] rounded-xl bg-[var(--color-primary)] text-white font-bold text-sm"
                    >
                      Spara och välj rum
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddRoomForm(false)}
                      className="px-4 min-h-[44px] rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm font-semibold"
                    >
                      Avbryt
                    </button>
                  </div>
                </form>
              )}

              <div className="pt-4 space-y-2">
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
                  className="min-h-[44px] w-full text-[var(--color-text-soft)] text-base font-semibold text-center hover:underline"
                >
                  eller välj från mobilens album
                </button>
              </div>
            </div>
          )}

          {/* SKANNINGSANIMATION */}
          {isAnalyzing && (
            <div className="py-16 text-center space-y-7 animate-in fade-in select-none">
              <div className="relative w-52 h-52 mx-auto">
                <div className="absolute -inset-2 bg-gradient-to-tr from-[var(--color-primary)] via-emerald-400 to-amber-300 rounded-[34px] opacity-35 blur-md animate-pulse" />

                <div className="relative w-full h-full rounded-3xl overflow-hidden bg-stone-900 border-2 border-[var(--color-primary)] shadow-2xl flex items-center justify-center">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={previewUrl} 
                      alt="Skannas" 
                      className="w-full h-full object-cover opacity-90 scale-105" 
                    />
                  ) : (
                    <Camera className="w-16 h-16 text-[var(--color-primary)] opacity-40 animate-pulse" />
                  )}
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent shadow-[0_0_12px_#2dd4bf] animate-[bounce_2.5s_infinite]" />
                </div>

                <div className="absolute -bottom-2.5 -right-2.5 w-12 h-12 rounded-2xl bg-[var(--color-surface)] border-2 border-[var(--color-primary)] shadow-lg flex items-center justify-center text-2xl transition-all duration-300">
                  <span>{SCAN_ICONS[scanIconIndex]}</span>
                </div>
              </div>

              <div className="px-6 max-w-xs mx-auto min-h-[48px] flex items-center justify-center">
                <h2 
                  className={`text-[19px] font-extrabold text-[var(--color-text)] transition-opacity duration-300 ${
                    isTextFading ? "opacity-0" : "opacity-100"
                  }`}
                >
                  {SCAN_MESSAGES[scanMessageIndex]}
                </h2>
              </div>
            </div>
          )}

          {/* 1. MULTI-RESULTAT: ÖVERSIKTSVY MED NUMRERADE PINS DIREKT PÅ FOTOT */}
          {multiResults.length > 0 && !isAnalyzing && multiReviewStep === null && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
              <div className="flex items-center justify-between">
                <button 
                  type="button"
                  onClick={() => {
                    setMultiResults([]);
                    setPreviewUrl(null);
                    setBase64ForSave(null);
                  }} 
                  className="min-h-[44px] flex items-center gap-1 text-[var(--color-primary)] font-bold text-base -ml-1"
                >
                  ← Fota om
                </button>

                <button
                  type="button"
                  onClick={() => setShowRoomPickerScreen(true)}
                  className="min-h-[40px] px-3.5 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-semibold text-sm flex items-center gap-1.5 hover:opacity-90 transition active:scale-95"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Rum: <strong>{activeRoom}</strong></span>
                </button>
              </div>

              <div>
                <h1 className="text-[22px] font-extrabold text-[var(--color-text)]">
                  Hittade {multiResults.length} föremål i {activeRoom}
                </h1>
                <p className="text-sm text-[var(--color-text-soft)] mt-0.5">
                  Sammanlagt nypris: <strong className="text-[var(--color-text)] font-extrabold">{multiResults.reduce((sum, item) => sum + (Number(item.estimated_replacement_cost_sek) || 0), 0).toLocaleString("sv-SE")} kr</strong>
                </p>
              </div>

              {previewUrl && (
                <div className="relative rounded-3xl overflow-hidden bg-black border border-[var(--color-border)] shadow-md select-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Översiktsfoto" className="w-full h-auto max-h-[300px] object-contain block mx-auto opacity-95" />
                  
                  {multiResults.map((item, idx) => {
                    if (!item.box_2d || item.box_2d.length < 4) return null;
                    const [ymin, xmin, ymax, xmax] = item.box_2d;
                    const isHighlighted = highlightedIndex === idx;

                    return (
                      <div
                        key={idx}
                        onClick={() => setMultiReviewStep(idx)}
                        style={{
                          top: `${(ymin / 1000) * 100}%`,
                          left: `${(xmin / 1000) * 100}%`,
                          width: `${Math.max(10, ((xmax - xmin) / 1000) * 100)}%`,
                          height: `${Math.max(8, ((ymax - ymin) / 1000) * 100)}%`,
                        }}
                        className={`absolute border-2 rounded-xl cursor-pointer transition-all duration-200 flex items-start justify-start p-1 ${
                          isHighlighted 
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/35 ring-4 ring-white" 
                            : "border-white/80 bg-black/25 hover:border-[var(--color-primary)] hover:bg-black/40"
                        }`}
                        title={item.title}
                      >
                        <span className="w-6 h-6 rounded-full bg-[var(--color-primary)] text-white text-xs font-black flex items-center justify-center shadow-lg border border-white">
                          {idx + 1}
                        </span>
                      </div>
                    );
                  })}
                  
                  <div className="absolute bottom-2.5 right-2.5 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white pointer-events-none">
                    Klicka på en siffra eller rad för att granska
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-1">
                {multiResults.map((item, idx) => {
                  const isHighlighted = highlightedIndex === idx;
                  return (
                    <div 
                      key={idx}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onMouseLeave={() => setHighlightedIndex(null)}
                      className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                        isHighlighted 
                          ? "bg-[var(--color-primary-soft)] border-[var(--color-primary)] shadow-card" 
                          : "bg-[var(--color-surface)] border-[var(--color-border)] shadow-xs"
                      }`}
                    >
                      <div 
                        onClick={() => setMultiReviewStep(idx)}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] text-white font-black text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                          {idx + 1}
                        </div>

                        <div className="w-12 h-12 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {item.previewCropUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.previewCropUrl} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl">{getRoomEmoji(activeRoom)}</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <b className="text-base text-[var(--color-text)] block truncate">{item.title}</b>
                          <span className="text-sm font-extrabold text-[var(--color-text)] block">
                            {Number(item.estimated_replacement_cost_sek).toLocaleString("sv-SE")} kr
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeMultiItem(idx)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--color-text-soft)] hover:text-rose-600 hover:bg-rose-50 transition active:scale-95 flex-shrink-0"
                        title="Ta bort föremål"
                        aria-label={`Ta bort ${item.title}`}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 space-y-2.5">
                <button
                  type="button"
                  onClick={() => setMultiReviewStep(0)}
                  className="min-h-[56px] w-full rounded-2xl bg-[var(--color-primary)] text-white font-extrabold text-base flex items-center justify-center gap-2.5 shadow-md active:scale-[.98] transition"
                >
                  <span>Gå igenom föremålen steg för steg (1 av {multiResults.length})</span>
                  <ArrowRight className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => executeSaveMultiItems(sessionUser?.id)}
                  disabled={isSaving || multiResults.length === 0}
                  className="min-h-[52px] w-full rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] font-bold text-base text-[var(--color-text)] flex items-center justify-center gap-2 shadow-2xs hover:bg-[var(--color-primary-soft)] transition active:scale-[.98]"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Spara alla {multiResults.length} direkt som de är</span>}
                </button>
              </div>
            </div>
          )}

          {/* 2. DEN GUIDADE GENOMGÅNGEN */}
          {multiResults.length > 0 && !isAnalyzing && multiReviewStep !== null && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <button 
                    type="button"
                    onClick={() => setMultiReviewStep(null)} 
                    className="min-h-[44px] flex items-center gap-1 text-[var(--color-primary)] font-bold text-base -ml-1"
                  >
                    ← Tillbaka till översikten
                  </button>

                  <span className="text-sm font-extrabold px-3 py-1.5 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                    Föremål {multiReviewStep + 1} av {multiResults.length}
                  </span>
                </div>

                <div className="w-full bg-[var(--color-border)] h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[var(--color-primary)] transition-all duration-300"
                    style={{ width: `${((multiReviewStep + 1) / multiResults.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="relative h-64 rounded-3xl overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs select-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={multiResults[multiReviewStep]?.previewCropUrl || previewUrl || ""} 
                  alt={multiResults[multiReviewStep]?.title || "Föremål"} 
                  className="w-full h-full object-cover" 
                />
                
                <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-[var(--color-primary)] text-white font-black text-sm flex items-center justify-center shadow-md border-2 border-white">
                  {multiReviewStep + 1}
                </div>

                <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-xs border border-stone-200 text-slate-800 text-sm font-semibold">
                  Placeras i: <strong>{activeRoom}</strong>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="font-semibold text-[var(--color-text-soft)] block mb-1.5 text-sm">Vad är detta för föremål?</label>
                  <input 
                    type="text" 
                    value={multiResults[multiReviewStep]?.title || ""} 
                    onChange={(e) => updateMultiItemField(multiReviewStep, "title", e.target.value)}
                    className="w-full min-h-[52px] px-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] font-bold text-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-[var(--color-text-soft)] block mb-1.5 text-sm">Nypris idag (SEK)</label>
                    <input 
                      type="number" 
                      value={multiResults[multiReviewStep]?.estimated_replacement_cost_sek || ""} 
                      onChange={(e) => updateMultiItemField(multiReviewStep, "estimated_replacement_cost_sek", Number(e.target.value))}
                      className="w-full min-h-[52px] px-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] font-extrabold text-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[var(--color-text-soft)] block mb-1.5 text-sm">Kvitto (valfritt)</label>
                    <button
                      type="button"
                      onClick={() => wizardReceiptInputRef.current?.click()}
                      disabled={isAnalyzingReceipt}
                      className={`w-full min-h-[52px] px-3 rounded-2xl border text-sm font-bold flex items-center justify-center gap-1.5 transition active:scale-95 ${
                        multiResults[multiReviewStep]?.tempReceiptPath
                          ? "bg-[var(--color-success-bg)] text-[var(--color-success-text)] border-emerald-300"
                          : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]"
                      }`}
                    >
                      {isAnalyzingReceipt ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Receipt className="w-4 h-4 text-[var(--color-primary)]" />
                          <span>{multiResults[multiReviewStep]?.tempReceiptPath ? "Kvitto sparat ✓" : "+ Fota kvitto"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 space-y-2.5">
                {multiReviewStep < multiResults.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setMultiReviewStep(multiReviewStep + 1)}
                    className="min-h-[56px] w-full rounded-2xl bg-[var(--color-primary)] text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-sm transition active:scale-[.98]"
                  >
                    <span>Godkänn & Nästa ({multiReviewStep + 2} av {multiResults.length}) →</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => executeSaveMultiItems(sessionUser?.id)}
                    disabled={isSaving}
                    className="min-h-[56px] w-full rounded-2xl bg-[var(--color-primary)] text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-sm transition active:scale-[.98]"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Klart! Spara alla föremål i {activeRoom} ✓</span>}
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => removeMultiItem(multiReviewStep)}
                    className="min-h-[48px] rounded-2xl text-rose-600 font-semibold text-sm hover:bg-rose-50 border border-transparent transition"
                  >
                    Ta bort detta föremål
                  </button>

                  <button
                    type="button"
                    onClick={() => executeSaveMultiItems(sessionUser?.id)}
                    className="min-h-[48px] rounded-2xl text-[var(--color-text-soft)] font-semibold text-sm hover:bg-[var(--color-bg)] border border-[var(--color-border)] transition"
                  >
                    Spara resten direkt ⚡
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. ENKELT FÖREMÅL */}
          {result && !isAnalyzing && multiResults.length === 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
              <button 
                type="button"
                onClick={() => {
                  setResult(null);
                  setPreviewUrl(null);
                  setBase64ForSave(null);
                }} 
                className="min-h-[44px] flex items-center gap-1 text-[var(--color-primary)] font-bold text-base -ml-1"
              >
                ← Fota om
              </button>

              <div className="relative h-64 rounded-3xl overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs select-none">
                {previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={result.previewCropUrl || previewUrl} alt={result.title} className="w-full h-full object-cover" />
                )}

                <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-xs border border-stone-200 flex items-center gap-1.5 text-slate-800">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold">{Math.round(result.confidence * 100)} % säker</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-[var(--color-text-soft)] block mb-1.5 text-sm">Vad är detta för föremål?</label>
                <input 
                  type="text" 
                  value={result.title} 
                  onChange={(e) => setResult({ ...result, title: e.target.value })}
                  className="w-full min-h-[52px] px-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] font-bold text-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                {(result.brand || result.model) && (
                  <p className="text-sm text-[var(--color-text-soft)] mt-1.5 font-medium">
                    {[result.brand, result.model].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[var(--color-surface)] p-3.5 rounded-2xl border border-[var(--color-border)] shadow-card">
                  <span className="text-sm text-[var(--color-text-soft)] block font-medium">Nypris idag</span>
                  <input
                    type="number"
                    value={result.estimated_replacement_cost_sek}
                    onChange={(e) => setResult({ ...result, estimated_replacement_cost_sek: Number(e.target.value) })}
                    className="w-full bg-transparent font-black text-xl text-[var(--color-text)] focus:outline-none border-b border-transparent focus:border-[var(--color-primary)] mt-1"
                  />
                </div>
                <div className="bg-[var(--color-surface)] p-3.5 rounded-2xl border border-[var(--color-border)] shadow-card">
                  <span className="text-sm text-[var(--color-text-soft)] block font-medium">Värde begagnat</span>
                  <input
                    type="number"
                    value={result.market_value_sek}
                    onChange={(e) => setResult({ ...result, market_value_sek: Number(e.target.value) })}
                    className="w-full bg-transparent font-black text-xl text-[var(--color-primary)] focus:outline-none border-b border-transparent focus:border-[var(--color-primary)] mt-1"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowRoomPickerScreen(true)}
                className="w-full min-h-[56px] px-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between font-semibold text-base text-[var(--color-text)] hover:bg-[var(--color-primary-soft)] transition"
              >
                <span>Placering: <strong>{activeRoom}</strong></span>
                <span className="text-[var(--color-primary)] font-bold">Ändra</span>
              </button>

              <div className="pt-2 space-y-2.5">
                <button
                  type="button"
                  onClick={() => executeSaveAiItem(sessionUser?.id)}
                  disabled={isSaving}
                  className="min-h-[56px] w-full rounded-2xl bg-[var(--color-primary)] text-white font-bold text-base flex items-center justify-center gap-2 shadow-sm transition active:scale-[.98]"
                >
                  {isSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <span>{sessionUser ? `Spara i ${activeRoom}` : "Logga in och spara föremål"}</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="min-h-[44px] w-full text-[var(--color-text-soft)] text-base font-semibold hover:text-[var(--color-text)] transition"
                >
                  Fota om
                </button>
              </div>
            </div>
          )}

          {/* STARTSIDA (HEM) */}
          {!showRoomPickerScreen && !isAnalyzing && !result && multiResults.length === 0 && !editingItem && !showArchiveHub && currentNav === "home" && (
            <div className="space-y-6 animate-in fade-in">
              {/* Om valvet är tomt: Varmt och enkelt Onboarding-läge */}
              {activeVaultItems.length === 0 ? (
                <div className="space-y-5 pt-2">
                  <div>
                    <h1 className="text-[28px] font-extrabold text-[var(--color-text)] leading-tight">
                      Välkommen till BoValvet!
                    </h1>
                    <p className="text-[16px] text-[var(--color-text-soft)] mt-1.5 leading-relaxed">
                      Säkra hemmets värden, garantier och kvitton på några minuter.
                    </p>
                  </div>

                  <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 text-center space-y-4 shadow-card">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] flex items-center justify-center mx-auto text-3xl shadow-xs">
                      📷
                    </div>
                    <div>
                      <h2 className="text-[20px] font-extrabold text-[var(--color-text)]">
                        Börja med att ta ett foto
                      </h2>
                      <p className="text-[15px] text-[var(--color-text-soft)] mt-1.5 leading-relaxed">
                        Fota en soffa, din TV, ett smycke eller ett helt rum. Vår AI identifierar föremålen och räknar automatiskt ut värdet.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowRoomPickerScreen(true)}
                      className="min-h-[56px] w-full rounded-2xl bg-[var(--color-primary)] text-white font-extrabold text-base flex items-center justify-center gap-2.5 shadow-md active:scale-[.98] transition"
                    >
                      <Camera className="w-5 h-5" />
                      <span>Fota ditt första föremål</span>
                    </button>
                  </div>

                  <div className="p-5 bg-[var(--color-primary-soft)] rounded-3xl border border-[var(--color-border)] space-y-3">
                    <b className="text-[15px] text-[var(--color-primary)] block font-bold">
                      Vad BoValvet hjälper dig med:
                    </b>
                    <div className="space-y-2 text-[14px] text-[var(--color-text)]">
                      <div className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                        <span>Koll på hemmets totala lösöresvärde</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                        <span>Skydd mot underförsäkring om något händer</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                        <span>Garantivakt som varnar innan reklamationsrätten går ut</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Om det finns föremål: Instrumentpanelen */
                <div className="space-y-6">
                  <div>
                    <h1 className="text-[26px] font-extrabold text-[var(--color-text)]">
                      Hej, {displayName || (sessionUser ? "där" : "gäst")}!
                    </h1>
                    <p className="text-[15px] text-[var(--color-text-soft)] mt-0.5 font-medium">
                      Översikt för {selectedProperty?.name || "hemmet"}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-[var(--color-primary-soft)] to-[var(--color-surface)] rounded-3xl p-5 border border-[var(--color-border)] shadow-card space-y-4">
                    <div>
                      <span className="text-[14px] text-[var(--color-text-soft)] font-semibold block">
                        Värdet på dina föremål
                      </span>
                      <div className="text-[40px] font-black tracking-tight text-[var(--color-text)] leading-none mt-1">
                        {totalValuationSek.toLocaleString("sv-SE")} kr
                      </div>
                      <p className="text-[15px] text-[var(--color-text)] leading-snug mt-2">
                        {formatItemsCount(activeVaultItems.length)} säkrade med foto och uppgifter
                      </p>
                    </div>

                    <div className="p-3 bg-[var(--color-surface)]/80 rounded-2xl border border-[var(--color-border)] space-y-2">
                      <div className="flex items-center justify-between text-[14px]">
                        <span className="text-[var(--color-text-soft)] font-medium">
                          Inventering: <strong>{startedRoomCount} av {allRooms.length} rum</strong>
                        </span>
                        {firstEmptyRoom && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveRoom(firstEmptyRoom);
                              setShowRoomPickerScreen(true);
                            }}
                            className="text-[var(--color-primary)] font-extrabold flex items-center gap-1 hover:underline active:scale-95 transition"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Nästa: {firstEmptyRoom}</span>
                          </button>
                        )}
                      </div>
                      <div className="w-full bg-[var(--color-border)] rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500"
                          style={{ width: `${Math.round((startedRoomCount / Math.max(allRooms.length, 1)) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-1 border-t border-[var(--color-border)] flex items-center justify-between text-[14px] text-[var(--color-text-soft)]">
                      <span>Försäkringstak: {Number(selectedProperty?.coverage_limit_sek || 1000000).toLocaleString("sv-SE")} kr</span>
                      <button onClick={() => setCurrentNav("insurance")} className="text-[var(--color-primary)] font-bold hover:underline">
                        Se villkor & skydd
                      </button>
                    </div>
                  </div>

                  {expiringSoonItems.length > 0 && (
                    <div 
                      onClick={() => {
                        setWarrantyFilter("expiring_soon");
                        setCurrentNav("insurance");
                      }}
                      className="bg-[var(--color-warn-bg)] border border-[var(--color-border)] p-4 rounded-3xl cursor-pointer shadow-card flex items-center gap-3.5 active:scale-[.98] transition"
                    >
                      <Clock className="w-6 h-6 text-[var(--color-warn-text)] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <b className="text-[16px] text-[var(--color-warn-text)] block font-bold">
                          {expiringSoonItems.length} {expiringSoonItems.length === 1 ? "garanti" : "garantier"} löper ut snart!
                        </b>
                        <span className="text-[14px] text-[var(--color-text-soft)] block truncate">
                          T.ex. {expiringSoonItems[0].title}. Kontrollera skicket innan tidsfristen går ut.
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[var(--color-warn-text)] opacity-60 flex-shrink-0" />
                    </div>
                  )}

                  <div className="space-y-3 pt-1">
                    <div className="flex justify-between items-center">
                      <h2 className="text-[20px] font-extrabold text-[var(--color-text)]">Senast tillagt</h2>
                      {activeVaultItems.length > 5 && (
                        <button onClick={() => setCurrentNav("rooms")} className="text-[var(--color-primary)] font-bold text-sm">
                          Visa alla i Valvet
                        </button>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {activeVaultItems.slice(0, 6).map((item) => (
                        <div
                          key={item.id}
                          onClick={() => openEditItem(item)}
                          className="bg-[var(--color-surface)] p-3 rounded-2xl border border-[var(--color-border)] shadow-card flex items-center gap-3 cursor-pointer active:scale-[.98] transition"
                        >
                          <div className="w-[72px] h-[72px] rounded-xl bg-[var(--color-primary-soft)] flex-shrink-0 overflow-hidden flex items-center justify-center text-2xl border border-[var(--color-border)]">
                            {item.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                            ) : (
                              <span>{getRoomEmoji(item.room)}</span>
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
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FLIKEN: VALVET (FÖRE DETTA "RUM") */}
          {!showRoomPickerScreen && !isAnalyzing && !result && multiResults.length === 0 && !editingItem && !showArchiveHub && currentNav === "rooms" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pt-1">
                <div>
                  <h1 className="text-[24px] font-extrabold text-[var(--color-text)]">Ditt Valv</h1>
                  <span className="text-sm text-[var(--color-text-soft)]">
                    {formatItemsCount(activeVaultItems.length)} säkrade i {selectedProperty?.name || "hemmet"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowRoomPickerScreen(true);
                    setShowAddRoomForm(true);
                  }}
                  className="text-xs font-bold text-[var(--color-primary)] px-3 py-1.5 rounded-full bg-[var(--color-primary-soft)] flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Skapa eget rum</span>
                </button>
              </div>

              {/* Rumsfilter-knappar */}
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
                  Alla ({activeVaultItems.length})
                </button>
                {allRooms.map((r) => {
                  const count = activeVaultItems.filter((i) => i.room === r).length;
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

              <div className="space-y-2.5 pt-1">
                {filteredItemsByRoom.length === 0 ? (
                  <div className="text-center py-12 bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 space-y-3">
                    <span className="text-5xl">{getRoomEmoji(selectedRoomFilter)}</span>
                    <h2 className="text-xl font-bold text-[var(--color-text)]">Här är det tomt</h2>
                    <p className="text-[16px] text-[var(--color-text-soft)]">
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
                        onClick={() => openEditItem(item)}
                        className="bg-[var(--color-surface)] p-3 rounded-2xl border border-[var(--color-border)] shadow-card flex items-center gap-3 cursor-pointer active:scale-[.98] transition"
                      >
                        <div className="w-[72px] h-[72px] rounded-xl bg-[var(--color-primary-soft)] flex-shrink-0 overflow-hidden flex items-center justify-center text-2xl border border-[var(--color-border)]">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <span>{getRoomEmoji(item.room)}</span>
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
                              <span className={`text-[13px] font-bold px-2.5 py-0.5 rounded-md ${wStatus.badgeClass}`}>
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

          {/* FÖRSÄKRING & GARANTI */}
          {!showRoomPickerScreen && !isAnalyzing && !result && multiResults.length === 0 && !editingItem && !showArchiveHub && currentNav === "insurance" && (
            <div className="space-y-6 animate-in fade-in">
              <h1 className="text-[24px] font-extrabold text-[var(--color-text)] pt-1">Försäkring & Garanti</h1>

              <div className="bg-[var(--color-surface)] rounded-3xl p-5 border border-[var(--color-border)] shadow-card space-y-2">
                <span className="text-[15px] text-[var(--color-text-soft)] font-semibold block">Så här står du</span>
                <div className="text-[20px] text-[var(--color-text)]">
                  <strong>{totalValuationSek.toLocaleString("sv-SE")} kr</strong> inventerat av <strong>{Number(selectedProperty?.coverage_limit_sek || 1000000).toLocaleString("sv-SE")} kr</strong>
                </div>
                <p className="text-[16px] text-[var(--color-text-soft)]">
                  Du kan fortsätta lägga till föremål när som helst.
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
                  onClick={() => setShowExportModal(true)}
                  className="min-h-[52px] w-full rounded-2xl bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] font-bold text-base flex items-center justify-center gap-2 shadow-card hover:bg-[var(--color-primary-soft)] transition"
                >
                  <FileDown className="w-5 h-5 text-[var(--color-primary)]" />
                  <span>Spara eller dela förteckning</span>
                </button>
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex justify-between items-center">
                  <h2 className="text-[20px] font-extrabold text-[var(--color-text)] flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[var(--color-primary)]" />
                    <span>Garantier & Kvitton</span>
                  </h2>
                </div>

                <div className="flex gap-2 pb-1">
                  <button
                    type="button"
                    onClick={() => setWarrantyFilter("all")}
                    className={`min-h-[38px] px-3.5 rounded-full text-sm font-bold border transition ${
                      warrantyFilter === "all" ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]" : "bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)]"
                    }`}
                  >
                    Alla ({itemsWithWarranty.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setWarrantyFilter("expiring_soon")}
                    className={`min-h-[38px] px-3.5 rounded-full text-sm font-bold border transition ${
                      warrantyFilter === "expiring_soon" ? "bg-[var(--color-warn-bg)] text-[var(--color-warn-text)] border-[var(--color-border)] font-black" : "bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)]"
                    }`}
                  >
                    Löper ut snart ({expiringSoonItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setWarrantyFilter("active")}
                    className={`min-h-[38px] px-3.5 rounded-full text-sm font-bold border transition ${
                      warrantyFilter === "active" ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]" : "bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)]"
                    }`}
                  >
                    Aktiva ({activeWarrantyItems.length})
                  </button>
                </div>

                {displayedWarrantyItems.length === 0 ? (
                  <div className="bg-[var(--color-surface)] p-4 rounded-2xl border border-[var(--color-border)] text-center text-base text-[var(--color-text-soft)]">
                    Inga föremål med registrerat inköpsdatum matchar detta filter. Fota ett kvitto för att lägga till garanti.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {displayedWarrantyItems.map((item) => {
                      const s = getWarrantyStatus(item.purchase_date, item.warranty_months || 36);
                      if (!s) return null;

                      return (
                        <div
                          key={item.id}
                          onClick={() => openEditItem(item)}
                          className={`p-4 rounded-2xl border bg-[var(--color-surface)] shadow-card cursor-pointer active:scale-[.98] transition space-y-2 ${
                            s.status === "expiring_soon" ? "border-amber-400 bg-amber-50/20" : "border-[var(--color-border)]"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <b className="text-base text-[var(--color-text)] block">{item.title}</b>
                              <span className="text-[14px] text-[var(--color-text-soft)]">
                                Inköpt: {item.purchase_date} {item.purchase_store ? `hos ${item.purchase_store}` : ""}
                              </span>
                            </div>
                            <span className={`text-[13px] px-3 py-1 rounded-xl font-bold ${s.badgeClass}`}>
                              {s.label}
                            </span>
                          </div>

                          {s.status === "expiring_soon" && (
                            <div className="pt-1.5 border-t border-[var(--color-border)] text-[13px] text-[var(--color-warn-text)] font-semibold flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                              <span>Kontrollera funktionen innan garantin går ut den {s.expiryDate}!</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2">
                <h2 className="text-[20px] font-extrabold text-[var(--color-text)]">Direktkontakt vid skada</h2>
                <div className="space-y-2">
                  {INSURANCE_HELP.map((ins) => (
                    <a
                      key={ins.name}
                      href={`tel:${ins.phone}`}
                      className="min-h-[56px] p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between no-underline text-[var(--color-text)] shadow-2xs"
                    >
                      <div>
                        <b className="text-base block">{ins.name}</b>
                        <span className="text-[15px] text-[var(--color-text-soft)]">{ins.phone}</span>
                      </div>
                      <span className="px-3.5 py-1.5 rounded-xl bg-[var(--color-success-bg)] text-[var(--color-success-text)] font-bold text-sm flex items-center gap-1.5">
                        <Phone className="w-4 h-4" />
                        <span>Ring</span>
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* KUNSKAP & MER */}
          {!showRoomPickerScreen && !isAnalyzing && !result && multiResults.length === 0 && !editingItem && !showArchiveHub && currentNav === "more" && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h1 className="text-[26px] font-extrabold text-[var(--color-text)] pt-1">Kunskap & Trygghet</h1>
                <p className="text-[16px] text-[var(--color-text-soft)] mt-1">
                  Guider om dina rättigheter, garantier och hur försäkringsbolag bedömer dina föremål.
                </p>
              </div>

              <div className="space-y-3">
                <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] overflow-hidden shadow-card">
                  <button
                    type="button"
                    onClick={() => setOpenGuideCard(openGuideCard === "warranty" ? null : "warranty")}
                    className="min-h-[64px] w-full px-5 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
                        <Scale className="w-5 h-5" />
                      </div>
                      <div>
                        <b className="text-[17px] text-[var(--color-text)] block">Garanti vs. Reklamationsrätt</b>
                        <span className="text-[14px] text-[var(--color-text-soft)]">Vad är skillnaden och vad gäller?</span>
                      </div>
                    </div>
                    {openGuideCard === "warranty" ? <ChevronUp className="w-5 h-5 text-[var(--color-text-soft)]" /> : <ChevronDown className="w-5 h-5 text-[var(--color-text-soft)]" />}
                  </button>

                  {openGuideCard === "warranty" && (
                    <div className="px-5 pb-5 pt-1 space-y-3 border-t border-[var(--color-border)] text-[15px] text-[var(--color-text)] leading-relaxed">
                      <p>
                        <strong>Garanti är frivilligt:</strong> Det är ett löfte som butiken eller tillverkaren själv väljer att ge (ofta 1–2 år). Villkoren bestäms av tillverkaren.
                      </p>
                      <p>
                        <strong>Reklamationsrätt är lag:</strong> I Sverige ger Konsumentköplagen dig alltid <strong>3 års rätt att reklamera</strong> ursprungliga fel på varor du köpt som privatperson.
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] overflow-hidden shadow-card">
                  <button
                    type="button"
                    onClick={() => setOpenGuideCard(openGuideCard === "insurance" ? null : "insurance")}
                    className="min-h-[64px] w-full px-5 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <b className="text-[17px] text-[var(--color-text)] block">Åldersavdrag & Ersättning</b>
                        <span className="text-[14px] text-[var(--color-text-soft)]">Så räknar försäkringsbolagen</span>
                      </div>
                    </div>
                    {openGuideCard === "insurance" ? <ChevronUp className="w-5 h-5 text-[var(--color-text-soft)]" /> : <ChevronDown className="w-5 h-5 text-[var(--color-text-soft)]" />}
                  </button>

                  {openGuideCard === "insurance" && (
                    <div className="px-5 pb-5 pt-1 space-y-3 border-t border-[var(--color-border)] text-[15px] text-[var(--color-text)] leading-relaxed">
                      <p>
                        <strong>Nyvärde vs. Marknadsvärde:</strong> De flesta hemförsäkringar ersätter nyvärde under de första 1–2 åren. Därefter görs ett årligt schablonavdrag (åldersavdrag).
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] overflow-hidden shadow-card">
                  <button
                    type="button"
                    onClick={() => setOpenGuideCard(openGuideCard === "privacy" ? null : "privacy")}
                    className="min-h-[64px] w-full px-5 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div>
                        <b className="text-[17px] text-[var(--color-text)] block">Integritet & Säker AI</b>
                        <span className="text-[14px] text-[var(--color-text-soft)]">Dina bilder och personuppgifter</span>
                      </div>
                    </div>
                    {openGuideCard === "privacy" ? <ChevronUp className="w-5 h-5 text-[var(--color-text-soft)]" /> : <ChevronDown className="w-5 h-5 text-[var(--color-text-soft)]" />}
                  </button>

                  {openGuideCard === "privacy" && (
                    <div className="px-5 pb-5 pt-1 space-y-3 border-t border-[var(--color-border)] text-[15px] text-[var(--color-text)] leading-relaxed">
                      <p>
                        <strong>Lokal bildsäkring:</strong> Innan en bild laddas upp raderas all känslig plats- och GPS-data direkt i din webbläsare. Ingen positionsdata sparas i molnet.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ARKIV & SÅLDA FÖREMÅL */}
          {showArchiveHub && (
            <div className="space-y-4 animate-in fade-in pt-1 pb-6">
              <button 
                onClick={() => setShowArchiveHub(false)} 
                className="min-h-[44px] flex items-center gap-1 text-[var(--color-primary)] font-bold text-base -ml-2"
              >
                ← Tillbaka
              </button>

              <div>
                <h1 className="text-[24px] font-extrabold text-[var(--color-text)]">Arkiv & Sålda föremål</h1>
                <p className="text-[15px] text-[var(--color-text-soft)] mt-1">
                  Dessa föremål räknas inte in i hemmets lösöresvärde, men kvitton och garantier är tryggt sparade.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                {archivedVaultItems.length === 0 ? (
                  <div className="text-center py-12 bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 space-y-2">
                    <span className="text-4xl">📦</span>
                    <h3 className="font-bold text-lg text-[var(--color-text)]">Arkivet är tomt</h3>
                    <p className="text-[15px] text-[var(--color-text-soft)]">
                      När du säljer eller gör dig av med ett föremål kan du arkivera det här istället för att radera kvittot.
                    </p>
                  </div>
                ) : (
                  archivedVaultItems.map((item) => (
                    <div 
                      key={item.id} 
                      className="bg-[var(--color-surface)] p-4 rounded-2xl border border-[var(--color-border)] shadow-card space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-xl bg-[var(--color-bg)] overflow-hidden flex items-center justify-center text-xl flex-shrink-0 border border-[var(--color-border)]">
                            {item.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                            ) : (
                              <span>{getRoomEmoji(item.room)}</span>
                            )}
                          </div>
                          <div>
                            <b className="text-base text-[var(--color-text)] block">{item.title}</b>
                            <span className="text-sm text-[var(--color-text-soft)] block">
                              Märkt som: <strong>{item.archive_reason || "Arkiverad"}</strong>
                            </span>
                          </div>
                        </div>

                        {item.receiptUrl && (
                          <button
                            type="button"
                            onClick={() => setViewingReceiptUrl(item.receiptUrl || null)}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-bold flex-shrink-0"
                          >
                            Visa kvitto
                          </button>
                        )}
                      </div>

                      <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-sm">
                        <button
                          type="button"
                          onClick={() => handleRestoreItem(item)}
                          className="text-[var(--color-primary)] font-bold flex items-center gap-1.5 hover:underline"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Återställ till valvet</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          className="text-rose-600 font-bold hover:underline"
                        >
                          Radera permanent
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* REDIGERA FÖREMÅL */}
          {editingItem && !showArchiveHub && (
            <div className="space-y-4 animate-in fade-in pt-1 pb-6">
              <div className="flex items-center justify-between bg-[var(--color-primary-soft)] p-3 rounded-2xl border border-[var(--color-border)]">
                <button 
                  onClick={() => setEditingItem(null)} 
                  className="text-[var(--color-primary)] font-bold text-sm flex items-center gap-1"
                >
                  ← Tillbaka till {editingItem.room}
                </button>
                <button 
                  onClick={() => {
                    setEditingItem(null);
                    cameraInputRef.current?.click();
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold flex items-center gap-1 shadow-2xs"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Fota ett till i {editingItem.room}</span>
                </button>
              </div>

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
                    <span className="text-sm text-[var(--color-text-soft)]">Fota direkt eller välj från album</span>
                  </div>
                )}

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

              <form onSubmit={handleSaveItemUpdates} className="space-y-4">
                <div>
                  <label className="font-semibold text-[var(--color-text-soft)] block mb-1.5 text-sm">Benämning</label>
                  <input
                    type="text"
                    required
                    value={editingItem.title}
                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                    className="w-full min-h-[52px] px-3.5 text-base border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)] font-semibold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[var(--color-text-soft)] block mb-1.5 text-sm">Rum</label>
                  <select
                    value={editingItem.room || "Vardagsrum"}
                    onChange={(e) => setEditingItem({ ...editingItem, room: e.target.value })}
                    className="w-full min-h-[52px] px-3 text-base border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)] font-medium"
                  >
                    {allRooms.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-[var(--color-text-soft)] block mb-1.5 text-sm">Nypris idag (SEK)</label>
                    <input
                      type="number"
                      value={editingItem.estimated_replacement_cost_sek}
                      onChange={(e) => setEditingItem({ ...editingItem, estimated_replacement_cost_sek: Number(e.target.value) })}
                      className="w-full min-h-[52px] px-3 text-base border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] font-extrabold text-[var(--color-text)]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[var(--color-text-soft)] block mb-1.5 text-sm">Begagnatvärde (SEK)</label>
                    <input
                      type="number"
                      value={editingItem.market_value_sek}
                      onChange={(e) => setEditingItem({ ...editingItem, market_value_sek: Number(e.target.value) })}
                      className="w-full min-h-[52px] px-3 text-base border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] font-extrabold text-[var(--color-primary)]"
                    />
                  </div>
                </div>

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
                      className="min-h-[44px] px-4 rounded-xl bg-[var(--color-primary)] text-white text-sm font-bold flex items-center gap-1.5 shadow-2xs hover:opacity-90 transition active:scale-95"
                    >
                      {isAnalyzingReceipt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                      <span>{editingItem.receipt_path ? "Byt kvitto" : "Fota kvitto"}</span>
                    </button>
                  </div>

                  {editingItem.receiptUrl && (
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--color-primary-soft)] text-sm">
                      <div className="flex items-center gap-2 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="font-semibold truncate text-[var(--color-primary)]">Kvitto sparat i valvet</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewingReceiptUrl(editingItem.receiptUrl || null)}
                        className="text-[var(--color-primary)] font-bold underline text-sm flex-shrink-0 ml-2"
                      >
                        Visa kvitto
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <label className="font-semibold text-[var(--color-text-soft)] block mb-1.5 text-sm">Inköpsdatum</label>
                      <input
                        type="date"
                        value={editingItem.purchase_date || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, purchase_date: e.target.value })}
                        className="w-full min-h-[52px] px-3 text-base border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)]"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-[var(--color-text-soft)] block mb-1.5 text-sm">Köppris (SEK)</label>
                      <input
                        type="number"
                        placeholder="Enligt kvitto"
                        value={editingItem.purchase_price_sek || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, purchase_price_sek: Number(e.target.value) })}
                        className="w-full min-h-[52px] px-3 text-base border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] font-bold text-[var(--color-text)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-[var(--color-text-soft)] block mb-1.5 text-sm">Garanti & Reklamationsrätt</label>
                    <select
                      value={editingItem.warranty_months || 36}
                      onChange={(e) => setEditingItem({ ...editingItem, warranty_months: Number(e.target.value) })}
                      className="w-full min-h-[52px] px-3 text-base border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)] font-medium"
                    >
                      <option value={12}>1 år (12 mån standardgaranti)</option>
                      <option value={24}>2 år (24 mån tillverkargaranti)</option>
                      <option value={36}>3 år (Lagstadgad reklamationsrätt i Sverige)</option>
                      <option value={60}>5 år (Förlängd garanti)</option>
                      <option value={120}>10 år (Trygghetsgaranti)</option>
                    </select>
                  </div>
                </div>

                {(() => {
                  const hasExtraDetails = Boolean(editingItem.brand || editingItem.model || editingItem.serial_number || editingItem.notes || editingItem.purchase_store);
                  return (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setShowMoreItemDetails(!showMoreItemDetails)}
                        className="w-full min-h-[52px] px-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex items-center justify-between text-base font-semibold text-[var(--color-text)] hover:bg-[var(--color-bg)] transition active:scale-[.99]"
                      >
                        <div className="flex items-center gap-2.5">
                          <SlidersHorizontal className="w-5 h-5 text-[var(--color-primary)]" />
                          <span>Fler uppgifter (valfritt)</span>
                          {hasExtraDetails && (
                            <span className="text-[13px] bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-bold px-2.5 py-0.5 rounded-full">
                              Ifyllt
                            </span>
                          )}
                        </div>
                        <ChevronDown className={`w-5 h-5 text-[var(--color-text-soft)] transition-transform duration-200 ${showMoreItemDetails ? "rotate-180" : ""}`} />
                      </button>

                      {showMoreItemDetails && (
                        <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-card space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="font-semibold text-[var(--color-text-soft)] block mb-1.5 text-sm">Märke</label>
                              <input
                                type="text"
                                placeholder="t.ex. Philips"
                                value={editingItem.brand || ""}
                                onChange={(e) => setEditingItem({ ...editingItem, brand: e.target.value })}
                                className="w-full min-h-[52px] px-3 text-base border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)]"
                              />
                            </div>
                            <div>
                              <label className="font-semibold text-[var(--color-text-soft)] block mb-1.5 text-sm">Modell</label>
                              <input
                                type="text"
                                placeholder="t.ex. Series 5000"
                                value={editingItem.model || ""}
                                onChange={(e) => setEditingItem({ ...editingItem, model: e.target.value })}
                                className="w-full min-h-[52px] px-3 text-base border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)]"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="font-semibold text-[var(--color-text-soft)] block mb-1.5 text-sm">Inköpsbutik</label>
                              <input
                                type="text"
                                placeholder="t.ex. Elgiganten"
                                value={editingItem.purchase_store || ""}
                                onChange={(e) => setEditingItem({ ...editingItem, purchase_store: e.target.value })}
                                className="w-full min-h-[52px] px-3 text-base border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)]"
                              />
                            </div>
                            <div>
                              <label className="font-semibold text-[var(--color-text-soft)] block mb-1.5 text-sm">Serienummer / PNC</label>
                              <input
                                type="text"
                                placeholder="t.ex. 916 098 765"
                                value={editingItem.serial_number || ""}
                                onChange={(e) => setEditingItem({ ...editingItem, serial_number: e.target.value })}
                                className="w-full min-h-[52px] px-3 text-base font-mono border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)]"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="font-semibold text-[var(--color-text-soft)] block mb-1.5 text-sm">Egna anteckningar</label>
                            <textarea
                              rows={2}
                              placeholder="t.ex. Tillbehör, placering i skåp, kvitto i pärm..."
                              value={editingItem.notes || ""}
                              onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                              className="w-full p-3 text-base border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {requiresManualOrCare(editingItem) && (
                  <div className="bg-[var(--color-surface)] p-4 rounded-3xl border border-[var(--color-border)] shadow-card space-y-3">
                    <div className="flex items-center gap-2 text-base font-bold text-[var(--color-text)]">
                      <Wrench className="w-5 h-5 text-[var(--color-primary)]" />
                      <span>Skötsel & Manual</span>
                    </div>
                    <p className="text-[14px] text-[var(--color-text-soft)] leading-relaxed">
                      Underhållstips och bruksanvisning för ditt <strong>{editingItem.title}</strong> ({editingItem.brand || "Märke saknas"}).
                    </p>

                    <div className="space-y-2 pt-1">
                      <a
                        href={`https://www.google.com/search?q=manual+pdf+bruksanvisning+${encodeURIComponent(editingItem.brand || "")}+${encodeURIComponent(editingItem.model || editingItem.title)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="min-h-[52px] px-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] font-bold text-sm flex items-center justify-between text-[var(--color-text)] hover:bg-[var(--color-primary-soft)] transition"
                      >
                        <span className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-[var(--color-primary)]" />
                          <span>Hitta officiell bruksanvisning (PDF)</span>
                        </span>
                        <ExternalLink className="w-4 h-4 opacity-60" />
                      </a>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenListingModal(editingItem)}
                  className="min-h-[56px] w-full rounded-2xl bg-[var(--color-primary-soft)] border border-[var(--color-primary)] font-bold text-base flex items-center justify-center gap-2.5 text-[var(--color-primary)] shadow-card active:scale-[.98] transition"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>Sälj föremål (Blocket / Marketplace / Tradera)</span>
                </button>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="min-h-[56px] w-full rounded-2xl bg-[var(--color-primary)] text-white font-bold text-base flex items-center justify-center gap-2 shadow-sm transition active:scale-[.98]"
                  >
                    {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Spara ändringar</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setItemToArchive(editingItem)}
                    className="min-h-[52px] w-full rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] font-bold text-base flex items-center justify-center gap-2 text-[var(--color-text)] hover:bg-[var(--color-primary-soft)] transition"
                  >
                    <Archive className="w-4 h-4 text-[var(--color-primary)]" />
                    <span>Arkivera / Markera som sålt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setItemToDelete(editingItem)}
                    className="min-h-[48px] w-full text-[var(--color-text-soft)] text-base font-semibold hover:text-rose-600 transition"
                  >
                    Radera permanent
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>

        {/* SPAR-BEKRÄFTELSE MODAL (DOPAMINKORTET) */}
        {savedSuccessInfo && (
          <div 
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
          >
            <div 
              className="bg-[var(--color-surface)] rounded-t-[32px] sm:rounded-3xl p-6 w-full max-w-[440px] border border-[var(--color-border)] space-y-5 shadow-2xl text-center animate-in slide-in-from-bottom"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success-text)] flex items-center justify-center mx-auto text-3xl font-black shadow-xs">
                ✓
              </div>

              <div className="space-y-1">
                <span className="text-sm font-bold text-[var(--color-primary)] uppercase tracking-wider block">
                  Sparat i {savedSuccessInfo.room} {getRoomEmoji(savedSuccessInfo.room)}
                </span>
                <h2 className="text-3xl font-black text-[var(--color-text)]">
                  +{savedSuccessInfo.totalAddedSek.toLocaleString("sv-SE")} kr
                </h2>
                <p className="text-base text-[var(--color-text-soft)] leading-relaxed">
                  {savedSuccessInfo.count === 1 
                    ? "Föremålet har lagts till och säkrats i ditt valv." 
                    : `${savedSuccessInfo.count} föremål har lagts till och säkrats i ditt valv.`}
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const room = savedSuccessInfo.room;
                    setSavedSuccessInfo(null);
                    setActiveRoom(room);
                    cameraInputRef.current?.click();
                  }}
                  className="min-h-[56px] w-full rounded-2xl bg-[var(--color-primary)] text-white font-bold text-base flex items-center justify-center gap-2 shadow-sm transition active:scale-[.98]"
                >
                  <Camera className="w-5 h-5" />
                  <span>Fota nästa i {savedSuccessInfo.room}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const room = savedSuccessInfo.room;
                    setSavedSuccessInfo(null);
                    setSelectedRoomFilter(room);
                    setCurrentNav("rooms");
                  }}
                  className="min-h-[52px] w-full rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] font-bold text-base flex items-center justify-center gap-2 hover:bg-[var(--color-bg)] transition active:scale-[.98]"
                >
                  <span>Se föremålen i Valvet</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSavedSuccessInfo(null);
                    setCurrentNav("home");
                  }}
                  className="min-h-[44px] w-full text-[var(--color-text-soft)] font-semibold text-base hover:text-[var(--color-text)] transition"
                >
                  Klar (Gå till översikten)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BOTTENNAVIGERING */}
        {!showRoomPickerScreen && !isAnalyzing && !result && multiResults.length === 0 && !editingItem && !showArchiveHub && (
          <nav className="fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-[480px] md:border-x z-40 bg-[var(--color-surface)] border-t border-[var(--color-border)] h-[70px] flex items-center justify-around px-2 shadow-sm">
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

              {/* FLIK 2: VALVET (FÖRE DETTA "RUM") */}
              <button
                type="button"
                onClick={() => setCurrentNav("rooms")}
                className={`flex-1 min-h-[56px] flex flex-col items-center justify-center gap-0.5 border-0 bg-none cursor-pointer ${
                  currentNav === "rooms" ? "text-[var(--color-primary)] font-bold" : "text-[var(--color-text-soft)]"
                }`}
              >
                <LayoutGrid className="w-6 h-6" />
                <span className="text-[13px]">Valvet</span>
              </button>

              <div className="w-[76px] relative flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAddActionSheet(true)}
                  className="absolute -top-7 w-[62px] h-[62px] rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center border-4 border-[var(--color-bg)] shadow-[0_8px_20px_rgba(224,83,58,0.4)] active:scale-95 transition"
                  aria-label="Lägg till föremål"
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
                <span className="text-[11px] font-medium leading-tight text-center">Försäkring & garanti</span>
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

        {/* MODALER (EXPORT, PROFIL, MM) */}
        {showExportModal && (
          <div 
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
            onClick={() => setShowExportModal(false)}
          >
            <div 
              className="bg-[var(--color-surface)] rounded-t-[32px] sm:rounded-3xl p-6 w-full max-w-[460px] border border-[var(--color-border)] space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] flex items-center justify-center font-bold">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-[19px] font-extrabold text-[var(--color-text)]">
                      Spara eller dela förteckning
                    </h2>
                    <span className="text-xs text-[var(--color-text-soft)] block">
                      Välj hur du vill ta ut dina inventarier
                    </span>
                  </div>
                </div>
                <button onClick={() => setShowExportModal(false)} className="text-[var(--color-text-soft)] p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--color-text-soft)] block mb-1.5">
                  VILKA FÖREMÅL VILL DU HA MED?
                </label>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setExportRoomFilter("Alla")}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition ${
                      exportRoomFilter === "Alla"
                        ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                        : "bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)]"
                    }`}
                  >
                    Hela hemmet ({activeVaultItems.length})
                  </button>
                  {allRooms.map((r) => {
                    const rCount = activeVaultItems.filter((i) => i.room === r).length;
                    if (rCount === 0) return null;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setExportRoomFilter(r)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition ${
                          exportRoomFilter === r
                            ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                            : "bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)]"
                        }`}
                      >
                        {r} ({rCount})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const itemsToExport = exportRoomFilter === "Alla" 
                      ? activeVaultItems 
                      : activeVaultItems.filter((i) => i.room === exportRoomFilter);
                    const sumCost = itemsToExport.reduce((sum, i) => sum + (Number(i.estimated_replacement_cost_sek) || 0), 0);
                    
                    generateVaultPdf(
                      itemsToExport, 
                      displayName || sessionUser?.email || "Användare", 
                      sumCost, 
                      selectedProperty
                    );
                    setShowExportModal(false);
                    showToast("PDF-dokumentet har skapats ✓");
                  }}
                  className="w-full p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-primary)] text-left flex items-center justify-between group transition shadow-2xs"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-3xl">📄</span>
                    <div>
                      <b className="text-[16px] text-[var(--color-text)] block group-hover:text-[var(--color-primary)] transition">
                        Färdig PDF-rapport
                      </b>
                      <span className="text-xs text-[var(--color-text-soft)] leading-snug block">
                        Prydligt dokument med datumstämpel och värden. Perfekt att mejla till försäkringsbolaget eller skriva ut.
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[var(--color-text-soft)] opacity-40 group-hover:opacity-100 transition flex-shrink-0 ml-2" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const itemsToExport = exportRoomFilter === "Alla" 
                      ? activeVaultItems 
                      : activeVaultItems.filter((i) => i.room === exportRoomFilter);
                    
                    exportToCsv(
                      itemsToExport, 
                      `BoValvet-${selectedProperty?.name || "Hemmet"}-${exportRoomFilter}.csv`
                    );
                    setShowExportModal(false);
                    showToast("Kalkylarket har laddats ner ✓");
                  }}
                  className="w-full p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-primary)] text-left flex items-center justify-between group transition shadow-2xs"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-3xl">📊</span>
                    <div>
                      <b className="text-[16px] text-[var(--color-text)] block group-hover:text-[var(--color-primary)] transition">
                        Kalkylark (Excel / Numbers)
                      </b>
                      <span className="text-xs text-[var(--color-text-soft)] leading-snug block">
                        En överskådlig tabell för dig som vill spara en lista på datorn eller arbeta vidare i Excel.
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[var(--color-text-soft)] opacity-40 group-hover:opacity-100 transition flex-shrink-0 ml-2" />
                </button>
              </div>

              <p className="text-[11px] text-[var(--color-text-soft)] text-center leading-relaxed">
                Allt skapas tryggt och direkt i din webbläsare.
              </p>
            </div>
          </div>
        )}

        {showProfileModal && (
          <div 
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
            onClick={() => setShowProfileModal(false)}
          >
            <div 
              className="bg-[var(--color-surface)] rounded-t-[32px] sm:rounded-3xl p-6 w-full max-w-[480px] border border-[var(--color-border)] space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-extrabold flex items-center justify-center text-lg">
                    {avatarLetter}
                  </div>
                  <div>
                    <h2 className="text-[18px] font-extrabold text-[var(--color-text)]">
                      {displayName || "Min Profil"}
                    </h2>
                    <span className="text-xs text-[var(--color-text-soft)] block">
                      {sessionUser?.email || "Inloggad"}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setShowProfileModal(false)}
                  className="p-2 rounded-full hover:bg-[var(--color-border)] text-[var(--color-text-soft)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveDisplayName} className="space-y-2 p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                <label className="text-xs font-semibold text-[var(--color-text-soft)] block">Ditt namn i appen</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Förnamn och efternamn"
                    value={displayNameInput}
                    onChange={(e) => setDisplayNameInput(e.target.value)}
                    className="flex-1 min-h-[46px] px-3.5 text-base border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)] font-semibold"
                  />
                  <button
                    type="submit"
                    disabled={isUpdatingName}
                    className="min-h-[46px] px-4 rounded-xl bg-[var(--color-primary)] text-white font-bold text-sm flex items-center justify-center shadow-2xs"
                  >
                    {isUpdatingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Spara</span>}
                  </button>
                </div>
                <span className="text-xs text-[var(--color-text-soft)] block">Detta namn visas i hälsningen på startsidan och i rapporter.</span>
              </form>

              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  setPropertyFormData(selectedProperty || {});
                  setShowPropertyModal(true);
                }}
                className="min-h-[56px] w-full px-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] font-bold text-base flex items-center justify-between text-[var(--color-text)] hover:bg-[var(--color-primary-soft)] transition"
              >
                <span className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-[var(--color-primary)]" />
                  <span>Mina bostäder ({selectedProperty?.name})</span>
                </span>
                <ChevronRight className="w-5 h-5 text-[var(--color-text-soft)]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  setShowArchiveHub(true);
                }}
                className="min-h-[56px] w-full px-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] font-bold text-base flex items-center justify-between text-[var(--color-text)] hover:bg-[var(--color-primary-soft)] transition"
              >
                <span className="flex items-center gap-3">
                  <Archive className="w-5 h-5 text-[var(--color-primary)]" />
                  <span>Arkiv & sålda föremål ({archivedVaultItems.length})</span>
                </span>
                <ChevronRight className="w-5 h-5 text-[var(--color-text-soft)]" />
              </button>

              {sessionUser && (
                <div className="pt-2 border-t border-[var(--color-border)]">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="min-h-[52px] w-full rounded-2xl bg-rose-50 text-rose-700 font-bold text-base flex items-center justify-center gap-2 border border-rose-200 hover:bg-rose-100 transition"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logga ut</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {itemToArchive && (
          <div 
            className="fixed inset-0 z-60 bg-black/45 flex items-end animate-in fade-in"
            onClick={() => setItemToArchive(null)}
          >
            <div 
              className="w-full max-w-[480px] mx-auto bg-[var(--color-surface)] rounded-t-[28px] p-5 pb-8 space-y-4 animate-in slide-in-from-bottom"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-11 h-1.5 bg-[var(--color-border)] rounded-full mx-auto mb-2" />
              <h2 className="text-[20px] font-extrabold text-[var(--color-text)]">
                Arkivera {itemToArchive.title}
              </h2>
              <p className="text-[15px] text-[var(--color-text-soft)]">
                Föremålet tas bort från ditt aktiva hemvärde, men du behåller kvitton och garanti tryggt i arkivet.
              </p>

              <div>
                <label className="text-xs font-semibold text-[var(--color-text-soft)] block mb-1">Vad hände med föremålet?</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Såld", "Bortskänkt", "Kasserad"].map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setArchiveReasonInput(reason)}
                      className={`min-h-[44px] rounded-xl font-bold text-sm border transition ${
                        archiveReasonInput === reason 
                          ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]" 
                          : "bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)]"
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleArchiveItem}
                  className="min-h-[52px] w-full rounded-2xl bg-[var(--color-primary)] text-white font-bold text-base flex items-center justify-center gap-2"
                >
                  <span>Spara till Arkivet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setItemToArchive(null)}
                  className="min-h-[52px] w-full rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] font-bold text-base"
                >
                  Avbryt
                </button>
              </div>
            </div>
          </div>
        )}

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
                Radera {itemToDelete.title} permanent?
              </h2>
              <p className="text-[16px] text-[var(--color-text-soft)]">
                Det går inte att ångra. Både föremålet och alla sparade kvitton raderas helt från valvet.
              </p>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="min-h-[52px] w-full rounded-2xl bg-[var(--color-danger)] text-white font-bold text-base flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Radera permanent</span>}
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
              <h2 className="text-[20px] font-extrabold text-[var(--color-text)]">Lägg till föremål</h2>

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
                    <span className="text-[15px] opacity-90">Hittar enskilda eller flera föremål i samma bild</span>
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
            </div>
          </div>
        )}

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

        {toastMessage && (
          <div className="fixed left-5 right-5 bottom-28 max-w-[440px] mx-auto bg-[var(--color-text)] text-[var(--color-bg)] rounded-2xl p-4 font-semibold text-base z-50 shadow-lg animate-in slide-in-from-bottom">
            {toastMessage}
          </div>
        )}

        {listingModalItem && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
            <div className="bg-[var(--color-surface)] rounded-t-[32px] sm:rounded-3xl p-5 w-full max-w-[440px] border border-[var(--color-border)] space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom">
              
              <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-[var(--color-primary-soft)] overflow-hidden flex-shrink-0 flex items-center justify-center text-xl border border-[var(--color-border)]">
                    {listingModalItem.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={listingModalItem.imageUrl} alt={listingModalItem.title} className="w-full h-full object-cover" />
                    ) : (
                      <span>{getRoomEmoji(listingModalItem.room)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <b className="text-base text-[var(--color-text)] block truncate">{listingModalItem.title}</b>
                    <span className="text-xs text-[var(--color-text-soft)] block">Välj var du vill sälja</span>
                  </div>
                </div>
                <button onClick={() => setListingModalItem(null)} className="p-2 text-[var(--color-text-soft)]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isGeneratingListing && (
                <div className="py-12 text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--color-primary)]" />
                  <p className="text-base font-bold text-[var(--color-text)]">AI formulerar säljande annonstext...</p>
                  <span className="text-xs text-[var(--color-text-soft)]">Analyserar skick, märke och optimerar priser.</span>
                </div>
              )}

              {!isGeneratingListing && listingData && (
                <div className="space-y-4 text-base">
                  
                  <div className="grid grid-cols-3 gap-1.5 bg-[var(--color-bg)] p-1 rounded-2xl border border-[var(--color-border)]">
                    <button
                      type="button"
                      onClick={() => setActiveListingTab("blocket")}
                      className={`py-2 px-1 rounded-xl font-bold text-xs flex flex-col items-center gap-0.5 transition ${
                        activeListingTab === "blocket" 
                          ? "bg-[var(--color-surface)] text-rose-600 shadow-xs border border-[var(--color-border)]" 
                          : "text-[var(--color-text-soft)] opacity-70"
                      }`}
                    >
                      <span className="font-black text-sm">Blocket</span>
                      <span className="text-[10px] font-medium">Populärast</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveListingTab("marketplace")}
                      className={`py-2 px-1 rounded-xl font-bold text-xs flex flex-col items-center gap-0.5 transition ${
                        activeListingTab === "marketplace" 
                          ? "bg-[var(--color-surface)] text-blue-600 shadow-xs border border-[var(--color-border)]" 
                          : "text-[var(--color-text-soft)] opacity-70"
                      }`}
                    >
                      <span className="font-black text-sm">Marketplace</span>
                      <span className="text-[10px] font-medium">Lokalt & snabbt</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveListingTab("tradera")}
                      className={`py-2 px-1 rounded-xl font-bold text-xs flex flex-col items-center gap-0.5 transition ${
                        activeListingTab === "tradera" 
                          ? "bg-[var(--color-surface)] text-amber-600 shadow-xs border border-[var(--color-border)]" 
                          : "text-[var(--color-text-soft)] opacity-70"
                      }`}
                    >
                      <span className="font-black text-sm">Tradera</span>
                      <span className="text-[10px] font-medium">Auktion</span>
                    </button>
                  </div>

                  <div className="bg-[var(--color-surface)] p-3.5 rounded-2xl border border-[var(--color-border)] flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[var(--color-text-soft)] block font-semibold">
                        {activeListingTab === "tradera" ? "Föreslaget startbud" : "Rekommenderat säljpris"}
                      </span>
                      <b className="text-2xl font-black text-[var(--color-text)]">
                        {activeListingTab === "tradera" 
                          ? `${listingData.tradera_start_bid_sek || 49} kr` 
                          : `${listingData.suggested_price_sek || listingModalItem.market_value_sek} kr`}
                      </b>
                    </div>
                    <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                      Baserat på skick: {listingModalItem.condition}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleLaunchPlatform(activeListingTab)}
                      className="min-h-[58px] w-full rounded-2xl bg-[var(--color-primary)] text-white font-extrabold text-[17px] flex items-center justify-center gap-2.5 shadow-md active:scale-[.98] transition"
                    >
                      <span>
                        {activeListingTab === "blocket" && "🚀 Skapa annons på Blocket"}
                        {activeListingTab === "marketplace" && "👥 Skapa på Facebook Marketplace"}
                        {activeListingTab === "tradera" && "🔨 Skapa annons på Tradera"}
                      </span>
                    </button>

                    <div className="p-3 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] text-xs text-[var(--color-text-soft)] space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>Den utskurna närbilden sparas i telefonens album</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>Komplett annonstext kopieras till urklipp</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>
                          {activeListingTab === "blocket" && "Blocket öppnas – välj Torget och klistra in!"}
                          {activeListingTab === "marketplace" && "Marketplace öppnas direkt i annonsläget – klistra in!"}
                          {activeListingTab === "tradera" && "Tradera öppnas direkt i auktionsskapare – klistra in!"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--color-border)] space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-semibold text-[var(--color-text-soft)]">
                        <span>Rubrik</span>
                        <button 
                          onClick={() => copyToClipboard(activeListingTab === "tradera" ? listingData.tradera_title : listingData.blocket_title, "titel")} 
                          className="text-[var(--color-primary)] font-bold hover:underline"
                        >
                          {copiedText === "titel" ? "Kopierad!" : "Kopiera rubrik"}
                        </button>
                      </div>
                      <div className="p-3 rounded-xl bg-[var(--color-bg)] font-semibold text-sm border border-[var(--color-border)]">
                        {activeListingTab === "tradera" ? listingData.tradera_title : listingData.blocket_title}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-semibold text-[var(--color-text-soft)]">
                        <span>Beskrivning</span>
                        <button 
                          onClick={() => copyToClipboard(activeListingTab === "tradera" ? listingData.tradera_body : listingData.blocket_body, "body")} 
                          className="text-[var(--color-primary)] font-bold hover:underline"
                        >
                          {copiedText === "body" ? "Kopierad!" : "Kopiera text"}
                        </button>
                      </div>
                      <div className="p-3 rounded-xl bg-[var(--color-bg)] font-medium text-xs max-h-36 overflow-y-auto whitespace-pre-line border border-[var(--color-border)] leading-relaxed text-[var(--color-text)]">
                        {activeListingTab === "tradera" ? listingData.tradera_body : listingData.blocket_body}
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </div>
          </div>
        )}

        {showIncidentModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-[var(--color-surface)] rounded-3xl p-5 w-full max-w-sm border border-[var(--color-border)] space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center">
                <b className="text-base text-[var(--color-text)]">Skapa Skadeanmälan</b>
                <button onClick={() => setShowIncidentModal(false)} className="text-[var(--color-text-soft)]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-base">
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-soft)] block mb-1">Typ av skada</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {INCIDENT_TYPES.map((t) => (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => setIncidentType(t.label)}
                        className={`p-2.5 rounded-xl border text-sm font-semibold text-left transition ${
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
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-surface)]" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-text-soft)] block mb-0.5">Polisnr</label>
                    <input 
                      type="text" 
                      placeholder="Valfritt" 
                      value={policeReportNumber} 
                      onChange={(e) => setPoliceReportNumber(e.target.value)} 
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-surface)]" 
                    />
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-[var(--color-text-soft)] block mb-1">Välj drabbat rum</span>
                  <div className="flex flex-wrap gap-1">
                    {allRooms.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleRoomItemsForIncident(r)}
                        className="text-sm px-3 py-1.5 rounded-lg border border-[var(--color-border)] font-semibold"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 border border-[var(--color-border)] rounded-xl p-1 bg-[var(--color-bg)]">
                  {activeVaultItems.map((item) => {
                    const isSelected = selectedIncidentItemIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleIncidentItem(item.id)}
                        className={`p-2.5 rounded-lg cursor-pointer flex items-center gap-2 text-sm ${isSelected ? "bg-[var(--color-surface)] font-bold shadow-2xs" : "opacity-60"}`}
                      >
                        {isSelected ? <CheckSquare className="w-4 h-4 text-rose-600" /> : <Square className="w-4 h-4 opacity-40" />}
                        <span className="truncate">{item.title} ({Number(item.estimated_replacement_cost_sek).toLocaleString("sv-SE")} kr)</span>
                      </div>
                    );
                  })}
                </div>

                <div className="font-bold text-base">
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

        {showManualModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-[var(--color-surface)] rounded-3xl p-5 w-full max-w-sm border border-[var(--color-border)] space-y-3">
              <div className="flex justify-between items-center">
                <b className="text-base text-[var(--color-text)]">Lägg till själv</b>
                <button onClick={() => setShowManualModal(false)} className="text-[var(--color-text-soft)]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveManualItem} className="space-y-3 text-base">
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-soft)] block mb-0.5">Benämning</label>
                  <input
                    type="text"
                    required
                    placeholder="t.ex. Vinterkappa ull, Guldring 18k"
                    value={manualFormData.title || ""}
                    onChange={(e) => setManualFormData({ ...manualFormData, title: e.target.value })}
                    className="w-full min-h-[48px] px-3.5 border border-[var(--color-border)] rounded-xl font-medium bg-[var(--color-surface)] text-base"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-text-soft)] block mb-0.5">Rum</label>
                    <select
                      value={manualFormData.room || activeRoom}
                      onChange={(e) => setManualFormData({ ...manualFormData, room: e.target.value })}
                      className="w-full min-h-[48px] px-3 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-base"
                    >
                      {allRooms.map((r) => <option key={r} value={r}>{r}</option>)}
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
                      className="w-full min-h-[48px] px-3 border border-[var(--color-border)] rounded-xl font-bold bg-[var(--color-surface)] text-base"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingManual}
                  className="min-h-[52px] w-full rounded-2xl bg-[var(--color-primary)] text-white font-bold text-base flex items-center justify-center gap-2 shadow-sm"
                >
                  {isSavingManual ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Spara föremål</span>}
                </button>
              </form>
            </div>
          </div>
        )}

        {showPropertyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
            <div className="bg-[var(--color-surface)] rounded-3xl p-5 w-full max-w-sm shadow-2xl border border-[var(--color-border)] space-y-4 my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-1 border-b border-[var(--color-border)]">
                <h3 className="font-bold text-base text-[var(--color-text)] flex items-center space-x-1.5">
                  <Building2 className="w-4 h-4 text-[var(--color-primary)]" />
                  <span>{isEditingProperty ? "Redigera bostad" : "Mina Bostäder"}</span>
                </h3>
                <button onClick={() => { setShowPropertyModal(false); setIsEditingProperty(false); }} className="text-[var(--color-text-soft)]">
                  <X className="w-5 h-5" />
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
                        className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                          selectedProperty?.id === p.id ? "bg-[var(--color-primary-soft)] border-[var(--color-primary)]" : "bg-[var(--color-bg)] border-[var(--color-border)]"
                        }`}
                      >
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <h4 className="font-bold text-sm text-[var(--color-text)]">{p.name}</h4>
                            {p.living_area_sqm && <span className="text-xs bg-[var(--color-surface)] text-[var(--color-text-soft)] px-2 py-0.5 rounded font-medium">{p.living_area_sqm} m²</span>}
                          </div>
                          <p className="text-xs text-[var(--color-text-soft)] mt-0.5">{p.property_type} • {p.insurance_company || "Försäkringsbolag"}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPropertyFormData(p);
                            setIsEditingProperty(true);
                          }}
                          className="text-xs text-[var(--color-primary)] font-bold px-2.5 py-1.5 rounded hover:bg-[var(--color-primary-soft)]"
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
                    className="w-full py-3 border border-dashed border-[var(--color-border)] text-[var(--color-primary)] rounded-xl text-sm font-bold hover:bg-[var(--color-primary-soft)] transition"
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
                  className="space-y-3 text-sm"
                >
                  <div>
                    <label className="font-semibold text-[var(--color-text-soft)] block mb-1 text-xs">Bostadens namn</label>
                    <input
                      type="text"
                      required
                      value={propertyFormData.name || ""}
                      onChange={(e) => setPropertyFormData({ ...propertyFormData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)] text-base"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-semibold text-[var(--color-text-soft)] block mb-1 text-xs">Typ</label>
                      <select
                        value={propertyFormData.property_type || "Bostadsrätt"}
                        onChange={(e) => setPropertyFormData({ ...propertyFormData, property_type: e.target.value })}
                        className="w-full px-2 py-2 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)] text-base"
                      >
                        <option value="Bostadsrätt">Bostadsrätt</option>
                        <option value="Villa / Småhus">Villa</option>
                        <option value="Hyresrätt">Hyresrätt</option>
                        <option value="Fritidshus">Fritidshus</option>
                        <option value="Externt förråd">Förråd</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold text-[var(--color-text-soft)] block mb-1 text-xs">Boyta (kvm)</label>
                      <input
                        type="number"
                        value={propertyFormData.living_area_sqm || ""}
                        onChange={(e) => setPropertyFormData({ ...propertyFormData, living_area_sqm: Number(e.target.value) })}
                        className="w-full px-2 py-2 border border-[var(--color-border)] rounded-xl font-bold bg-[var(--color-surface)] text-[var(--color-text)] text-base"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-semibold text-[var(--color-text-soft)] block mb-1 text-xs">Lösörestak (SEK)</label>
                      <input
                        type="number"
                        value={propertyFormData.coverage_limit_sek || 1000000}
                        onChange={(e) => setPropertyFormData({ ...propertyFormData, coverage_limit_sek: Number(e.target.value) })}
                        className="w-full px-2 py-2 border border-[var(--color-border)] rounded-xl font-bold bg-[var(--color-surface)] text-[var(--color-text)] text-base"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-[var(--color-text-soft)] block mb-1 text-xs">Bolag</label>
                      <input
                        type="text"
                        placeholder="t.ex. Folksam"
                        value={propertyFormData.insurance_company || ""}
                        onChange={(e) => setPropertyFormData({ ...propertyFormData, insurance_company: e.target.value })}
                        className="w-full px-2 py-2 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)] text-base"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex space-x-2">
                    <button type="submit" disabled={isSavingProperty} className="flex-1 py-3 bg-[var(--color-primary)] text-white rounded-xl font-bold text-sm">
                      {isSavingProperty ? "Sparar..." : "Spara"}
                    </button>
                    <button type="button" onClick={() => setIsEditingProperty(false)} className="px-4 py-3 bg-[var(--color-border)] text-[var(--color-text)] rounded-xl text-sm font-semibold">
                      Tillbaka
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {showAuthModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[var(--color-surface)] rounded-3xl p-6 w-full max-w-sm border border-[var(--color-border)] space-y-4 shadow-xl">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] flex items-center justify-center mx-auto font-black text-lg">
                  BV
                </div>
                <h3 className="text-lg font-bold text-[var(--color-text)]">
                  {authIsSignUp ? "Säkra ditt hem med BoValvet" : "Logga in"}
                </h3>
                <p className="text-sm text-[var(--color-text-soft)]">
                  Dina inventarier krypteras och sparas tryggt i ditt valv.
                </p>
              </div>

              {authError && (
                <div className="bg-rose-50 text-rose-800 p-2.5 rounded-xl text-sm">
                  {authError}
                </div>
              )}

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSocialLogin("google")}
                  disabled={Boolean(socialLoading) || authLoading}
                  className="min-h-[46px] w-full rounded-xl bg-white text-stone-800 font-bold text-sm border border-[var(--color-border)] flex items-center justify-center gap-2.5 shadow-2xs hover:bg-stone-50 transition active:scale-[.98] disabled:opacity-50"
                >
                  {socialLoading === "google" ? (
                    <Loader2 className="w-4 h-4 animate-spin text-stone-600" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                    </svg>
                  )}
                  <span>Fortsätt med Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialLogin("facebook")}
                  disabled={Boolean(socialLoading) || authLoading}
                  className="min-h-[46px] w-full rounded-xl bg-[#1877F2] text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-2xs hover:bg-[#166fe5] transition active:scale-[.98] disabled:opacity-50"
                >
                  {socialLoading === "facebook" ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  )}
                  <span>Fortsätt med Facebook</span>
                </button>
              </div>

              <div className="flex items-center gap-3 my-2 text-xs text-[var(--color-text-soft)]">
                <div className="h-px bg-[var(--color-border)] flex-1" />
                <span>eller med e-post</span>
                <div className="h-px bg-[var(--color-border)] flex-1" />
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-3">
                <input
                  type="email"
                  required
                  placeholder="din.epost@exempel.se"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full min-h-[46px] px-3.5 border border-[var(--color-border)] rounded-xl text-base bg-[var(--color-surface)] text-[var(--color-text)]"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Lösenord"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full min-h-[46px] px-3.5 border border-[var(--color-border)] rounded-xl text-base bg-[var(--color-surface)] text-[var(--color-text)]"
                />
                <button
                  type="submit"
                  disabled={authLoading || Boolean(socialLoading)}
                  className="min-h-[50px] w-full rounded-2xl bg-[var(--color-primary)] text-white font-bold text-base flex items-center justify-center gap-2"
                >
                  {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>{authIsSignUp ? "Skapa konto & Säkra föremål" : "Logga in"}</span>}
                </button>
              </form>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => authIsSignUp ? setAuthIsSignUp(false) : setAuthIsSignUp(true)}
                  className="text-sm text-[var(--color-primary)] font-bold hover:underline"
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