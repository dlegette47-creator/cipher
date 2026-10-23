import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Store, Shield, ShieldAlert, Star, ChevronRight } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { getAuthenticatedPool } from '../../lib/pool';
import { generalRelays, queryWithTimeout } from '../../lib/relays';

export default function VendorDirectory({ isOpen, onClose, groupId, profiles, identity, onOpenVendor }) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const groupMessages = useChatStore(s => s.groupMessages);

  useEffect(() => {
    if (!isOpen || !groupId) return;
    let mounted = true;
    setLoading(true);

    const fetchVendors = async () => {
      const msgs = groupMessages[groupId] || [];
      const vendorSet = new Map();
      
      // Find all vendors who posted a product in this group
      msgs.forEach(m => {
        try {
          const p = JSON.parse(m.rawContent || '{}');
          if (p.type === 'product' && !vendorSet.has(m.pubkey)) {
            vendorSet.set(m.pubkey, {
              pubkey: m.pubkey,
              productCount: 0,
              lastPosted: 0,
              vouchCount: 0,
              reportCount: 0
            });
          }
          if (p.type === 'product') {
            const v = vendorSet.get(m.pubkey);
            if (v) {
              v.productCount++;
              v.lastPosted = Math.max(v.lastPosted, m.timestamp);
            }
          }
        } catch (e) {}
      });

      // Fetch vouch & report counts for each vendor in batch
      if (identity?.sk && vendorSet.size > 0) {
        try {
          const pool = await getAuthenticatedPool(identity);
          const vendorPks = Array.from(vendorSet.keys());
          
          const [vouchEvents, reportEvents] = await Promise.all([
            queryWithTimeout(pool, generalRelays, { kinds: [10004], '#p': vendorPks, limit: 500 }, 4000),
            queryWithTimeout(pool, generalRelays, { kinds: [1984], '#p': vendorPks, limit: 200 }, 4000)
          ]);

          // Count unique vouches/reports per vendor
          const vouchMap = {};
          const reportMap = {};
          
          vouchEvents.forEach(ev => {
            const p = ev.tags.find(t => t[0] === 'p')?.[1];
            if (p && ev.pubkey !== p) {
              if (!vouchMap[p]) vouchMap[p] = new Set();
              vouchMap[p].add(ev.pubkey);
            }
          });
          
          reportEvents.forEach(ev => {
            const p = ev.tags.find(t => t[0] === 'p')?.[1];
            const reportType = ev.tags.find(t => t[0] === 'report')?.[1];
            if (p && (reportType === 'scam' || !reportType)) {
              if (!reportMap[p]) reportMap[p] = new Set();
              reportMap[p].add(ev.pubkey);
            }
          });

          vendorSet.forEach((v, pk) => {
            v.vouchCount = vouchMap[pk]?.size || 0;
            v.reportCount = reportMap[pk]?.size || 0;
          });
        } catch (e) {}
      }

      const list = Array.from(vendorSet.values())
        .sort((a, b) => {
          // Sort by scam reports (worst first, so admins see them), then vouch count, then product count
          if (b.reportCount !== a.reportCount) return b.reportCount - a.reportCount;
          if (b.vouchCount !== a.vouchCount) return b.vouchCount - a.vouchCount;
          return b.productCount - a.productCount;
        });

      if (mounted) {
        setVendors(list);
        setLoading(false);
      }
    };

    fetchVendors();
    return () => { mounted = false; };
  }, [isOpen, groupId, groupMessages, identity?.sk]);

  if (!isOpen) return null;

  const getTier = (v) => {
    if (v.reportCount >= 3) return { label: '⚠️ Reported', color: 'text-red-400 bg-red-500/10 border-red-500/30' };
    if (v.vouchCount >= 10) return { label: '🏆 Elite', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' };
    if (v.vouchCount >= 3) return { label: '🛡️ Trusted', color: 'text-green-400 bg-green-500/10 border-green-500/30' };
    return { label: '🟡 New', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
  };

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
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Store size={18} className="text-blue-400" /> Vendors in this Group
            </h2>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50"><X size={16}/></button>
          </div>

          <p className="text-[11px] text-white/40 mb-3">Sorted by trust level. Every vendor here has posted products in this group.</p>

          <div className="flex-1 overflow-y-auto space-y-2">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : vendors.length === 0 ? (
              <div className="text-center text-white/40 py-12">
                <Store size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No vendors yet</p>
                <p className="text-xs text-white/30 mt-1">Products posted in this group will appear here</p>
              </div>
            ) : (
              vendors.map(v => {
                const tier = getTier(v);
                const profile = profiles[v.pubkey] || {};
                return (
                  <button
                    key={v.pubkey}
                    onClick={() => { onOpenVendor?.(v.pubkey); onClose(); }}
                    className="w-full bg-[#0a0a0a] hover:bg-[#1a1a1a] border border-white/5 rounded-2xl p-3 text-left transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {profile.picture ? (
                        <img src={profile.picture} className="w-12 h-12 rounded-full object-cover" alt="" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-lg">
                          {(profile.displayName || 'V').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {profile.displayName || profile.name || `Vendor ${v.pubkey.slice(0, 6)}`}
                        </p>
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold mt-1 ${tier.color}`}>
                          {tier.label} • {v.vouchCount} vouch{v.vouchCount !== 1 ? 'es' : ''}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-white/30 shrink-0" />
                    </div>
                    <div className="flex gap-3 mt-2 text-[10px] text-white/40">
                      <span>{v.productCount} listing{v.productCount !== 1 ? 's' : ''}</span>
                      {v.reportCount > 0 && <span className="text-red-400">{v.reportCount} report{v.reportCount !== 1 ? 's' : ''}</span>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}