import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert, UserX, UserCheck, Megaphone, FileText } from 'lucide-react';
import { db } from '../../db';

export default function ModerationLog({ isOpen, onClose, groupId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !groupId) return;
    const fetchLogs = async () => {
      try {
        // Scan local messages for system events about this group
        const allMsgs = await db.messages.where('chatId').equals(groupId).toArray();
        const sysLogs = allMsgs
          .filter(m => {
            try {
              const p = JSON.parse(m.rawContent || '{}');
              return p.type === 'system' || p.type === 'order_update';
            } catch { return false; }
          })
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 100);
        setLogs(sysLogs);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [isOpen, groupId]);

  if (!isOpen) return null;

  const getIcon = (msg) => {
    try {
      const p = JSON.parse(msg.rawContent || '{}');
      const text = (p.message || '').toLowerCase();
      if (text.includes('kicked') || text.includes('removed')) return <UserX size={16} className="text-red-400" />;
      if (text.includes('joined') || text.includes('added')) return <UserCheck size={16} className="text-green-400" />;
      if (text.includes('promoted') || text.includes('admin')) return <ShieldAlert size={16} className="text-purple-400" />;
      if (text.includes('name') || text.includes('description')) return <FileText size={16} className="text-blue-400" />;
      return <Megaphone size={16} className="text-white/50" />;
    } catch { return <Megaphone size={16} className="text-white/50" />; }
  };

  const getText = (msg) => {
    try {
      const p = JSON.parse(msg.rawContent || '{}');
      return p.message || p.productName || 'System event';
    } catch { return 'System event'; }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-start justify-center" onClick={onClose}>
        <motion.div 
          initial={{ y: '-100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }} 
          transition={{ type: 'spring', damping: 25, stiffness: 300 }} 
          onClick={e => e.stopPropagation()} 
          className="w-full max-w-md bg-[#1c1c1e] rounded-b-[2rem] border-t border-white/10 p-5 pt-10 max-h-[80vh] flex flex-col"
        >
                    <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><ShieldAlert size={18} className="text-yellow-400"/> Moderation Log</h2>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50"><X size={16}/></button>
          </div>
          <p className="text-[11px] text-white/40 mb-4">A permanent record of every action taken in this group. Sunlight is the best disinfectant.</p>

          <div className="flex-1 overflow-y-auto space-y-2">
            {loading ? (
              <p className="text-center text-white/40 py-8">Loading...</p>
            ) : logs.length === 0 ? (
              <p className="text-center text-white/40 py-8 text-sm">No moderation history yet.</p>
            ) : (
              logs.map((msg, i) => (
                <div key={`${msg.id}-${i}`} className="flex gap-3 p-3 bg-[#0a0a0a] rounded-xl border border-white/5">
                  <div className="shrink-0 mt-0.5">{getIcon(msg)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/90">{getText(msg)}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">{new Date(msg.timestamp * 1000).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}