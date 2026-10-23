import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download } from 'lucide-react';

export default function ImageLightbox({ url, onClose }) {
  if (!url) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center backdrop-blur-sm"
        onClick={onClose}
      >
        <div className="absolute top-4 right-4 flex gap-4 z-10">
          <a 
            href={url} 
            target="_blank" 
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <Download size={20} />
          </a>
          <button 
            onClick={onClose}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <motion.img 
          initial={{ scale: 0.9 }} 
          animate={{ scale: 1 }} 
          exit={{ scale: 0.9 }}
          src={url} 
          className="max-w-full max-h-full object-contain" 
          onClick={(e) => e.stopPropagation()} 
        />
      </motion.div>
    </AnimatePresence>
  );
}