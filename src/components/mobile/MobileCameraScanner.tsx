import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  X, 
  Sparkles, 
  RefreshCw, 
  MapPin, 
  Zap, 
  HelpCircle,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { DEMO_PRESET_IMAGES, ROOMS_LIST } from '../../data/sampleItems';
import { compressAndResizeImage } from '../../utils/imageCompressor';

interface MobileCameraScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSelected: (
    imageBase64: string,
    mimeType: string,
    hint: string,
    room: string,
    speedMode?: 'turbo' | 'detailed'
  ) => void;
  onOpenMultiMarker?: (imageBase64: string, room: string) => void;
  activeRoom?: string;
}

export const MobileCameraScanner: React.FC<MobileCameraScannerProps> = ({
  isOpen,
  onClose,
  onImageSelected,
  onOpenMultiMarker,
  activeRoom = 'Vardagsrum',
}) => {
  const [selectedRoom, setSelectedRoom] = useState(
    activeRoom && activeRoom !== 'Alla rum' ? activeRoom : 'Vardagsrum'
  );
  const [speedMode, setSpeedMode] = useState<'turbo' | 'detailed'>('turbo');
  const [scanType, setScanType] = useState<'single' | 'multi'>('single');
  const [userHint, setUserHint] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [showHintInput, setShowHintInput] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeRoom && activeRoom !== 'Alla rum') {
      setSelectedRoom(activeRoom);
    }
  }, [activeRoom]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, cameraFacing]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Could not access live camera:', err);
      setIsCameraActive(false);
      setCameraError('Kameran är inte tillgänglig i denna vy. Du kan ladda upp ett foto eller välja ett snabbtest.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const toggleCameraFacing = () => {
    setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleFinalImage = (base64: string, mime: string = 'image/jpeg', hint: string = userHint) => {
    stopCamera();
    if (scanType === 'multi' && onOpenMultiMarker) {
      onOpenMultiMarker(base64, selectedRoom);
    } else {
      onImageSelected(base64, mime, hint, selectedRoom, speedMode);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    // Scale max dimension to 720px for ultra-rapid network payload & fast Gemini processing
    const maxDim = 720;
    let width = video.videoWidth || 720;
    let height = video.videoHeight || 720;
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);
      const base64 = canvas.toDataURL('image/jpeg', 0.72);
      handleFinalImage(base64, 'image/jpeg');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { base64, mimeType } = await compressAndResizeImage(file, 720, 720, 0.72);
        handleFinalImage(base64, mimeType);
      } catch (err) {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          handleFinalImage(base64, file.type || 'image/jpeg');
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const selectPreset = (preset: typeof DEMO_PRESET_IMAGES[0]) => {
    handleFinalImage(preset.url, 'image/jpeg', preset.hint);
  };

  if (!isOpen) return null;

  return (
    <div 
      id="mobile-camera-overlay"
      className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden animate-fadeIn"
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* 1. TOP BAR */}
      <div className="relative z-20 px-4 pt-4 pb-3 flex items-center justify-between text-white bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        {/* Close button */}
        <button
          type="button"
          id="scanner-close-btn"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-stone-900/80 backdrop-blur-md text-white flex items-center justify-center active:scale-90 transition-transform"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Room selector pill */}
        <div className="relative">
          <button
            type="button"
            id="scanner-room-pill-btn"
            onClick={() => setShowRoomPicker(!showRoomPicker)}
            className="flex items-center gap-1.5 bg-stone-900/80 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide text-white active:scale-95 transition-transform"
          >
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>{selectedRoom}</span>
            <ChevronDown className="w-3 h-3 text-stone-400" />
          </button>

          {/* Room dropdown menu */}
          {showRoomPicker && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-48 bg-stone-900/95 backdrop-blur-xl border border-white/20 rounded-2xl p-1.5 shadow-2xl z-30 max-h-56 overflow-y-auto">
              {ROOMS_LIST.filter(r => r !== 'Alla rum').map((room) => (
                <button
                  key={room}
                  type="button"
                  onClick={() => {
                    setSelectedRoom(room);
                    setShowRoomPicker(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                    selectedRoom === room
                      ? 'bg-amber-500/20 text-amber-400 font-bold'
                      : 'text-stone-300 hover:bg-white/10'
                  }`}
                >
                  <span>{room}</span>
                  {selectedRoom === room && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Optional hint toggle */}
        <button
          type="button"
          id="scanner-hint-toggle-btn"
          onClick={() => setShowHintInput(!showHintInput)}
          className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform ${
            showHintInput || userHint
              ? 'bg-amber-500 text-stone-950 font-bold'
              : 'bg-stone-900/80 text-white'
          }`}
          title="Lägg till ledtråd"
        >
          <Sparkles className="w-5 h-5" />
        </button>
      </div>

      {/* Mode Selector: 1 Föremål vs Markera flera */}
      <div className="relative z-20 flex flex-col items-center gap-2 pb-2 px-4">
        <div className="inline-flex bg-stone-900/90 backdrop-blur-md p-1 rounded-full border border-white/20 text-xs shadow-lg">
          <button
            type="button"
            id="scanner-type-single-btn"
            onClick={() => setScanType('single')}
            className={`px-3.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all ${
              scanType === 'single'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            <span>⚡ 1 Föremål</span>
          </button>
          <button
            type="button"
            id="scanner-type-multi-btn"
            onClick={() => setScanType('multi')}
            className={`px-3.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all ${
              scanType === 'multi'
                ? 'bg-emerald-500 text-stone-950 shadow-xs ring-1 ring-emerald-300'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            <span>🎯 Markera flera på bilden</span>
            <span className="text-[10px] bg-stone-950/40 text-emerald-200 px-2 py-0.5 rounded-full">
              Smart
            </span>
          </button>
        </div>

        {/* Speed Mode Selector Pill when in single mode */}
        {scanType === 'single' ? (
          <div className="inline-flex bg-stone-950/60 backdrop-blur-md p-0.5 rounded-full border border-white/10 text-xs">
            <button
              type="button"
              id="scanner-mode-turbo-btn"
              onClick={() => setSpeedMode('turbo')}
              className={`px-3 py-1 rounded-full font-semibold flex items-center gap-1 transition-all ${
                speedMode === 'turbo'
                  ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Turbo (1s)</span>
            </button>
            <button
              type="button"
              id="scanner-mode-detailed-btn"
              onClick={() => setSpeedMode('detailed')}
              className={`px-3 py-1 rounded-full font-semibold transition-all ${
                speedMode === 'detailed'
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <span>Djupanalys</span>
            </button>
          </div>
        ) : (
          <div className="text-xs text-emerald-300/90 font-medium bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full animate-fadeIn">
            ✓ Du kan klicka på och välja flera prylar i samma bild
          </div>
        )}
      </div>

      {/* Optional Hint banner */}
      {showHintInput && (
        <div className="relative z-20 px-4 py-2.5 bg-stone-900/90 backdrop-blur-md border-y border-white/10">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <input
              type="text"
              id="scanner-hint-input"
              value={userHint}
              onChange={(e) => setUserHint(e.target.value)}
              placeholder="Ledtråd (t.ex. 'Samsung 65 tum', 'Köpt på IKEA')..."
              className="flex-1 bg-stone-800 text-white placeholder-stone-400 text-base px-3.5 py-2 rounded-xl border border-white/10 focus:outline-hidden focus:border-amber-400"
            />
            {userHint && (
              <button
                type="button"
                onClick={() => setUserHint('')}
                className="text-stone-300 text-sm font-semibold px-2"
              >
                Rensa
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. VIEWFINDER AREA */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {/* Live Video or Fallback */}
        {isCameraActive ? (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-radial from-stone-900 to-black text-white">
            <div className="w-16 h-16 rounded-full bg-stone-800 flex items-center justify-center text-stone-400 mb-3">
              <Camera className="w-8 h-8" />
            </div>
            <p className="text-sm font-medium text-stone-300 max-w-xs mb-2">
              Kameran är inte aktiv eller tillåten
            </p>
            <p className="text-xs text-stone-500 max-w-xs mb-4">
              Välj ett foto från telefonen eller tryck på ett snabbtest nedan för att prova AI-igenkänningen direkt.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-white text-stone-950 font-bold text-xs px-4 py-2.5 rounded-full flex items-center gap-2 shadow-lg active:scale-95"
            >
              <Upload className="w-4 h-4" /> Välj foto från galleriet
            </button>
          </div>
        )}

        {/* Viewfinder Target & Animated Laser */}
        <div className="relative z-10 w-64 h-64 sm:w-72 sm:h-72 border-2 border-white/40 rounded-3xl pointer-events-none flex flex-col justify-between p-3 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
          {/* Top corners */}
          <div className="flex justify-between">
            <div className="w-5 h-5 border-t-3 border-l-3 border-emerald-400 rounded-tl-lg" />
            <div className="w-5 h-5 border-t-3 border-r-3 border-emerald-400 rounded-tr-lg" />
          </div>

          {/* Center guidance text */}
          <div className="self-center bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-medium text-emerald-200 border border-emerald-400/30">
            Rikta mot föremål & märke
          </div>

          {/* Bottom corners */}
          <div className="flex justify-between">
            <div className="w-5 h-5 border-b-3 border-l-3 border-emerald-400 rounded-bl-lg" />
            <div className="w-5 h-5 border-b-3 border-r-3 border-emerald-400 rounded-br-lg" />
          </div>

          {/* Laser scanline */}
          <div className="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse" />
        </div>
      </div>

      {/* 3. BOTTOM CONTROLS & PRESET TRAY */}
      <div className="relative z-20 pb-8 pt-3 px-4 bg-gradient-to-t from-black via-black/90 to-transparent select-none">
        
        {/* Preset demo quick buttons */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold mb-2 px-1">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <Zap className="w-3.5 h-3.5" /> Snabbtesta med exempelfoton:
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
            {DEMO_PRESET_IMAGES.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectPreset(preset)}
                className="flex items-center gap-2.5 bg-[#151C28] hover:bg-slate-800 border border-[#1E293B] px-3 py-2 rounded-xl shrink-0 active:scale-95 transition-all text-left"
              >
                <img
                  src={preset.url}
                  alt={preset.title}
                  className="w-8 h-8 rounded-lg object-cover"
                />
                <div>
                  <div className="text-xs font-bold text-white leading-tight">
                    {preset.title}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {preset.category}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Shutter controls */}
        <div className="max-w-md mx-auto flex items-center justify-around">
          
          {/* Gallery Upload */}
          <button
            type="button"
            id="scanner-gallery-upload-btn"
            onClick={() => fileInputRef.current?.click()}
            className="w-13 h-13 rounded-full bg-slate-800/90 text-white flex flex-col items-center justify-center border border-white/20 active:scale-90 transition-transform cursor-pointer"
            title="Ladda upp bild"
          >
            <Upload className="w-5 h-5 text-slate-200" />
            <span className="text-[10px] text-slate-300 font-semibold mt-0.5">Galleri</span>
          </button>

          {/* Huge Shutter Button */}
          <button
            type="button"
            id="scanner-shutter-btn"
            onClick={capturePhoto}
            disabled={!isCameraActive}
            className={`w-20 h-20 rounded-full flex items-center justify-center p-1.5 transition-all cursor-pointer ${
              isCameraActive 
                ? 'ring-4 ring-white active:scale-90 shadow-2xl shadow-emerald-500/50' 
                : 'ring-4 ring-slate-600 opacity-60 cursor-not-allowed'
            }`}
          >
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center shadow-inner">
              <div className="w-14 h-14 rounded-full bg-[#10B981] flex items-center justify-center">
                <Camera className="w-7 h-7 text-slate-950" />
              </div>
            </div>
          </button>

          {/* Flip camera */}
          <button
            type="button"
            id="scanner-flip-camera-btn"
            onClick={toggleCameraFacing}
            className="w-13 h-13 rounded-full bg-slate-800/90 text-white flex flex-col items-center justify-center border border-white/20 active:scale-90 transition-transform cursor-pointer"
            title="Vänd kamera"
          >
            <RefreshCw className="w-5 h-5 text-slate-200" />
            <span className="text-[10px] text-slate-300 font-semibold mt-0.5">Vänd</span>
          </button>

        </div>

      </div>
    </div>
  );
};
