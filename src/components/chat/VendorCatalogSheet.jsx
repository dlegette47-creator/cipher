import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, ShoppingBag, Star } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { getAuthenticatedPool } from '../../lib/pool';
import { generalRelays, groupRelays, queryWithTimeout } from '../../lib/relays';
import { useVouchCount } from '../../hooks/useVouchCount';

export default function VendorCatalogSheet({ isOpen, onClose, vendorPubkey, profiles, identity }) {
  const groupMessages = useChatStore(s => s.groupMessages);
  const openChat = useChatStore(s => s.openChat);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { vouchCount, tier } = useVouchCount({ identity, targetPubkey: vendorPubkey });

  useEffect(() => {
    if (!isOpen || !vendorPubkey) return;
    let mounted = true;
    setLoading(true);

    const fetchCatalog = async () => {
      // First, scan local group messages for this vendor's products
      const found = [];
      const seen = new Set();
      Object.values(groupMessages).forEach(msgs => {
        (msgs || []).forEach(msg => {
          if (msg.pubkey !== vendorPubkey) return;
          try {
            const parsed = JSON.parse(msg.rawContent || '{}');
            if (parsed.type === 'product' && !seen.has(msg.id)) {
              seen.add(msg.id);
              found.push({ id: msg.id, ...parsed });
            }
          } catch(e) {}
        });
      });

      // Then, try to fetch from relays as fallback (products vendor posted in channels)
      try {
        if (identity?.sk && found.length < 10) {
          const pool = await getAuthenticatedPool(identity);
          const allRelays = [...new Set([...generalRelays, ...groupRelays])];
          const events = await queryWithTimeout(pool, allRelays, {
            kinds: [30402],
            authors: [vendorPubkey],
            '#t': ['cipher_marketplace'],
            limit: 100
          }, 4000);

          events.forEach(ev => {
            if (seen.has(ev.id)) return;
            try {
              const getTag = (name) => ev.tags.find(t => t[0] === name)?.[1];
              const content = JSON.parse(ev.content || '{}');
              const price = parseFloat(getTag('price') || content.price || '0');
              if (price > 0) {
                seen.add(ev.id);
                found.push({
                  id: getTag('d') || ev.id,
                  title: getTag('title') || content.name || 'Product',
                  priceUsd: price,
                  image: getTag('image') || content.image || '',
                  description: content.description || ''
                });
              }
            } catch(e) {}
          });
        }
      } catch (e) {}

      if (mounted) {
        setProducts(found);
        setLoading(false);
      }
    };

    fetchCatalog();
    return () => { mounted = false; };
  }, [isOpen, vendorPubkey, groupMessages, identity?.sk]);

  if (!isOpen) return null;
  const vendorName = profiles[vendorPubkey]?.displayName || 'Vendor';
  const vendorPic = profiles[vendorPubkey]?.picture;
  
  const tierData = {
    elite: { label: 'Elite Vendor', icon: '🏆', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
    trusted: { label: 'Trusted Vendor', icon: '🛡️', color: 'text-green-400 bg-green-500/10 border-green-500/30' },
    new: { label: 'New Vendor', icon: '🟡', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' }
  }[tier];

  const handleBuy = (product) => {
    onClose();
    openChat('dm', vendorPubkey);
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
        <motion.div 
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} 
          transition={{ type: 'spring', damping: 25, stiffness: 300 }} 
          onClick={e => e.stopPropagation()} 
          className="w-full max-w-md bg-[#1c1c1e] rounded-t-[2rem] border-t border-white/10 max-h-[85vh] flex flex-col"
        >
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-2" />
          
          {/* Vendor header */}
          <div className="p-5 pb-3 border-b border-white/5">
            <div className="flex items-center gap-3 mb-3">
              {vendorPic ? (
                <img src={vendorPic} className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xl">
                  {vendorName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white truncate">{vendorName}</h2>
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold mt-1 ${tierData.color}`}>
                  <span>{tierData.icon}</span> {tierData.label} • {vouchCount} vouch{vouchCount !== 1 ? 'es' : ''}
                </div>
              </div>
              <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50"><X size={18}/></button>
            </div>
            <p className="text-xs text-white/40 flex items-center gap-1">
              <ShoppingBag size={12}/> {products.length} active listing{products.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center text-white/40 py-12">
                <Package size={32} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">No active listings</p>
                <p className="text-xs text-white/30 mt-1">This vendor hasn't posted products yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {products.map(p => (
                  <div key={p.id} className="bg-[#0a0a0a] rounded-2xl overflow-hidden border border-white/5">
                    {p.image && <img src={p.image} className="w-full h-28 object-cover" />}
                    <div className="p-3">
                      <p className="text-xs font-bold text-white truncate">{p.title}</p>
                      <p className="text-xs text-green-400 font-mono mt-0.5">${p.priceUsd}</p>
                      {p.dropUntil && p.dropUntil > Math.floor(Date.now() / 1000) && (
                        <p className="text-[9px] text-red-400 font-bold mt-1">⚡ LIVE DROP</p>
                      )}
                      <button
                        onClick={() => handleBuy(p)}
                        className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold py-1.5 rounded-lg transition-colors"
                      >
                        Buy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}