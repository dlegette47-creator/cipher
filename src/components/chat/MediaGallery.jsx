import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Play, Mic } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

export default function MediaGallery({ isOpen, onClose, chatId, isGroup }) {
  const [filter, setFilter] = useState('photos');
  const [lightbox, setLightbox] = useState(null);
  const groupMessages = useChatStore(s => s.groupMessages);
  const dms = useChatStore(s => s.dms);

  if (!isOpen || !chatId) return null;

  const msgs = isGroup ? (groupMessages[chatId] || []) : (dms[chatId] || []);
  
  const items = [];
  msgs.forEach(m => {
    let parsed = {};
    if (isGroup) {
      try { parsed = JSON.parse(m.rawContent || '{}'); } catch (e) {}
    } else {
      parsed = m.data || {};
    }
    
    if (parsed.type === 'image' && parsed.url) {
      items.push({ type: 'photo', url: parsed.url, id: m.id, timestamp: m.timestamp });
    } else if (parsed.type === 'album' && parsed.urls) {
      parsed.urls.forEach((url, i) => {
        items.push({ type: 'photo', url, id: `${m.id}-${i}`, timestamp: m.timestamp });
      });
    } else if (parsed.type === 'audio' && parsed.url) {
      items.push({ type: 'audio', url: parsed.url, id: m.id, timestamp: m.timestamp });
    }
  });

  items.sort((a, b) => b.timestamp - a.timestamp);

  const filtered = filter === 'photos' 
    ? items.filter(i => i.type === 'photo')
    : items.filter(i => i.type === 'audio');

  const photoCount = items.filter(i => i.type === 'photo').length;
  const audioCount = items.filter(i => i.type === 'audio').length;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-start justify-center" onClick={onClose}>
        <motion.div 
          initial={{ y: '-100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }} 
          transition={{ type: 'spring', damping: 25, stiffness: 300 }} 
          onClick={e => e.stopPropagation()} 
          className="w-full max-w-md bg-[#1c1c1e] rounded-b-[2rem] border-t border-white/10 p-5 pt-10 max-h-[85vh] flex flex-col"
        >
                    <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">Shared Media</h2>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50"><X size={16}/></button>
          </div>

          <div className="flex gap-1 bg-[#0a0a0a] p-1 rounded-xl mb-4">
            <button onClick={() => setFilter('photos')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 ${filter === 'photos' ? 'bg-blue-600 text-white' : 'text-white/40'}`}>
              <ImageIcon size={12} /> Photos ({photoCount})
            </button>
            <button onClick={() => setFilter('audio')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 ${filter === 'audio' ? 'bg-blue-600 text-white' : 'text-white/40'}`}>
              <Mic size={12} /> Voice ({audioCount})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-center text-white/40 py-12">
                <ImageIcon size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No {filter === 'photos' ? 'photos' : 'voice messages'} yet</p>
              </div>
            ) : filter === 'photos' ? (
              <div className="grid grid-cols-3 gap-1">
                {filtered.map(item => (
                  <button key={item.id} onClick={() => setLightbox(item.url)} className="aspect-square overflow-hidden rounded-lg bg-[#0a0a0a]">
                    <img src={item.url} className="w-full h-full object-cover hover:opacity-80 transition-opacity" alt="" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(item => (
                  <div key={item.id} className="bg-[#0a0a0a] border border-white/5 rounded-xl p-3">
                    <audio controls src={item.url} className="w-full h-10" />
                    <p className="text-[10px] text-white/40 mt-1">{new Date(item.timestamp * 1000).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {lightbox && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100000] bg-black/95 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); setLightbox(null); }}>
            <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 p-3 bg-white/10 rounded-full text-white"><X size={20}/></button>
            <img src={lightbox} className="max-w-full max-h-full object-contain" alt="" onClick={e => e.stopPropagation()} />
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}