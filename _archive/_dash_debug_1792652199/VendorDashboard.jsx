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
      const seen = new Set();
      const combined = [];
      
      const pool = await getAuthenticatedPool(identity);
      const { nip44 } = await import('nostr-tools');

      // 1. Fetch Completed Orders (kind 10006) from relay
      const completedEvs = await queryWithTimeout(pool, generalRelays, {
        kinds: [10006],
        '#p': [identity.pk]
      }, 5000);
      const completedIds = new Set(completedEvs.flatMap(ev => ev.tags.filter(t => t[0] === 'e').map(t => t[1])));

      // 2. Fetch DMs from Relay (Fresh pull)
      const events = await queryWithTimeout(pool, generalRelays, {
        kinds: [4],
        '#p': [identity.pk],
        limit: 100
      });

      for (const ev of events) {
        try {
          const shared = nip44.v2.utils.getConversationKey(identity.sk, ev.pubkey);
          const text = nip44.v2.decrypt(ev.content, shared);
          const data = JSON.parse(text);
          
          if (data.type === 'cipher_order' && !seen.has(ev.id)) {
            seen.add(ev.id);
            const isCompleted = completedIds.has(ev.id) || data.status === 'completed';
            combined.push({ 
              id: ev.id, chatId: ev.pubkey, pubkey: ev.pubkey, timestamp: ev.created_at, 
              data: { ...data, status: isCompleted ? 'completed' : data.status } 
            });
          }
        } catch (e) {}
      }

      // 3. Fetch from local Dexie (to catch anything missed)
      const localMsgs = await db.messages.toArray();
      localMsgs.forEach(m => {
        if (!m.isSender && m.data?.type === 'cipher_order' && !seen.has(m.id)) {
          seen.add(m.id);
          const isCompleted = completedIds.has(m.id) || m.data.status === 'completed';
          combined.push({ ...m, chatId: m.chatId, data: { ...m.data, status: isCompleted ? 'completed' : m.data.status } });
        }
      });

      // Sort Pending First
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
    <div className="p-4 animate-slide-up pb-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 text-white/60 hover:text-white">←</button>
          <h2 className="text-2xl font-bold">Vendor Dashboard</h2>
        </div>
        <button
          onClick={async () => { await fetchStats(); await loadOrders(); }}
          className="p-2 bg-surfaceLight rounded-full text-white/60 hover:text-white"
        >
          <RefreshCw size={18} className={(loading || fetchingOrders) ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-[#111] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-white/50 mb-1">
            <Package size={14} /> Total Sales
          </div>
          <p className="text-2xl font-bold text-white">{stats.sales}</p>
        </div>
        <div className="bg-[#111] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-white/50 mb-1">
            <DollarSign size={14} /> Fiat Volume
          </div>
          <p className="text-2xl font-bold text-green-400">${stats.revenueFiat.toFixed(2)}</p>
        </div>
        <div className="bg-[#111] border border-white/10 rounded-2xl p-4">
          <p className="text-xs text-white/50 mb-1">BTC Earned</p>
          <p className="text-lg font-bold text-orange-400">{stats.btc.toFixed(6)} ₿</p>
        </div>
        <div className="bg-[#111] border border-white/10 rounded-2xl p-4">
          <p className="text-xs text-white/50 mb-1">XMR Earned</p>
          <p className="text-lg font-bold text-orange-400">{stats.xmr.toFixed(4)} ɱ</p>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-bold text-white/70 mb-3 flex items-center gap-2">
          <BarChart3 size={16} /> Earned Badges
        </h3>
        {stats.badges.length === 0 ? (
          <p className="text-xs text-white/40 bg-white/5 p-3 rounded-xl text-center">Make your first sale to earn badges!</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {stats.badges.map(b => (
              <div key={b.id} className={`flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-xs font-bold ${b.color}`}>
                <span>{b.icon}</span> {b.name}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-bold text-white/70 mb-3">Orders ({orders.length})</h3>
        {fetchingOrders && orders.length === 0 && (
          <p className="text-xs text-white/40 text-center py-4 animate-pulse">Fetching orders from relays...</p>
        )}
        {!fetchingOrders && orders.length === 0 && (
          <p className="text-xs text-white/40 bg-white/5 p-3 rounded-xl text-center">No orders yet.</p>
        )}
        <div className="space-y-2">
          {orders.map(o => (
            <div
              key={o.id}
              onClick={() => setSelectedOrder(o)}
              className="bg-[#111] border border-white/10 rounded-xl p-3 cursor-pointer hover:bg-white/5 transition-colors"
            >
              <div className="flex justify-between items-start mb-1">
                <p className="text-sm font-bold text-white">{o.data.productName}</p>
                <p className="text-xs font-bold text-green-400">${o.data.amountFiat}</p>
              </div>
              <p className="text-[10px] text-white/50 uppercase mb-1">Ship To:</p>
              <p className="text-xs text-white/80 bg-black/50 p-2 rounded mb-2">{o.data.shippingAddress || 'No address provided'}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                o.data.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                o.data.status === 'shipped' ? 'bg-purple-500/20 text-purple-400' :
                o.data.status === 'accepted' ? 'bg-blue-500/20 text-blue-400' :
                o.data.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                'bg-yellow-500/20 text-yellow-400' // Payment Sent / Pending
              }`}>
                {o.data.status === 'payment_sent' ? '⏳ Awaiting Buyer Confirmation' : o.data.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-white/70 mb-3">Active Products ({products.length})</h3>
        {products.length === 0 ? (
          <p className="text-xs text-white/40">No products listed.</p>
        ) : (
          <div className="space-y-2">
            {products.map(p => (
              <div key={p.id} className="bg-[#111] border border-white/10 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {p.image ? <img src={p.image} className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 bg-white/5 rounded-lg" />}
                  <div>
                    <p className="text-sm font-semibold text-white">{p.name}</p>
                    <p className="text-xs text-green-400">${p.priceUsd}</p>
                  </div>
                </div>
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
