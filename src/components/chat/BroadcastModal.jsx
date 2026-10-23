import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Users, Check } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

export default function BroadcastModal({ isOpen, onClose, product, onBroadcast }) {
  const groups = useChatStore(s => s.groups);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !product) return null;

  const toggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    await onBroadcast(selected, product);
    setLoading(false);
    setSelected([]);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
        <motion.div 
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} 
          transition={{ type: 'spring', damping: 25, stiffness: 300 }} 
          onClick={e => e.stopPropagation()} 
          className="w-full max-w-md bg-[#1c1c1e] rounded-t-[2rem] border-t border-white/10 p-5 pb-8"
        >
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">Broadcast to Groups</h2>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50 hover:text-white"><X size={18}/></button>
          </div>

          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-3 mb-4 flex gap-3 items-center">
            {product.image && <img src={product.image} className="w-12 h-12 rounded-lg object-cover" />}
            <div>
              <p className="text-sm font-bold text-white truncate">{product.title}</p>
              <p className="text-xs text-green-400 font-mono">${product.priceUsd}</p>
            </div>
          </div>

          <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Select Groups</p>
          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
            {groups.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-4">You haven't joined any groups.</p>
            ) : (
              groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => toggle(g.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                    selected.includes(g.id) ? 'bg-blue-600/20 border border-blue-500/40' : 'bg-[#0a0a0a] border border-white/5 hover:bg-white/5'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    selected.includes(g.id) ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/50'
                  }`}>
                    {selected.includes(g.id) ? <Check size={16} /> : <Users size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{g.name}</p>
                    <p className="text-[10px] text-white/40 uppercase">{g.isChannel ? 'Channel' : 'Group'}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={selected.length === 0 || loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? 'Broadcasting...' : <><Send size={16} /> Broadcast to {selected.length} Group{selected.length !== 1 ? 's' : ''}</>}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}