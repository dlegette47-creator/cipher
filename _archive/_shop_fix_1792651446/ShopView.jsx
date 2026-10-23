import React, { useState } from 'react';
import { Store, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import OneTapCheckout from './OneTapCheckout';

export default function ShopView({ myProducts, setMyProducts, setCheckoutProduct, setView, identity, setToast, checkoutProduct, onConfirmOrder }) {
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', priceUsd: '', image: '' });

  return (
    <>
      <div className="p-4 h-full relative pb-24 bg-base overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className="p-2 text-white/60 hover:text-white"><ArrowLeft size={20}/></button>
            <h2 className="text-2xl font-bold tracking-tight">My Shop</h2>
          </div>
          <button onClick={() => setShowAddProduct(true)} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
            + Add Product
          </button>
        </div>

        {myProducts.length === 0 ? (
          <div className="text-center text-white/40 mt-20">
            <Store size={48} className="mx-auto mb-4 opacity-50" />
            <p>No products yet.</p>
            <p className="text-sm mt-2">Add your first product to start selling.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {myProducts.map(p => (
              <div key={p.id} className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden flex flex-col group">
                <div className="relative h-32 w-full cursor-pointer overflow-hidden" onClick={() => setCheckoutProduct(p)}>
                  {p.image ? (
                    <img src={p.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/20"><ImageIcon size={32} /></div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-white text-xs font-bold bg-black/60 px-3 py-1.5 rounded-full">View</span>
                  </div>
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

        {showAddProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md p-6 relative">
              <button onClick={() => setShowAddProduct(false)} className="absolute top-4 right-4 text-white/50 hover:text-white">✕</button>
              <h2 className="text-xl font-bold mb-4">Add New Product</h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!newProduct.name || !newProduct.priceUsd) return;
                const productId = Date.now().toString();
                const newProdObj = { ...newProduct, id: productId, priceUsd: parseFloat(newProduct.priceUsd) };
                setMyProducts([...myProducts, newProdObj]);
                
                // Publish to Nostr relays as a NIP-99 Product Listing (kind 30402)
                try {
                  import('nostr-tools').then(async ({ finalizeEvent, SimplePool }) => {
                    const pool = new SimplePool();
                    const ev = finalizeEvent({
                      kind: 30402,
                      created_at: Math.floor(Date.now() / 1000),
                      tags: [
                        ['d', productId],
                        ['title', newProduct.name],
                        ['price', newProduct.priceUsd, 'USD'],
                        ['image', newProduct.image || ''],
                        ['t', 'cipher_marketplace'], // Filter tag
                        ['published_at', Math.floor(Date.now() / 1000).toString()]
                      ],
                      content: ''
                    }, identity.sk);
                    await pool.publish(['wss://relay.primal.net', 'wss://groups.aegispayhq.com'], ev);
                    console.log('✅ Product published to relays!');
                  });
                } catch (e) { console.error('Failed to publish product:', e); }

                setNewProduct({ name: '', priceUsd: '', image: '' });
                setShowAddProduct(false);
                setToast({ type: 'success', message: 'Product published globally!' });
              }} className="space-y-4">
                <input type="text" placeholder="Product Name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500" required />
                <input type="number" step="0.01" placeholder="Price (USD)" value={newProduct.priceUsd} onChange={e => setNewProduct({...newProduct, priceUsd: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500" required />
                <input type="text" placeholder="Image URL (Optional)" value={newProduct.image} onChange={e => setNewProduct({...newProduct, image: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500" />
                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg">Save Product</button>
              </form>
            </div>
          </div>
        )}
      </div>

      <OneTapCheckout
        isOpen={!!checkoutProduct}
        onClose={() => setCheckoutProduct(null)}
        product={checkoutProduct}
        vendor={{ pubkey: identity?.pk || '', btcAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', xmrAddress: '44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGv7SqSsaBYBb98uNbr2VBBEt7f2wfn3RVGQBEP3A' }}
        identity={identity}
        onConfirmOrder={onConfirmOrder}
      />
    </>
  );
}
