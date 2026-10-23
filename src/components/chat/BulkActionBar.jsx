import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Forward, Trash2 } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

export default function BulkActionBar({ onForward, onDelete }) {
  const selectionMode = useChatStore(s => s.selectionMode);
  const selectedMsgs = useChatStore(s => s.selectedMsgs);
  const clearSelection = useChatStore(s => s.clearSelection);

  if (!selectionMode) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
        className="fixed bottom-0 left-0 right-0 z-[80] bg-[#1c1c1e] border-t border-white/10 p-3 pb-6 flex items-center gap-3"
      >
        <button onClick={clearSelection} className="p-3 bg-white/5 rounded-full text-white/60">
          <X size={20} />
        </button>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">{selectedMsgs.length} selected</p>
        </div>
        <button 
          onClick={onForward}
          disabled={selectedMsgs.length === 0}
          className="p-3 bg-blue-500/20 text-blue-400 rounded-xl disabled:opacity-30"
        >
          <Forward size={20} />
        </button>
        <button 
          onClick={onDelete}
          disabled={selectedMsgs.length === 0}
          className="p-3 bg-red-500/20 text-red-400 rounded-xl disabled:opacity-30"
        >
          <Trash2 size={20} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}