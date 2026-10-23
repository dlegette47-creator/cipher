import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, MessageSquare, Users } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

export default function NotificationCenter({ isOpen, onClose, onJump }) {
  const dms = useChatStore(s => s.dms);
  const groupMessages = useChatStore(s => s.groupMessages);
  const profiles = useChatStore(s => s.profiles);
  const groups = useChatStore(s => s.groups);
  const unreadCounts = useChatStore(s => s.unreadCounts);

  const items = useMemo(() => {
    if (!isOpen) return [];
    const list = [];

    Object.entries(dms || {}).forEach(([pk, msgs]) => {
      const last = msgs[msgs.length - 1];
      if (!last) return;
      const preview = last.data?.message
        || last.data?.title
        || (last.data?.type === 'image' ? 'Photo'
          : last.data?.type === 'audio' ? 'Voice note'
          : last.data?.type === 'cipher_order' ? 'Order'
          : last.data?.type === 'order_request' ? 'Order request'
          : 'New message');
      list.push({
        type: 'dm',
        id: pk,
        name: profiles[pk]?.displayName || profiles[pk]?.name || `User ${pk.slice(0, 6)}`,
        preview,
        timestamp: last.timestamp || 0,
        unread: unreadCounts[pk] || 0,
      });
    });

    Object.entries(groupMessages || {}).forEach(([gid, msgs]) => {
      const last = msgs[msgs.length - 1];
      if (!last) return;
      try {
        const parsed = JSON.parse(last.rawContent || '{}');
        if (parsed.type === 'typing') return;
        const group = (groups || []).find(g => g.id === gid);
        list.push({
          type: 'group',
          id: gid,
          name: group?.name || 'Group',
          preview: parsed.message || parsed.title || 'New message',
          timestamp: last.timestamp || 0,
          unread: unreadCounts[gid] || 0,
        });
      } catch (e) {}
    });

    return list.sort((a, b) => b.timestamp - a.timestamp).slice(0, 30);
  }, [isOpen, dms, groupMessages, profiles, groups, unreadCounts]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
        <motion.div
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-md bg-[#1c1c1e] rounded-t-[2rem] border-t border-white/10 p-5 pb-8 max-h-[85vh] flex flex-col"
        >
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Bell size={18} className="text-blue-400" /> Activity
            </h2>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {items.length === 0 ? (
              <div className="text-center text-white/40 py-12">
                <Bell size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              items.map((item, i) => (
                <button
                  key={`${item.type}-${item.id}-${i}`}
                  onClick={() => { onJump(item.type, item.id); onClose(); }}
                  className="w-full bg-[#0a0a0a] hover:bg-[#1a1a1a] border border-white/5 rounded-xl p-3 flex items-start gap-3 text-left transition-colors"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.type === 'dm' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                    {item.type === 'dm' ? <MessageSquare size={16} /> : <Users size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-bold text-white truncate">{item.name}</p>
                      <span className="text-[9px] text-white/30 shrink-0 ml-2">
                        {item.timestamp ? new Date(item.timestamp * 1000).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="text-xs text-white/60 truncate">{item.preview}</p>
                  </div>
                  {item.unread > 0 && (
                    <span className="bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                      {item.unread > 99 ? '99+' : item.unread}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
