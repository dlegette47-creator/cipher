import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bookmark, MessageSquare } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

export default function BookmarksViewer({ isOpen, onClose, onJump }) {
  const bookmarks = useChatStore(s => s.bookmarks);
  const groupMessages = useChatStore(s => s.groupMessages);
  const dms = useChatStore(s => s.dms);
  const profiles = useChatStore(s => s.profiles);
  const groups = useChatStore(s => s.groups);
  const toggleBookmark = useChatStore(s => s.toggleBookmark);

  if (!isOpen) return null;

  // Aggregate bookmarks across all chats
  const items = [];
  Object.entries(bookmarks).forEach(([chatId, msgIds]) => {
    const isGroup = groups.some(g => g.id === chatId);
    const msgs = isGroup ? (groupMessages[chatId] || []) : (dms[chatId] || []);
    msgIds.forEach(msgId => {
      const m = msgs.find(x => x.id === msgId);
      if (m) {
        let text = '';
        if (isGroup) {
          try { text = JSON.parse(m.rawContent || '{}').message || '(media)'; } catch { text = '(media)'; }
        } else {
          text = m.data?.message || m.data?.title || '(media)';
        }
        items.push({
          chatId, msgId, isGroup, text,
          timestamp: m.timestamp,
          chatName: isGroup 
            ? (groups.find(g => g.id === chatId)?.name || 'Group')
            : (profiles[chatId]?.displayName || `User ${chatId.slice(0, 6)}`),
          senderName: profiles[m.pubkey]?.displayName || m.pubkey.slice(0, 6)
        });
      }
    });
  });

  items.sort((a, b) => b.timestamp - a.timestamp);

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
        <motion.div 
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} 
          transition={{ type: 'spring', damping: 25, stiffness: 300 }} 
          onClick={e => e.stopPropagation()} 
          className="w-full max-w-md bg-[#1c1c1e] rounded-t-[2rem] border-t border-white/10 p-5 pb-8 max-h-[80vh] flex flex-col"
        >
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Bookmark size={18} className="text-yellow-400" /> Saved Messages ({items.length})
            </h2>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50"><X size={16}/></button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {items.length === 0 ? (
              <div className="text-center text-white/40 py-12">
                <Bookmark size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No saved messages</p>
                <p className="text-xs text-white/30 mt-1">Tap the bookmark icon on any message to save it</p>
              </div>
            ) : (
              items.map((item, i) => (
                <div key={`${item.chatId}-${item.msgId}-${i}`} className="bg-[#0a0a0a] border border-white/5 rounded-xl p-3 flex items-start gap-2">
                  <button onClick={() => { onJump(item.chatId, item.msgId, item.isGroup); onClose(); }} className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-blue-400">{item.chatName}</span>
                      <span className="text-[9px] text-white/30">·</span>
                      <span className="text-[9px] text-white/40">{item.senderName}</span>
                      <span className="text-[9px] text-white/30 ml-auto">{new Date(item.timestamp * 1000).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-white/80 line-clamp-2">{item.text}</p>
                  </button>
                  <button onClick={() => toggleBookmark(item.chatId, item.msgId)} className="p-1.5 text-yellow-400 hover:text-yellow-300 transition-colors">
                    <Bookmark size={14} fill="currentColor" />
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