import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pin, Trash2 } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

export default function PinnedMessagesManager({ isOpen, onClose, chatId, isGroup, onUnpin, onJump }) {
  const groupMessages = useChatStore(s => s.groupMessages);
  const dms = useChatStore(s => s.dms);
  const pinnedMessages = useChatStore(s => s.pinnedMessages);
  const profiles = useChatStore(s => s.profiles);

  if (!isOpen || !chatId) return null;

  const msgs = isGroup ? (groupMessages[chatId] || []) : (dms[chatId] || []);
  const pinnedIds = pinnedMessages[chatId];
  const pinnedList = pinnedIds ? (Array.isArray(pinnedIds) ? pinnedIds : [pinnedIds]) : [];
  const pinnedMsgs = pinnedList.map(id => msgs.find(m => m.id === id)).filter(Boolean);

  const getPreview = (msg) => {
    if (isGroup) {
      try {
        const p = JSON.parse(msg.rawContent || '{}');
        return p.message || p.title || p.url || '(media)';
      } catch { return '(media)'; }
    }
    return msg.data?.message || msg.data?.title || msg.data?.url || '(media)';
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
        <motion.div 
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} 
          transition={{ type: 'spring', damping: 25, stiffness: 300 }} 
          onClick={e => e.stopPropagation()} 
          className="w-full max-w-md bg-[#1c1c1e] rounded-t-[2rem] border-t border-white/10 p-5 pb-sheet max-h-[75dvh] flex flex-col"
        >
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Pin size={18} className="text-yellow-400" /> Pinned Messages ({pinnedMsgs.length})
            </h2>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50"><X size={16}/></button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {pinnedMsgs.length === 0 ? (
              <div className="text-center text-white/40 py-12">
                <Pin size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No pinned messages</p>
              </div>
            ) : (
              pinnedMsgs.map(m => (
                <div key={m.id} className="bg-[#0a0a0a] border border-white/5 rounded-xl p-3 flex items-start gap-2">
                  <button onClick={() => { onJump(m.id); onClose(); }} className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-blue-400">{profiles[m.pubkey]?.displayName || m.pubkey.slice(0, 6)}</span>
                      <span className="text-[9px] text-white/30">{new Date(m.timestamp * 1000).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-white/80 line-clamp-2">{getPreview(m)}</p>
                  </button>
                  <button onClick={() => onUnpin(m.id)} className="p-1.5 text-red-400/60 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}