import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';

async function getCroppedBlob(imageSrc, cropPixels) {
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = imageSrc;
  });
  const canvas = document.createElement('canvas');
  const size = Math.min(cropPixels.width, cropPixels.height);
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(
    img,
    cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height,
    0, 0, size, size
  );
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
  });
}

export default function ImageCropper({ imageSrc, onComplete, onClose }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedPixels(pixels);
  }, []);

  const handleSave = async () => {
    if (!croppedPixels) return;
    setProcessing(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedPixels);
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      onComplete(file);
    } catch (e) {
      console.error(e);
      setProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100000] bg-black flex flex-col"
      >
        <div className="p-4 flex justify-between items-center border-b border-white/10">
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/60">
            <X size={20} />
          </button>
          <h2 className="text-white font-bold">Crop Photo</h2>
          <button
            onClick={handleSave}
            disabled={processing || !croppedPixels}
            className="p-2 bg-blue-500 rounded-full text-white disabled:opacity-50"
          >
            <Check size={20} />
          </button>
        </div>

        <div className="flex-1 relative">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        <div className="p-6 bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/50 w-12">Zoom</span>
            <input
              type="range"
              min={1} max={3} step={0.01}
              value={zoom}
              onChange={e => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-blue-500"
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
