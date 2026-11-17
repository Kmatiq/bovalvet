import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  Plus, 
  Trash2, 
  Layers, 
  MapPin, 
  DollarSign, 
  AlertCircle,
  HelpCircle,
  MousePointerClick,
  Scan,
  RefreshCw,
  Edit2,
  ChevronDown,
  Info
} from 'lucide-react';
import { DetectedImageItem, InventoryItem, ItemCategory, ItemCondition } from '../../types';
import { CATEGORIES_LIST, ROOMS_LIST } from '../../data/sampleItems';

interface MobileMultiItemSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  activeRoom?: string;
  onImportItems: (items: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
}

export const MobileMultiItemSelector: React.FC<MobileMultiItemSelectorProps> = ({
  isOpen,
  onClose,
  imageUrl,
  activeRoom = 'Vardagsrum',
  onImportItems,
}) => {
  const [items, setItems] = useState<DetectedImageItem[]>([]);
  const [selectedRoom, setSelectedRoom] = useState(
    activeRoom && activeRoom !== 'Alla rum' ? activeRoom : 'Vardagsrum'
  );
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [isIdentifyingPoint, setIsIdentifyingPoint] = useState(false);
  const [activeMode, setActiveMode] = useState<'tap' | 'view'>('tap');
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hasAutoScanned, setHasAutoScanned] = useState(false);

  const imageContainerRef = useRef<HTMLDivElement>(null);

  // When opened with an image, auto-detect objects if not already scanned
  useEffect(() => {
    if (isOpen && imageUrl && !hasAutoScanned) {
      handleAutoDetect();
      setHasAutoScanned(true);
    }
    if (!isOpen) {
      setHasAutoScanned(false);
      setItems([]);
      setEditingItemId(null);
    }
  }, [isOpen, imageUrl]);

  useEffect(() => {
    if (activeRoom && activeRoom !== 'Alla rum') {
      setSelectedRoom(activeRoom);
    }
  }, [activeRoom]);

  // Auto detect multiple items in the photo via Gemini API
  const handleAutoDetect = async () => {
    if (!imageUrl) return;
    setIsAutoDetecting(true);
    setStatusMessage('Letar efter alla föremål och möbler i bilden...');

    try {
      const res = await fetch('/api/detect-multiple-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageUrl,
          suggestedRoom: selectedRoom,
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.detectedItems?.length > 0) {
        setItems(data.data.detectedItems);
        setStatusMessage(`Hittade ${data.data.detectedItems.length} föremål! Klicka på bilden för att lägga till fler, eller justera urvalet nedan.`);
      } else {
        setStatusMessage('Inga automatiska föremål hittades. Klicka direkt på bilden för att placera markörer.');
      }
    } catch (err) {
      console.warn('Auto-detect error:', err);
      setStatusMessage('Kunde inte nå servern. Klicka direkt på bilden för att placera markörer.');
    } finally {
      setIsAutoDetecting(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  // When user clicks or taps on the image to place a marker
  const handleImageClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (isAutoDetecting || isIdentifyingPoint || !imageContainerRef.current || !imageUrl) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let xPercent = Math.round((clickX / rect.width) * 100);
    let yPercent = Math.round((clickY / rect.height) * 100);

    // Clamp boundaries
    xPercent = Math.max(5, Math.min(95, xPercent));
    yPercent = Math.max(5, Math.min(95, yPercent));

    const tempId = `item-${Date.now()}`;
    const newPlaceholder: DetectedImageItem = {
      id: tempId,
      name: 'Identifierar...',
      category: 'Möbler & Inredning',
      suggestedRoom: selectedRoom,
      condition: 'Mycket bra',
      estimatedValueSEK: 1500,
      estimatedNewPriceSEK: 2500,
      description: 'Analyserar markerat område...',
      tags: [selectedRoom.toLowerCase()],
      xPercent,
      yPercent,
      widthPercent: 18,
      heightPercent: 18,
      confidence: 85,
      isSelected: true,
    };

    setItems((prev) => [...prev, newPlaceholder]);
    setIsIdentifyingPoint(true);
    setStatusMessage('Analyserar markerad punkt med AI...');

    try {
      const res = await fetch('/api/identify-region', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageUrl,
          xPercent,
          yPercent,
          suggestedRoom: selectedRoom,
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setItems((prev) =>
          prev.map((it) => (it.id === tempId ? { ...data.data, isSelected: true } : it))
        );
        setStatusMessage(`Identifierade: ${data.data.name} (~${data.data.estimatedValueSEK} kr)`);
      }
    } catch (err) {
      console.warn('Point identify error:', err);
      // Keep placeholder with editable generic name
      setItems((prev) =>
        prev.map((it) =>
          it.id === tempId ? { ...it, name: `Föremål vid (${xPercent}%, ${yPercent}%)` } : it
        )
      );
    } finally {
      setIsIdentifyingPoint(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Toggle selection of a specific item
  const toggleItemSelect = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, isSelected: !it.isSelected } : it))
    );
  };

  // Select all or unselect all
  const toggleSelectAll = () => {
    const allSelected = items.every((it) => it.isSelected);
    setItems((prev) => prev.map((it) => ({ ...it, isSelected: !allSelected })));
  };

  // Remove a marker
  const removeItem = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setItems((prev) => prev.filter((it) => it.id !== id));
    if (editingItemId === id) setEditingItemId(null);
  };

  // Update field of an item
  const updateItemField = (id: string, updates: Partial<DetectedImageItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...updates } : it))
    );
  };

  // Calculate totals
  const selectedItems = items.filter((it) => it.isSelected);
  const totalSelectedValue = selectedItems.reduce(
    (sum, it) => sum + (it.estimatedValueSEK || 0),
    0
  );

  // Confirm and import all selected items
  const handleConfirmImport = () => {
    if (selectedItems.length === 0) return;

    const formattedItems: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>[] = selectedItems.map(
      (it) => ({
        name: it.name || 'Heminventarie',
        category: it.category || 'Möbler & Inredning',
        room: it.suggestedRoom || selectedRoom,
        condition: it.condition || 'Mycket bra',
        quantity: it.quantity || 1,
        estimatedValue: Number(it.estimatedValueSEK) || 1000,
        purchasePriceEstimated: Number(it.estimatedNewPriceSEK) || Math.round((Number(it.estimatedValueSEK) || 1000) * 1.5),
        description: it.description || `${it.name} i ${it.suggestedRoom || selectedRoom}. Inläst via bildigenkänning.`,
        imageUrl: imageUrl || '',
        brand: it.brand && it.brand !== 'Okänt' ? it.brand : undefined,
        model: it.model,
        tags: it.tags?.length > 0 ? it.tags : [it.category?.toLowerCase() || 'inredning', selectedRoom.toLowerCase()],
        confidenceScore: it.confidence || 90,
        aiNotes: `Inläst från flerföremåls-foto i ${selectedRoom}. Position: ca ${it.xPercent}%, ${it.yPercent}%.`,
      })
    );

    onImportItems(formattedItems);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      id="multi-item-selector-modal"
      className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-xl flex flex-col text-white overflow-hidden animate-fadeIn"
    >
      {/* 1. HEADER BAR */}
      <div className="relative z-20 px-4 py-3 border-b border-white/10 bg-stone-900/90 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="multi-item-close-btn"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white active:scale-95 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Markera & Välj föremål</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-400 font-semibold px-2 py-0.5 rounded-full border border-amber-500/30">
                Flera saker
              </span>
            </h2>
            <p className="text-[11px] text-stone-400">
              Klicka på bilden för att placera markörer eller låt AI hitta alla
            </p>
          </div>
        </div>

        {/* Room selector */}
        <div className="relative">
          <button
            type="button"
            id="multi-item-room-picker-btn"
            onClick={() => setShowRoomPicker(!showRoomPicker)}
            className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 border border-white/15 px-3 py-1.5 rounded-full text-xs font-semibold text-stone-200 active:scale-95 transition-all"
          >
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>{selectedRoom}</span>
            <ChevronDown className="w-3 h-3 text-stone-400" />
          </button>

          {showRoomPicker && (
            <div className="absolute right-0 top-10 w-48 bg-stone-900 border border-white/20 rounded-2xl p-1.5 shadow-2xl z-30 max-h-56 overflow-y-auto">
              {ROOMS_LIST.filter((r) => r !== 'Alla rum').map((room) => (
                <button
                  key={room}
                  type="button"
                  onClick={() => {
                    setSelectedRoom(room);
                    setShowRoomPicker(false);
                    // Also update items with default room
                    setItems((prev) =>
                      prev.map((it) => ({ ...it, suggestedRoom: room }))
                    );
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between ${
                    selectedRoom === room
                      ? 'bg-amber-500/20 text-amber-400 font-bold'
                      : 'text-stone-300 hover:bg-white/10'
                  }`}
                >
                  <span>{room}</span>
                  {selectedRoom === room && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. INTERACTIVE TOOLBAR */}
      <div className="px-4 py-2 bg-stone-900/60 border-b border-white/5 flex items-center justify-between text-xs overflow-x-auto gap-2">
        <div className="flex items-center gap-2">
          {/* Auto detect button */}
          <button
            type="button"
            id="multi-item-auto-detect-btn"
            onClick={handleAutoDetect}
            disabled={isAutoDetecting}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-all shadow-sm ${
              isAutoDetecting
                ? 'bg-amber-500/30 text-amber-300 cursor-wait'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 active:scale-95'
            }`}
          >
            {isAutoDetecting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{isAutoDetecting ? 'Analyserar...' : '🤖 Upptäck alla automatiskt'}</span>
          </button>

          {/* Mode indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-stone-300 bg-white/5 px-2.5 py-1 rounded-full text-[11px]">
            <MousePointerClick className="w-3.5 h-3.5 text-amber-400" />
            <span>Klicka på en pryl i fotot för att markera den</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {items.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-stone-400 hover:text-white px-2 py-1 text-[11px] underline"
            >
              {items.every((it) => it.isSelected) ? 'Avmarkera alla' : 'Markera alla'}
            </button>
          )}

          {items.length > 0 && (
            <button
              type="button"
              onClick={() => setItems([])}
              className="text-red-400 hover:text-red-300 px-2 py-1 text-[11px] flex items-center gap-1"
              title="Ta bort alla markörer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Rensa</span>
            </button>
          )}
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-200 flex items-center gap-2 animate-fadeIn">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="truncate">{statusMessage}</span>
        </div>
      )}

      {/* 3. MAIN SPLIT / WORKSPACE */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* IMAGE CANVAS CONTAINER */}
        <div className="flex-1 relative flex items-center justify-center p-3 sm:p-4 bg-stone-950 overflow-hidden select-none">
          
          <div 
            ref={imageContainerRef}
            onClick={handleImageClick}
            className="relative max-h-[50vh] md:max-h-[75vh] w-auto max-w-full rounded-2xl overflow-hidden shadow-2xl border border-white/20 cursor-crosshair group"
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Fotograferat rum"
                className="max-h-[50vh] md:max-h-[75vh] w-auto max-w-full object-contain pointer-events-none"
              />
            ) : (
              <div className="w-80 h-60 bg-stone-900 flex items-center justify-center text-stone-500 text-xs">
                Ingen bild vald
              </div>
            )}

            {/* Scanning radar line when auto-detecting */}
            {isAutoDetecting && (
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_#f59e0b] animate-bounce" />
            )}

            {/* Instructions overlay overlayed on image */}
            <div className="absolute bottom-2 left-2 right-2 flex justify-center pointer-events-none">
              <div className="bg-black/75 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-amber-200 border border-white/10 flex items-center gap-1.5 shadow-lg">
                <MousePointerClick className="w-3 h-3 text-amber-400" />
                <span>Klicka var som helst i bilden för att lägga till föremål</span>
              </div>
            </div>

            {/* RENDER INTERACTIVE MARKERS ON THE IMAGE */}
            {items.map((item, idx) => {
              const isSelected = item.isSelected;
              const isHovered = activeItemIndex === idx;

              return (
                <div
                  key={item.id}
                  style={{
                    left: `${item.xPercent}%`,
                    top: `${item.yPercent}%`,
                  }}
                  onClick={(e) => toggleItemSelect(item.id, e)}
                  onMouseEnter={() => setActiveItemIndex(idx)}
                  onMouseLeave={() => setActiveItemIndex(null)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 group/marker transition-transform"
                >
                  {/* Bounding area ring if width/height available */}
                  {item.widthPercent && item.heightPercent && (
                    <div
                      style={{
                        width: `${Math.max(40, item.widthPercent * 2.8)}px`,
                        height: `${Math.max(40, item.heightPercent * 2.2)}px`,
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-xl transition-all ${
                        isSelected
                          ? 'border-2 border-emerald-400/80 bg-emerald-500/15 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                          : 'border border-dashed border-white/40 bg-stone-900/30 opacity-60'
                      }`}
                    />
                  )}

                  {/* Pin button */}
                  <div
                    className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-2xl border text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-emerald-500 text-stone-950 border-white ring-2 ring-emerald-400 scale-105'
                        : 'bg-stone-900/90 text-stone-300 border-white/30 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {/* Checkbox icon */}
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        isSelected ? 'bg-stone-950 text-white' : 'border border-stone-400'
                      }`}
                    >
                      {isSelected ? <Check className="w-3 h-3 text-emerald-400" /> : idx + 1}
                    </div>

                    {/* Short item name label & price */}
                    <span className="max-w-[110px] truncate leading-tight">
                      {item.name}
                    </span>

                    <span className="text-[10px] opacity-90">
                      {Math.round(item.estimatedValueSEK || 0).toLocaleString('sv-SE')} kr
                    </span>

                    {/* Quick remove button */}
                    <button
                      type="button"
                      onClick={(e) => removeItem(item.id, e)}
                      className="ml-0.5 p-0.5 hover:text-red-400 rounded-full hover:bg-black/20"
                      title="Ta bort markör"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Pulse wave animation for newly added or selected */}
                  {isSelected && (
                    <span className="absolute -inset-1 rounded-full bg-emerald-400/30 animate-ping pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM / RIGHT DRAWER: LIST OF MARKED ITEMS */}
        <div className="w-full md:w-96 bg-stone-900/95 border-t md:border-t-0 md:border-l border-white/10 flex flex-col max-h-[45vh] md:max-h-full">
          
          {/* Drawer summary header */}
          <div className="px-4 py-3 bg-stone-900 border-b border-white/10 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Markerade föremål</span>
                <span className="bg-emerald-500/20 text-emerald-400 font-extrabold px-2 py-0.5 rounded-full text-[11px]">
                  {selectedItems.length} av {items.length} valda
                </span>
              </div>
              <div className="text-[11px] text-stone-400 mt-0.5">
                Totalt beräknat värde: <span className="font-bold text-amber-400">{totalSelectedValue.toLocaleString('sv-SE')} kr</span>
              </div>
            </div>

            {/* Quick add custom marker */}
            <button
              type="button"
              id="multi-item-add-manual-btn"
              onClick={() => {
                const newIt: DetectedImageItem = {
                  id: `manual-${Date.now()}`,
                  name: 'Nytt föremål',
                  category: 'Möbler & Inredning',
                  suggestedRoom: selectedRoom,
                  condition: 'Mycket bra',
                  estimatedValueSEK: 1500,
                  estimatedNewPriceSEK: 3000,
                  description: 'Manuellt tillagd i rummet',
                  tags: [selectedRoom.toLowerCase()],
                  xPercent: 50,
                  yPercent: 50,
                  widthPercent: 20,
                  heightPercent: 20,
                  confidence: 100,
                  isSelected: true,
                };
                setItems((prev) => [...prev, newIt]);
                setEditingItemId(newIt.id);
              }}
              className="text-[11px] font-bold bg-white/10 hover:bg-white/15 px-2.5 py-1.5 rounded-xl text-stone-200 flex items-center gap-1 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Lägg till</span>
            </button>
          </div>

          {/* Items scrollable list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {items.length === 0 ? (
              <div className="text-center py-8 px-4 text-stone-400">
                <Scan className="w-10 h-10 mx-auto text-stone-600 mb-2" />
                <p className="text-xs font-semibold text-stone-300">Inga föremål markerade ännu</p>
                <p className="text-[11px] text-stone-500 mt-1 max-w-xs mx-auto">
                  Tryck på <strong className="text-amber-400">"🤖 Upptäck alla automatiskt"</strong> ovan eller klicka direkt på bilden där du ser en pryl.
                </p>
              </div>
            ) : (
              items.map((item, idx) => {
                const isSelected = item.isSelected;
                const isEditing = editingItemId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-3 transition-all ${
                      isSelected
                        ? 'bg-stone-800/90 border-emerald-500/40 shadow-sm'
                        : 'bg-stone-900/50 border-white/5 opacity-60'
                    }`}
                  >
                    {/* Row header: Checkbox + Name + Price + Actions */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {/* Toggle checkbox */}
                        <button
                          type="button"
                          onClick={() => toggleItemSelect(item.id)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                            isSelected
                              ? 'bg-emerald-500 text-stone-950 ring-2 ring-emerald-400/40'
                              : 'border border-stone-600 text-stone-500 hover:border-stone-400'
                          }`}
                        >
                          {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                        </button>

                        {/* Title (editable or static) */}
                        {isEditing ? (
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItemField(item.id, { name: e.target.value })}
                            className="bg-stone-950 border border-amber-400/60 rounded-lg px-2 py-1 text-xs text-white font-bold w-full focus:outline-none"
                            placeholder="Föremålets namn"
                            autoFocus
                          />
                        ) : (
                          <div 
                            onClick={() => setEditingItemId(item.id)}
                            className="cursor-pointer group flex items-center gap-1.5 truncate"
                          >
                            <span className="text-xs font-bold text-white truncate">
                              {item.name}
                            </span>
                            <Edit2 className="w-3 h-3 text-stone-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </div>

                      {/* Estimated value badge & trash */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          {Math.round(item.estimatedValueSEK || 0).toLocaleString('sv-SE')} kr
                        </span>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-stone-500 hover:text-red-400 p-1"
                          title="Ta bort"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata pill row */}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5 text-[10px] text-stone-400">
                      {/* Category select */}
                      <select
                        value={item.category}
                        onChange={(e) => updateItemField(item.id, { category: e.target.value as ItemCategory })}
                        className="bg-stone-900 border border-white/10 rounded-md px-1.5 py-0.5 text-[10px] text-stone-300 focus:outline-none"
                      >
                        {CATEGORIES_LIST.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>

                      {/* Value edit field */}
                      <div className="flex items-center gap-1 bg-stone-900 border border-white/10 rounded-md px-1.5 py-0.5">
                        <span>Värde:</span>
                        <input
                          type="number"
                          value={item.estimatedValueSEK || ''}
                          onChange={(e) =>
                            updateItemField(item.id, {
                              estimatedValueSEK: Number(e.target.value) || 0,
                            })
                          }
                          className="w-14 bg-transparent text-white font-semibold text-[10px] focus:outline-none"
                        />
                        <span>kr</span>
                      </div>

                      {/* Done editing button */}
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => setEditingItemId(null)}
                          className="ml-auto text-amber-400 font-bold px-2 py-0.5 bg-amber-500/20 rounded"
                        >
                          Klar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* DRAWER FOOTER: CONFIRM IMPORT BUTTON */}
          <div className="p-3 bg-stone-900 border-t border-white/10 space-y-2">
            <button
              type="button"
              id="multi-item-confirm-import-btn"
              onClick={handleConfirmImport}
              disabled={selectedItems.length === 0}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xl ${
                selectedItems.length > 0
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-stone-950 active:scale-95 shadow-emerald-500/20 cursor-pointer'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>
                {selectedItems.length > 0
                  ? `Läs in ${selectedItems.length} markerade föremål (${totalSelectedValue.toLocaleString('sv-SE')} kr)`
                  : 'Välj minst ett föremål att läsa in'}
              </span>
            </button>

            <p className="text-[10px] text-center text-stone-400">
              Alla valda föremål sparas direkt till <strong className="text-stone-300">{selectedRoom}</strong> med uppskattat försäkringsvärde.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
