import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Archive, Trash2, BellOff, Bell, Eraser, X, AlertCircle } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { db } from '../../db';

export default function ChatContextMenu({ isOpen, onClose, chatId, chatName, isGroup }) {
  const archivedChats = useChatStore(s => s.archivedChats);
  const toggleArchiveChat = useChatStore(s => s.toggleArchiveChat);
  const mutedUntil = useChatStore(s => s.mutedUntil);
  const setMuteDuration = useChatStore(s => s.setMuteDuration);
  const openDialog = useChatStore(s => s.openDialog);
  const setToast = useChatStore(s => s.setToast);
  const setDms = useChatStore(s => s.setDms);
  const setGroupMessages = useChatStore(s => s.setGroupMessages);
  const [showMuteOptions, setShowMuteOptions] = useState(false);

  if (!isOpen) return null;

  const isArchived = archivedChats.includes(chatId);
  const isMuted = mutedUntil[chatId] && (mutedUntil[chatId] === 'forever' || mutedUntil[chatId] > Date.now());

  const handleArchive = () => {
    toggleArchiveChat(chatId);
    setToast({ type: 'success', message: isArchived ? 'Chat unarchived' : 'Chat archived' });
    onClose();
  };

  const handleMute = (durationMs, label) => {
    setMuteDuration(chatId, durationMs);
    setToast({ type: 'success', message: durationMs === 0 ? 'Unmuted' : `Muted for ${label}` });
    onClose();
  };

  const handleClear = () => {
    openDialog({
      title: 'Clear Chat',
      message: `Delete all messages in "${chatName}"? This cannot be undone.`,
      type: 'danger',
      confirmText: 'Clear',
      onConfirm: async () => {
        await db.messages.where('chatId').equals(chatId).delete();
        if (isGroup) {
          setGroupMessages(prev => ({ ...prev, [chatId]: [] }));
        } else {
          setDms(prev => ({ ...prev, [chatId]: [] }));
        }
        setToast({ type: 'success', message: 'Chat cleared' });
        onClose();
      }
    });
  };

  const muteOptions = [
    { duration: 3600000, label: '1 hour' },
    { duration: 28800000, label: '8 hours' },
    { duration: 86400000, label: '1 day' },
    { duration: 604800000, label: '1 week' },
    { duration: -1, label: 'Forever' }
  ];

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
        <motion.div 
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} 
          transition={{ type: 'spring', damping: 25, stiffness: 300 }} 
          onClick={e => e.stopPropagation()} 
          className="w-full max-w-md bg-[#1c1c1e] rounded-t-[2rem] border-t border-white/10 p-5 pb-sheet"
        >
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
          
          {!showMuteOptions ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white truncate">{chatName}</h2>
                <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50"><X size={16}/></button>
              </div>

              <div className="space-y-1">
                <button onClick={handleArchive} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left">
                  <Archive size={18} className="text-white/60" />
                  <span className="text-sm text-white flex-1">{isArchived ? 'Unarchive Chat' : 'Archive Chat'}</span>
                </button>

                <button onClick={() => setShowMuteOptions(true)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left">
                  {isMuted ? <BellOff size={18} className="text-white/60" /> : <Bell size={18} className="text-white/60" />}
                  <span className="text-sm text-white flex-1">{isMuted ? 'Unmute' : 'Mute Notifications'}</span>
                </button>

                <button onClick={handleClear} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left">
                  <Eraser size={18} className="text-white/60" />
                  <span className="text-sm text-white flex-1">Clear Chat History</span>
                </button>

                <button 
                  onClick={() => {
                    openDialog({
                      title: 'Delete Chat',
                      message: `Remove "${chatName}" from your chat list? Messages will be deleted locally.`,
                      type: 'danger',
                      confirmText: 'Delete',
                      onConfirm: async () => {
                        await db.messages.where('chatId').equals(chatId).delete();
                        if (isGroup) {
                          setGroupMessages(prev => { const n = { ...prev }; delete n[chatId]; return n; });
                        } else {
                          setDms(prev => { const n = { ...prev }; delete n[chatId]; return n; });
                        }
                        onClose();
                      }
                    });
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 transition-colors text-left"
                >
                  <Trash2 size={18} className="text-red-500" />
                  <span className="text-sm text-red-500 flex-1">Delete Chat</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => setShowMuteOptions(false)} className="p-2 bg-white/5 rounded-full text-white/60"><X size={16} className="rotate-45"/></button>
                <h2 className="text-lg font-bold text-white">Mute For...</h2>
              </div>
              <div className="space-y-1">
                {isMuted && (
                  <button onClick={() => handleMute(0, 'off')} className="w-full p-3 rounded-xl hover:bg-green-500/10 text-left flex items-center gap-3">
                    <Bell size={18} className="text-green-400" />
                    <span className="text-sm text-green-400 font-semibold">Unmute</span>
                  </button>
                )}
                {muteOptions.map(opt => (
                  <button key={opt.label} onClick={() => handleMute(opt.duration, opt.label)} className="w-full p-3 rounded-xl hover:bg-white/5 text-left flex items-center gap-3">
                    <BellOff size={18} className="text-white/60" />
                    <span className="text-sm text-white">{opt.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}