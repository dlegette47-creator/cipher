import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Shield, ShieldAlert, Star, Trophy, Package, Copy } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useVouchCount } from '../../hooks/useVouchCount';
import { useScamReports } from '../../hooks/useScamReports';

export default function VendorStorefront({ isOpen, onClose, vendorPubkey, profiles, identity, onOpenChat, onBuy }) {
  const groupMessages = useChatStore(s => s.groupMessages);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [tab, setTab] = useState('products');
  const [copied, setCopied] = useState(false);
  
  const { vouchCount, tier } = useVouchCount({ identity, targetPubkey: vendorPubkey });
  const { reportCount } = useScamReports({ identity, targetPubkey: vendorPubkey });

  useEffect(() => {
    if (!isOpen || !vendorPubkey) return;
    
    // Collect all products this vendor posted across all groups
    const found = [];
    const seen = new Set();
    Object.values(groupMessages).forEach(msgs => {
      (msgs || []).forEach(m => {
        if (m.pubkey !== vendorPubkey) return;
        try {
          const p = JSON.parse(m.rawContent || '{}');
          if (p.type === 'product' && !seen.has(m.id)) {
            seen.add(m.id);
            found.push({ id: m.id, ...p });
          }
        } catch (e) {}
      });
    });
    setProducts(found.sort((a, b) => (b.dropUntil || 0) - (a.dropUntil || 0)));

    // Fetch reviews (kind 10005)
    (async () => {
      try {
        const { getAuthenticatedPool } = await import('../../lib/pool');
        const { generalRelays, queryWithTimeout } = await import('../../lib/relays');
        const pool = await getAuthenticatedPool(identity);
        const evs = await queryWithTimeout(pool, generalRelays, {
          kinds: [10005],
          '#p': [vendorPubkey],
          limit: 50
        }, 4000);
        const revs = evs.map(ev => ({
          id: ev.id,
          pubkey: ev.pubkey,
          rating: parseInt(ev.tags.find(t => t[0] === 'rating')?.[1] || '0'),
          text: ev.content,
          timestamp: ev.created_at
        })).sort((a, b) => b.timestamp - a.timestamp);
        setReviews(revs);
      } catch (e) {}
    })();
  }, [isOpen, vendorPubkey, groupMessages, identity]);

  if (!isOpen || !vendorPubkey) return null;

  const profile = profiles[vendorPubkey] || {};
  const displayName = profile.displayName || profile.name || `User ${vendorPubkey.slice(0, 8)}`;
  const bio = profile.about || '';
  const avatar = profile.picture;
  
  const tierData = {
    elite: { label: 'Elite Vendor', icon: <Trophy size={14} />, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
    trusted: { label: 'Trusted Vendor', icon: <Shield size={14} />, color: 'text-green-400 bg-green-500/10 border-green-500/30' },
    new: { label: 'New Vendor', icon: <Star size={14} />, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' }
  }[tier];

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0';

  const handleCopyPubkey = async () => {
    try {
      await navigator.clipboard.writeText(vendorPubkey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
        <motion.div 
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} 
          transition={{ type: 'spring', damping: 25, stiffness: 300 }} 
          onClick={e => e.stopPropagation()} 
          className="w-full max-w-md bg-[#1c1c1e] rounded-t-[2rem] border-t border-white/10 max-h-[92vh] flex flex-col"
        >
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-2" />
          
          {/* Header with close */}
          <div className="flex justify-end p-4 pb-0">
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50 hover:text-white">
              <X size={16}/>
            </button>
          </div>

          {/* Profile header */}
          <div className="px-6 pb-4 flex flex-col items-center text-center">
            {avatar ? (
              <img src={avatar} className="w-24 h-24 rounded-full object-cover border-2 border-white/10 mb-3" alt="" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 text-blue-300 flex items-center justify-center font-bold text-3xl mb-3 border-2 border-white/10">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            
            <h2 className="text-xl font-bold text-white mb-1">{displayName}</h2>
            
            {bio && <p className="text-sm text-white/60 mb-3 max-w-xs">{bio}</p>}
            
            {/* Tier badge */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${tierData.color}`}>
              {tierData.icon}
              {tierData.label} • {vouchCount} vouch{vouchCount !== 1 ? 'es' : ''}
            </div>
            
            {/* Scam warning */}
            {reportCount > 0 && (
              <div className={`mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-bold ${reportCount >= 3 ? 'text-red-400 bg-red-500/10 border-red-500/30' : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'}`}>
                <ShieldAlert size={12} />
                {reportCount} scam report{reportCount !== 1 ? 's' : ''}
              </div>
            )}
            
            {/* Action buttons */}
            <div className="flex gap-2 mt-4 w-full max-w-xs">
              <button 
                onClick={() => { onClose(); onOpenChat?.(vendorPubkey); }}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <MessageSquare size={16} /> Message
              </button>
              <button 
                onClick={handleCopyPubkey}
                className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 hover:text-white transition-colors"
                title="Copy pubkey"
              >
                <Copy size={16} />
              </button>
            </div>
            
            {copied && <p className="text-[10px] text-green-400 mt-1">Pubkey copied</p>}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 px-6 mb-4">
            <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-white">{products.length}</p>
              <p className="text-[10px] text-white/40 uppercase">Products</p>
            </div>
            <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-white">{avgRating}</p>
              <p className="text-[10px] text-white/40 uppercase">Rating</p>
            </div>
            <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-white">{reviews.length}</p>
              <p className="text-[10px] text-white/40 uppercase">Reviews</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-[#0a0a0a] mx-6 p-1 rounded-xl mb-3">
            <button onClick={() => setTab('products')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${tab === 'products' ? 'bg-blue-600 text-white' : 'text-white/40'}`}>
              Products ({products.length})
            </button>
            <button onClick={() => setTab('reviews')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${tab === 'reviews' ? 'bg-blue-600 text-white' : 'text-white/40'}`}>
              Reviews ({reviews.length})
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 pb-8">
            {tab === 'products' ? (
              products.length === 0 ? (
                <div className="text-center text-white/40 py-8">
                  <Package size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No active products</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {products.map(p => (
                    <button 
                      key={p.id} 
                      onClick={() => { onClose(); onBuy?.(p, vendorPubkey); }}
                      className="bg-[#0a0a0a] rounded-2xl overflow-hidden border border-white/5 hover:border-blue-500/40 transition-colors text-left"
                    >
                      {p.image && <img src={p.image} className="w-full h-28 object-cover" alt="" />}
                      <div className="p-3">
                        <p className="text-xs font-bold text-white truncate">{p.title}</p>
                        <p className="text-xs text-green-400 font-mono mt-0.5">${p.priceUsd}</p>
                        {p.dropUntil && p.dropUntil > Math.floor(Date.now() / 1000) && (
                          <p className="text-[9px] text-red-400 font-bold mt-1">⚡ LIVE DROP</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : (
              reviews.length === 0 ? (
                <div className="text-center text-white/40 py-8">
                  <Star size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No reviews yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reviews.map(r => (
                    <div key={r.id} className="bg-[#0a0a0a] border border-white/5 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={10} className={i < r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'} />
                          ))}
                        </div>
                        <span className="text-[10px] text-white/40">{profiles[r.pubkey]?.displayName || `User ${r.pubkey.slice(0, 6)}`}</span>
                        <span className="text-[9px] text-white/30 ml-auto">{new Date(r.timestamp * 1000).toLocaleDateString()}</span>
                      </div>
                      {r.text && <p className="text-xs text-white/80">{r.text}</p>}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}