import React, { useState, useEffect } from 'react';
import { Compass, Image as ImageIcon } from 'lucide-react';
import OneTapCheckout from './components/OneTapCheckout';
import { useNIP44DM } from './hooks/useNIP44DM';
import { saveMessage } from './db';
import { useChatStore } from './store/chatStore';

export default function Shop({ identity, setActiveTab }) {
  const { sendDM } = useNIP44DM({ identity });
  const setDms = useChatStore((s) => s.setDms);
  const openChat = useChatStore((s) => s.openChat);
  const setToast = useChatStore((s) => s.setToast);
  const [globalProducts, setGlobalProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutProduct, setCheckoutProduct] = useState(null);

  useEffect(() => {
    if (!identity?.pk) return;
    setLoading(true);

    const fetchMarketplace = async () => {
      try {
        const { SimplePool } = await import('nostr-tools');
        const pool = new SimplePool();
        
        // Fetch all NIP-99 product listings (kind 30402)
        const events = await pool.querySync(
          ['wss://groups.aegispayhq.com', 'wss://relay.primal.net'],
          { kinds: [30402], '#t': ['cipher_marketplace'], limit: 100 }
        );

        const parsed = events.map(ev => {
          const getTag = (name) => ev.tags.find(t => t[0] === name)?.[1];
          const priceStr = ev.tags.find(t => t[0] === 'price')?.[1] || '0';
          return {
            id: getTag('d') || ev.id,
            name: getTag('title') || 'Unnamed Product',
            priceUsd: parseFloat(priceStr),
            image: getTag('image') || '',
            vendorPubkey: ev.pubkey
          };
        }).filter(p => p.priceUsd > 0);

        // Deduplicate by product ID
        const unique = Array.from(new Map(parsed.map(p => [p.id, p])).values());
        setGlobalProducts(unique);
      } catch (err) {
        console.error("Failed to fetch marketplace:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketplace();
  }, [identity?.pk]);

  const handleConfirmOrder = async (order) => {
    console.log('[BUY] 1. handleConfirmOrder fired with:', order);
    console.log('[BUY] ⚠️ CHECK VENDOR PUBKEY:', order.vendorPubkey);
    setCheckoutProduct(null);
    
    const targetDm = order.vendorPubkey;
    console.log('[BUY] 2. targetDm (vendor pubkey):', targetDm);
    if (!targetDm) {
      console.error('[BUY] 3. ABORTING - vendor pubkey missing');
      if (setToast) setToast({ type: 'error', message: 'Vendor pubkey missing' });
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const payload = { 
      type: 'cipher_order', 
      productName: order.productName, 
      amountFiat: order.amountFiat,
      amountCrypto: order.amountCrypto,
      currency: order.currency,
      shippingAddress: order.shippingAddress || 'No address provided',
      shippingAddress: order.shippingAddress || 'No address provided',
      status: 'payment_sent',
      shippingAddress: order.shippingAddress || 'No address provided'
    };

    try {
      // 1. Save to Dexie
      await saveMessage(targetDm, { 
        id: tempId, 
        clientId: tempId,
        isSender: true, 
        timestamp: Math.floor(Date.now() / 1000), 
        data: payload, 
        pubkey: identity.pk, 
        isGroup: false 
      });

      // 2. Update Zustand Store (Optimistic UI)
      setDms(prev => {
        const chatMsgs = prev[targetDm] || [];
        return { 
          ...prev, 
          [targetDm]: [...chatMsgs, { 
            id: tempId, clientId: tempId, isSender: true, 
            timestamp: Math.floor(Date.now() / 1000), data: payload, pubkey: identity.pk 
          }] 
        };
      });

      // 3. Send DM to Vendor
      console.log('[BUY] 3. Calling sendDM...');
      const sendResult = await sendDM(targetDm, payload, tempId, null);
      console.log('[BUY] 4. sendDM result:', sendResult);

      // 4. Switch to Chat Tab and Open the DM
      console.log('[BUY] 5. Calling openChat + setActiveTab');
      openChat('dm', targetDm);
      if (setActiveTab) setActiveTab('chat');
      console.log('[BUY] 6. DONE - switched to chat tab');
      
      if (setToast) setToast({ type: 'success', message: 'Order sent to vendor!' });

    } catch (e) {
      console.error("[BUY] FAILED:", e);
      if (setToast) setToast({ type: 'error', message: 'Failed to send order DM' });
    }
  };

  return (
    <>
      <div className="p-4 h-full relative pb-24 bg-base overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Compass size={24} className="text-white" />
            <h2 className="text-2xl font-bold tracking-tight">Explore</h2>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center mt-20">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : globalProducts.length === 0 ? (
          <div className="text-center text-white/40 mt-20">
            <Compass size={48} className="mx-auto mb-4 opacity-50" />
            <p>No products found on the network yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {globalProducts.map(p => (
              <div key={p.id} className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden flex flex-col group">
                <div className="relative h-32 w-full cursor-pointer overflow-hidden" onClick={() => setCheckoutProduct(p)}>
                  {p.image ? (
                    <img src={p.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/20"><ImageIcon size={32} /></div>
                  )}
                </div>
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-sm font-semibold truncate text-white">{p.name}</p>
                    <p className="text-green-400 font-bold">${p.priceUsd}</p>
                  </div>
                  <button 
                    onClick={() => setCheckoutProduct(p)}
                    className="w-full mt-3 bg-white/5 hover:bg-blue-600 text-white text-xs font-bold py-2 rounded-lg transition-colors border border-white/5 hover:border-blue-500"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <OneTapCheckout
        isOpen={!!checkoutProduct}
        onClose={() => setCheckoutProduct(null)}
        product={checkoutProduct}
        vendor={{ pubkey: checkoutProduct?.pubkey || '', btcAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', xmrAddress: '44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGv7SqSsaBYBb98uNbr2VBBEt7f2wfn3RVGQBEP3A' }}
        identity={identity}
        onConfirmOrder={handleConfirmOrder}
      />
    </>
  );
}
