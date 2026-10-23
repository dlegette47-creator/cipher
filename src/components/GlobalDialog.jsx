import React, { useState, useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function GlobalDialog() {
  const dialog = useChatStore(s => s.dialog);
  const closeDialog = useChatStore(s => s.closeDialog);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (dialog) setInputValue(dialog.inputDefault || '');
  }, [dialog]);

  if (!dialog) return null;

  const handleConfirm = () => {
    if (dialog.onConfirm) dialog.onConfirm(inputValue);
    closeDialog();
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={closeDialog}
      >
        <motion.div 
          initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
          onClick={e => e.stopPropagation()}
          className="bg-[#1c1c1e] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-lg font-bold text-white">{dialog.title || 'Alert'}</h2>
            <button onClick={closeDialog} className="p-1 text-white/50 hover:text-white"><X size={18}/></button>
          </div>
          
          {dialog.message && (
            <p className="text-sm text-gray-400 mb-6">{dialog.message}</p>
          )}

          {dialog.hasInput && (
            <input
              type="text"
              autoFocus
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500 mb-6"
              placeholder={dialog.placeholder || 'Type here...'}
            />
          )}

          <div className="flex gap-3 mt-auto">
            <button onClick={closeDialog} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-colors">
              Cancel
            </button>
            <button 
              onClick={handleConfirm} 
              className={`flex-1 py-3 font-semibold rounded-xl transition-colors ${dialog.type === 'danger' ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
            >
              {dialog.confirmText || 'Confirm'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}