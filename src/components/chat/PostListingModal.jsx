import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UploadCloud, Loader } from 'lucide-react';
import { uploadToBlossom } from '@nostr-wot/blossom';
import { useChatStore } from '../../store/chatStore';

export default function PostListingModal({ isOpen, onClose, onSubmit, identity }) {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dropMinutes, setDropMinutes] = useState('');
  const [stockCount, setStockCount] = useState('');
  const fileInputRef = useRef(null);
  const setToast = useChatStore(s => s.setToast);

  if (!isOpen) return null;

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    
    const readAsBase64 = () => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImage(ev.target.result);
        setUploading(false);
        setToast({ type: 'success', message: 'Image ready!' });
      };
      reader.readAsDataURL(file);
    };

    if (!identity?.sk) return readAsBase64();
    
    try {
      const blob = await uploadToBlossom(file, {
        signer: {
          getPublicKey: async () => identity.pk,
          signEvent: async (event) => {
            const { finalizeEvent } = await import('nostr-tools');
            return finalizeEvent(event, identity.sk);
          }
        }
      });
      setImage(blob.url);
      setToast({ type: 'success', message: 'Image uploaded!' });
    } catch (err) {
      console.warn("Blossom upload failed, falling back to Base64", err);
      readAsBase64();
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !price) return;
    setLoading(true);
    await onSubmit({ 
      title, 
      priceUsd: parseFloat(price), 
      image, 
      description,
      dropUntil: dropMinutes ? (Math.floor(Date.now() / 1000) + (parseInt(dropMinutes) * 60)) : null,
      stock: stockCount ? parseInt(stockCount) : null
    });
    setLoading(false);
    setTitle(''); setPrice(''); setImage(''); setDescription(''); setDropMinutes(''); setStockCount('');
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
        <motion.div 
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} 
          transition={{ type: 'spring', damping: 25, stiffness: 300 }} 
          onClick={e => e.stopPropagation()} 
          className="w-full sm:max-w-md bg-[#1c1c1e] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl border border-white/10 max-h-[85dvh] flex flex-col mb-[60px] sm:mb-0" 
        >
          <div className="flex justify-between items-center p-5 pb-3 border-b border-white/5 shrink-0">
            <h2 className="text-lg font-bold text-white">Post a Listing</h2>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50 hover:text-white"><X size={18}/></button>
          </div>
          
          <div className="p-5 overflow-y-auto flex-1">
            <form id="listing-form" onSubmit={handleSubmit} className="space-y-4">
              
              <div className="flex gap-4 items-start">
                <div onClick={() => fileInputRef.current?.click()} className="w-24 h-24 shrink-0 bg-[#0a0a0a] border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors overflow-hidden">
                  {image ? (
                    <img src={image} className="w-full h-full object-cover" alt="preview" />
                  ) : (
                    <div className="flex flex-col items-center text-white/40">
                      {uploading ? <Loader size={20} className="animate-spin mb-1" /> : <UploadCloud size={20} className="mb-1" />}
                      <span className="text-[10px]">{uploading ? '...' : 'Upload'}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Product Title</label>
                  <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 1lb Blue Dream" className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                </div>
              </div>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleUpload} className="hidden" />

              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Price (USD)</label>
                <input type="number" required step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Description (Optional)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Details, shipping info..." className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none resize-none" />
              </div>
              <div className="border-t border-white/5 pt-4">
                <p className="text-xs font-bold text-green-400 uppercase tracking-wider mb-2">⚡ Live Drop (Optional)</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-white/40 uppercase mb-1 block">Countdown</label>
                    <input type="number" value={dropMinutes} onChange={e => setDropMinutes(e.target.value)} placeholder="Minutes" className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-green-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-white/40 uppercase mb-1 block">Stock</label>
                    <input type="number" value={stockCount} onChange={e => setStockCount(e.target.value)} placeholder="Qty" className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-green-500 outline-none" />
                  </div>
                </div>
                <p className="text-[10px] text-white/30 mt-1">Leave blank for instant listing</p>
              </div>
            </form>
          </div>
          
          <div className="p-4 bg-[#171717] border-t border-white/5 shrink-0 rounded-b-[2rem]">
            <button type="submit" form="listing-form" disabled={loading || uploading || !title || !price} className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 disabled:text-white/50 text-white font-bold py-3.5 rounded-xl transition-colors active:scale-[0.98]">
              {loading ? 'Posting...' : 'Send to Chat'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
