import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, AlertCircle } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { nip19 } from 'nostr-tools';

export default function QRScanner({ isOpen, onClose, onScanned }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const setToast = useChatStore(s => s.setToast);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setScanning(true);
        detectQR();
      } catch (err) {
        setError('Camera access denied or not available. You can paste the QR data manually.');
      }
    };

    const detectQR = () => {
      if (!videoRef.current || !mounted) return;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const scanLoop = () => {
        if (!mounted || !videoRef.current) return;
        if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Use BarcodeDetector API if available (Chrome/Edge)
          if ('BarcodeDetector' in window) {
            const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
            detector.detect(canvas).then(codes => {
              if (codes.length > 0) {
                const result = codes[0].rawValue;
                handleResult(result);
              }
            }).catch(() => {});
          }
        }
        if (mounted) requestAnimationFrame(scanLoop);
      };
      requestAnimationFrame(scanLoop);
    };

    const handleResult = (data) => {
      if (!mounted) return;
      try {
        // Expected format: cipher://user/npub1...
        if (data.startsWith('cipher://user/')) {
          const npub = data.replace('cipher://user/', '');
          const decoded = nip19.decode(npub);
          if (decoded.type === 'npub') {
            onScanned({ type: 'user', pubkey: decoded.data });
            onClose();
            return;
          }
        }
        // Also accept raw npub
        if (data.startsWith('npub1')) {
          const decoded = nip19.decode(data);
          if (decoded.type === 'npub') {
            onScanned({ type: 'user', pubkey: decoded.data });
            onClose();
            return;
          }
        }
        // Group invite format: cipher://group/<id>
        if (data.startsWith('cipher://group/')) {
          const groupId = data.replace('cipher://group/', '');
          onScanned({ type: 'group', groupId });
          onClose();
          return;
        }
        setToast({ type: 'error', message: 'Invalid QR code' });
      } catch (e) {
        setToast({ type: 'error', message: 'Invalid QR format' });
      }
    };

    startCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[999999] bg-black flex flex-col">
        <div className="p-4 flex justify-between items-center">
          <h2 className="text-white font-bold text-lg">Scan QR Code</h2>
          <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white"><X size={20}/></button>
        </div>

        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle size={48} className="text-red-500 mb-4" />
            <p className="text-white font-bold mb-2">Camera Error</p>
            <p className="text-white/60 text-sm mb-6">{error}</p>
            <button onClick={onClose} className="bg-blue-600 text-white px-6 py-2 rounded-xl">Close</button>
          </div>
        ) : (
          <div className="flex-1 relative">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <div className="absolute inset-0 border-[60px] border-black/50 pointer-events-none">
              <div className="w-full h-full border-2 border-green-500 rounded-2xl relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-500 rounded-tl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-500 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-500 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-500 rounded-br" />
              </div>
            </div>
            <p className="absolute bottom-8 left-0 right-0 text-center text-white/80 text-sm px-6">
              Point at a Cipher profile QR code
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}