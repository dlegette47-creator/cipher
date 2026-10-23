import React from 'react';
import { Package, ChevronRight, Truck, CheckCircle2, Clock } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

export default function MyOrders({ identity, setView }) {
  const dms = useChatStore(s => s.dms);
  const profiles = useChatStore(s => s.profiles);

  // Aggregate all orders from all DMs
  const allOrders = [];
  Object.entries(dms).forEach(([peerPubkey, msgs]) => {
    msgs.forEach(msg => {
      if (msg.data?.type === 'cipher_order' || msg.data?.type === 'order_request') {
        allOrders.push({ ...msg, peerPubkey });
      }
    });
  });

  // Sort newest first
  allOrders.sort((a, b) => b.timestamp - a.timestamp);

  const getStatusUI = (status) => {
    switch (status) {
      case 'completed': return { icon: <CheckCircle2 size={16} className="text-green-400" />, label: 'Delivered', color: 'text-green-400 bg-green-400/10 border-green-400/20' };
      case 'shipped': return { icon: <Truck size={16} className="text-purple-400" />, label: 'Shipped', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' };
      case 'accepted': return { icon: <Package size={16} className="text-blue-400" />, label: 'Processing', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' };
      case 'pending': return { icon: <Clock size={16} className="text-yellow-400" />, label: 'Pending', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' };
      default: return { icon: <Package size={16} className="text-white/50" />, label: status?.toUpperCase() || 'UNKNOWN', color: 'text-white/50 bg-white/5 border-white/10' };
    }
  };

  return (
    <div className="h-full p-4 animate-fade-in flex-1 min-h-0 overflow-y-auto pb-8 bg-[#0a0a0a]">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setView('main')} className="p-2 -ml-2 text-white/60 hover:text-white">
          <ChevronRight size={24} className="rotate-180" />
        </button>
        <h2 className="text-xl font-bold text-white">My Orders</h2>
      </div>

      {allOrders.length === 0 ? (
        <div className="text-center text-white/40 mt-20">
          <Package size={48} className="mx-auto mb-4 opacity-50" />
          <p>No orders yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allOrders.map((order, i) => {
            const statusUI = getStatusUI(order.data.status);
            const product = order.data.product || order.data; 
            return (
              <div key={`${order.id}-${i}`} className="bg-[#111] border border-white/5 rounded-2xl p-4 flex gap-4 items-center">
                {product.image ? (
                  <img src={product.image} className="w-14 h-14 rounded-xl object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center">
                    <Package size={20} className="text-white/30" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{product.productName || product.title || 'Unknown Product'}</p>
                  <p className="text-xs text-white/50 truncate">Vendor: {profiles[order.peerPubkey]?.displayName || order.peerPubkey.slice(0, 8)}</p>
                </div>
                <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${statusUI.color}`}>
                  {statusUI.icon}
                  <span className="text-[10px] font-bold uppercase tracking-wider">{statusUI.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}