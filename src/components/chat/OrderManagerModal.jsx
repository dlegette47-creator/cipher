import React, { useState } from 'react';
import { X, Package, MapPin, CheckCircle2, Truck, XCircle } from 'lucide-react';

export default function OrderManagerModal({ order, onUpdateStatus, onClose }) {
  const [updating, setUpdating] = useState(false);

  if (!order) return null;
  const d = order.data;
  console.log("🟢 Modal Order Data:", d);

  const handleUpdate = async (status) => {
    setUpdating(true);
    await onUpdateStatus(order, status);
    setUpdating(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white dark:bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#111] border border-gray-300 dark:border-gray-800 rounded-3xl w-full max-w-sm p-6 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-black dark:text-white/50 hover:text-black dark:text-white">
          <X size={20} />
        </button>
        
        <div className="flex items-center gap-2 mb-4">
          <Package className="text-blue-400" size={24} />
          <h2 className="text-xl font-bold text-black dark:text-white">Order Details</h2>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <p className="text-[10px] text-black dark:text-white/40 uppercase font-bold mb-1">Product</p>
            <p className="text-sm text-black dark:text-white">{d.productName}</p>
          </div>
          
          <div className="flex justify-between bg-white dark:bg-black/30 p-3 rounded-xl border border-gray-300 dark:border-gray-800/50">
            <div>
              <p className="text-[10px] text-black dark:text-white/40 uppercase font-bold mb-1">Amount</p>
              <p className="text-sm text-green-400 font-bold">${d.amountFiat}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-black dark:text-white/40 uppercase font-bold mb-1">Crypto</p>
              <p className="text-xs font-mono text-black dark:text-white/80">{d.amountCrypto} {d.currency?.toUpperCase()}</p>
            </div>
          </div>

          <div>
            <p className="text-[10px] text-black dark:text-white/40 uppercase font-bold mb-1 flex items-center gap-1">
              <MapPin size={10} /> Shipping Address
            </p>
            <div className="bg-white dark:bg-black/30 p-3 rounded-xl border border-gray-300 dark:border-gray-800/50">
              <p className="text-sm text-black dark:text-white whitespace-pre-wrap">{d.shippingAddress || 'No address provided'}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2 border-t border-gray-300 dark:border-gray-800 pt-4">
          <p className="text-xs font-bold text-black dark:text-white/60 mb-2 uppercase tracking-wider">Update Status</p>
          
          <button 
            onClick={() => handleUpdate('accepted')}
            disabled={updating || d.status === 'accepted'}
            className="w-full bg-blue-600/20 text-blue-400 border border-blue-500/30 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-600/30 transition-colors disabled:opacity-50"
          >
            <CheckCircle2 size={18} /> Accept Order
          </button>

          <button 
            onClick={() => handleUpdate('shipped')}
            disabled={updating || d.status === 'shipped'}
            className="w-full bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-600/30 transition-colors disabled:opacity-50"
          >
            <Truck size={18} /> Mark as Shipped
          </button>

          <button 
            onClick={() => handleUpdate('cancelled')}
            disabled={updating || d.status === 'cancelled'}
            className="w-full bg-red-600/20 text-red-400 border border-red-500/30 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-red-600/30 transition-colors disabled:opacity-50"
          >
            <XCircle size={18} /> Cancel Order
          </button>
        </div>
      </div>
    </div>
  );
}
