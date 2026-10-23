import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, History } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

export default function MessageEditHistory({ isOpen, onClose, msg }) {
  const messageEdits = useChatStore(s => s.messageEdits);
  const edits = msg ? (messageEdits[msg.id] || []) : [];

  if (!isOpen || !msg) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
        <motion.div 
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} 
          transition={{ type: 'spring', damping: 25, stiffness: 300 }} 
          onClick={e => e.stopPropagation()} 
          className="w-full max-w-md bg-[#1c1c1e] rounded-t-[2rem] border-t border-white/10 p-5 pb-8 max-h-[75vh] flex flex-col"
        >
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <History size={18} className="text-blue-400" /> Edit History
            </h2>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50"><X size={16}/></button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            <div className="bg-[#0a0a0a] border border-green-500/30 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Current</span>
                <span className="text-[10px] text-white/40">{new Date(msg.timestamp * 1000).toLocaleString()}</span>
              </div>
              <p className="text-sm text-white whitespace-pre-wrap break-words">{msg.data?.message || msg.text || '(media)'}</p>
            </div>

            {edits.length === 0 ? (
              <div className="text-center text-white/40 py-4 text-xs">No previous versions</div>
            ) : (
              [...edits].reverse().map((edit, i) => (
                <div key={i} className="bg-[#0a0a0a] border border-white/10 rounded-xl p-3 opacity-70">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Version {edits.length - i}</span>
                    <span className="text-[10px] text-white/40">{new Date(edit.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-white/70 whitespace-pre-wrap break-words line-through decoration-white/30">{edit.previousText || '(media)'}</p>
                </div>
              ))
            )}
          </div>

          <p className="text-[10px] text-white/30 text-center mt-3">All edits are stored locally on this device</p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}