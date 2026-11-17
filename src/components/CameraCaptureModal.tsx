import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Sparkles, RefreshCw, AlertCircle, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { DEMO_PRESET_IMAGES, ROOMS_LIST } from '../data/sampleItems';
import { compressAndResizeImage } from '../utils/imageCompressor';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSelected: (imageBase64: string, mimeType: string, userHint: string, room: string) => void;
  currentRoom?: string;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onImageSelected,
  currentRoom = 'Vardagsrum',
}) => {
  const [mode, setMode] = useState<'camera' | 'upload' | 'preset'>('camera');
  const [selectedRoom, setSelectedRoom] = useState(currentRoom === 'Alla rum' ? 'Vardagsrum' : currentRoom);
  const [userHint, setUserHint] = useState('');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start camera when mode is 'camera' and modal opens
  useEffect(() => {
    if (isOpen && mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, mode]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer back camera on phones
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn('Could not access camera:', err);
      setCameraError('Kunde inte komma åt kameran. Du kan ladda upp en fil eller välja ett exempelfoto nedan istället.');
      setIsCameraActive(false);
      setMode('upload');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(1280, video.videoWidth || 1280);
    canvas.height = Math.min(1280, video.videoHeight || 720);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.82);
      stopCamera();
      onImageSelected(base64, 'image/jpeg', userHint, selectedRoom);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    try {
      const { base64, mimeType } = await compressAndResizeImage(file, 1200, 1200, 0.8);
      stopCamera();
      onImageSelected(base64, mimeType, userHint, selectedRoom);
    } catch (err) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        stopCamera();
        onImageSelected(base64, file.type || 'image/jpeg', userHint, selectedRoom);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  const selectPreset = (preset: typeof DEMO_PRESET_IMAGES[0]) => {
    stopCamera();
    onImageSelected(preset.url, 'image/jpeg', preset.hint, selectedRoom);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 leading-tight">
                Inventera nytt föremål
              </h2>
              <p className="text-xs text-stone-500">
                Fota eller ladda upp en bild så tolkar AI:n allt på 2 sekunder
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Room & Hint options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Rum där föremålet finns
              </label>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="w-full text-xs sm:text-sm bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                {ROOMS_LIST.filter(r => r !== 'Alla rum').map((room) => (
                  <option key={room} value={room}>
                    {room}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Valfri ledtråd (t.ex. märke eller inköpsår)
              </label>
              <input
                type="text"
                placeholder="T.ex. 'IKEA 2022' eller 'Kvitto finns'"
                value={userHint}
                onChange={(e) => setUserHint(e.target.value)}
                className="w-full text-xs sm:text-sm bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-800 placeholder:text-stone-400 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200/80">
            <button
              onClick={() => setMode('camera')}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                mode === 'camera'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Camera className="w-4 h-4 text-amber-600" />
              Livekamera
            </button>
            <button
              onClick={() => {
                stopCamera();
                setMode('upload');
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                mode === 'upload'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Upload className="w-4 h-4 text-blue-600" />
              Ladda upp bild
            </button>
            <button
              onClick={() => {
                stopCamera();
                setMode('preset');
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                mode === 'preset'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              Testa exempelfoto
            </button>
          </div>

          {/* Camera View */}
          {mode === 'camera' && (
            <div className="space-y-4">
              <div className="relative aspect-4/3 w-full bg-stone-950 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border border-stone-800">
                {isCameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {/* Viewfinder Target frame */}
                    <div className="absolute inset-8 border-2 border-dashed border-amber-400/50 rounded-2xl pointer-events-none flex items-center justify-center">
                      <div className="bg-stone-900/60 backdrop-blur-xs text-white text-[11px] px-3 py-1 rounded-full font-medium">
                        Centrera föremålet i rutan
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6 text-stone-400">
                    <Camera className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Startar kameran...</p>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-start gap-2 border border-rose-200">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
              )}

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={capturePhoto}
                  disabled={!isCameraActive}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-stone-950 font-bold rounded-2xl shadow-lg shadow-amber-500/25 flex items-center gap-2 text-sm sm:text-base transition-transform active:scale-95 cursor-pointer"
                >
                  <Camera className="w-5 h-5" />
                  Ta bild och analysera med AI
                </button>
              </div>
            </div>
          )}

          {/* File Upload View */}
          {mode === 'upload' && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-stone-300 hover:border-amber-400 bg-stone-50/60 hover:bg-amber-50/30 rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-bold text-stone-800">
                  Dra och släpp en bild här, eller klicka för att välja fil
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  Stöder JPG, PNG, WEBP och HEIC från mobil och dator
                </p>
              </div>
            </div>
          )}

          {/* Preset Example Photos */}
          {mode === 'preset' && (
            <div className="space-y-3">
              <p className="text-xs text-stone-600">
                Klicka på ett typiskt hemföremål för att se hur AI:n automatiskt tolkar märke, modell, skick och värde i SEK:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {DEMO_PRESET_IMAGES.map((preset, index) => (
                  <div
                    key={index}
                    onClick={() => selectPreset(preset)}
                    className="group border border-stone-200 hover:border-amber-400 rounded-2xl p-2.5 bg-white hover:bg-amber-50/40 transition-all cursor-pointer shadow-xs flex flex-col justify-between"
                  >
                    <div className="aspect-4/3 rounded-xl overflow-hidden bg-stone-100 mb-2 relative">
                      <img
                        src={preset.url}
                        alt={preset.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute bottom-1.5 left-1.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
                        {preset.category}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-stone-900 group-hover:text-amber-800">
                        {preset.title}
                      </div>
                      <div className="text-[11px] text-stone-400 truncate">
                        {preset.hint}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
