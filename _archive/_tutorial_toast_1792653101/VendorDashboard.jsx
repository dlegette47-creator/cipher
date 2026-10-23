import React, { useEffect, useState } from 'react';
import { BarChart3, Package, DollarSign, RefreshCw } from 'lucide-react';
import { useVendorStats } from '../../hooks/useVendorStats';
import OrderManagerModal from './OrderManagerModal';
import { useNIP44DM } from '../../hooks/useNIP44DM';
import { useChatStore } from '../../store/chatStore';
import { db } from '../../db';
import { getAuthenticatedPool } from '../../lib/pool';
import { generalRelays, queryWithTimeout } from '../../lib/relays';

export default function VendorDashboard({ identity, products, onBack }) {
  const { dms } = useChatStore();
  const { stats, loading, fetchStats } = useVendorStats({ identity });
  const { sendDM } = useNIP44DM({ identity });
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [fetchingOrders, setFetchingOrders] = useState(false);

  // Fetch orders from BOTH relay + local Dexie (union, deduplicated by order id)
  const loadOrders = async () => {
    setFetchingOrders(true);
    try {
      const pool = await getAuthenticatedPool(identity);
      const { nip44 } = await import('nostr-tools');

      // 1. Get local overrides from Dexie (source of truth for local status changes)
      const localMsgs = await db.messages.toArray();
      const localMap = new Map();
      localMsgs.forEach(m => {
        if (m.data?.type === 'cipher_order') localMap.set(m.id, m);
      });

      // 2. Fetch DMs from Relay
      const events = await queryWithTimeout(pool, generalRelays, { kinds: [4], '#p': [identity.pk], limit: 100 }, 5000);
      
      const combinedMap = new Map();

      // Add relay events, but merge local status if it exists (so it doesn't overwrite your 'shipped' click)
      for (const ev of events) {
        try {
          const shared = nip44.v2.utils.getConversationKey(identity.sk, ev.pubkey);
          const data = JSON.parse(nip44.v2.decrypt(ev.content, shared));
          
          if (data.type === 'cipher_order') {
            const localVersion = localMap.get(ev.id);
            const finalStatus = localVersion?.data?.status || data.status;
            
            combinedMap.set(ev.id, { 
              id: ev.id, chatId: ev.pubkey, pubkey: ev.pubkey, timestamp: ev.created_at, 
              data: { ...data, status: finalStatus } 
            });
          }
        } catch (e) {}
      }

      // Add any local orders that weren't in the relay fetch
      localMsgs.forEach(m => {
        if (m.data?.type === 'cipher_order' && !combinedMap.has(m.id)) {
          combinedMap.set(m.id, m);
        }
      });

      const combined = Array.from(combinedMap.values());
      
      // Sort: Pending first, Completed last
      combined.sort((a, b) => {
        const aComp = a.data.status === 'completed' ? 1 : 0;
        const bComp = b.data.status === 'completed' ? 1 : 0;
        return aComp - bComp;
      });

      setOrders(combined);
    } finally {
      setFetchingOrders(false);
    }
  };

  useEffect(() => {
    fetchStats();
    loadOrders();
  }, [dms, fetchStats]);

  const handleUpdateStatus = async (order, newStatus) => {
    try {
      const updatedMsg = { ...order, data: { ...order.data, status: newStatus } };
      if (updatedMsg.chatId) {
        await db.messages.put(updatedMsg);
      }

      const payload = {
        type: 'order_update',
        orderId: order.id,
        productName: order.data.productName,
        status: newStatus
      };
      await sendDM(order.chatId, payload, null, null);

      setOrders(prev => prev.map(o => o.id === order.id ? updatedMsg : o));
      alert('Order status updated to: ' + newStatus.toUpperCase());
    } catch (e) {
      console.error('Failed to update status', e);
      alert('Failed to update status: ' + e.message);
    }
  };

  return (
    <div className="flex flex-col h-full bg-base relative">
      {/* Fixed Header Area */}
      <div className="flex-shrink-0 p-4 pb-0">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 text-white/60 hover:text-white">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <h2 className="text-xl font-bold text-white">Vendor Dashboard</h2>
          </div>
          <button
            onClick={() => { fetchStats(); loadOrders(); }}
            className="p-2 bg-surfaceLight rounded-full text-white/60 hover:text-white"
          >
            <RefreshCw size={18} className={(loading || fetchingOrders) ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-4">
            <p className="text-xs text-white/50 mb-1 flex items-center gap-1"><BarChart3 size={14}/> Total Sales</p>
            <p className="text-2xl font-bold text-white">{stats.sales}</p>
          </div>
          <div className="bg-[#111] border border-white/10 rounded-2xl p-4">
            <p className="text-xs text-white/50 mb-1 flex items-center gap-1"><DollarSign size={14}/> Fiat Volume</p>
            <p className="text-2xl font-bold text-green-400">${stats.revenueFiat.toFixed(2)}</p>
          </div>
        </div>

        <h3 className="text-sm font-bold text-white/80 mb-3">Orders ({orders.length})</h3>
      </div>

      {/* Scrollable Orders Area */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-24">
        {fetchingOrders ? (
          <p className="text-white/50 text-center py-10">Fetching orders from relay...</p>
        ) : orders.length === 0 ? (
          <p className="text-white/50 text-center py-10">No orders yet.</p>
        ) : (
          <div className="space-y-3">
            {orders.map(o => (
              <div 
                key={o.id} 
                onClick={() => setSelectedOrder(o)}
                className="bg-[#111] border border-white/10 rounded-2xl p-4 cursor-pointer hover:border-white/30 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-white text-sm">{o.data.productName}</p>
                    <p className="text-xs text-white/50">SHIP TO: {o.data.shippingAddress}</p>
                  </div>
                  <p className="text-green-400 font-bold">${o.data.amountFiat}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                  o.data.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                }`}>
                  {o.data.status?.toUpperCase() || 'PENDING'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedOrder && (
        <OrderManagerModal
          order={selectedOrder}
          onUpdateStatus={handleUpdateStatus}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}
