import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function ReactionsDetail({ isOpen, onClose, reactions, profiles }) {
  if (!isOpen || !reactions || reactions.length === 0) return null;

  // Group by emoji
  const grouped = {};
  reactions.forEach(r => {
    if (!grouped[r.emoji]) grouped[r.emoji] = [];
    if (r.pubkey) grouped[r.emoji].push(r.pubkey);
  });

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
        <motion.div 
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} 
          transition={{ type: 'spring', damping: 25, stiffness: 300 }} 
          onClick={e => e.stopPropagation()} 
          className="w-full max-w-md bg-[#1c1c1e] rounded-t-[2rem] border-t border-white/10 p-5 pb-8 max-h-[70vh] flex flex-col"
        >
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">Reactions</h2>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50"><X size={16}/></button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4">
            {Object.entries(grouped).map(([emoji, pubkeys]) => (
              <div key={emoji}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-sm font-bold text-white/60">{pubkeys.length}</span>
                </div>
                <div className="space-y-1">
                  {pubkeys.map(pk => (
                    <div key={pk} className="flex items-center gap-2 bg-[#0a0a0a] rounded-lg p-2">
                      {profiles[pk]?.picture ? (
                        <img src={profiles[pk].picture} className="w-6 h-6 rounded-full" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">
                          {(profiles[pk]?.displayName || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <p className="text-xs text-white">{profiles[pk]?.displayName || `User ${(pk || "anon").slice(0, 6)}`}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}