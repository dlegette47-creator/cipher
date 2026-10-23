import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UploadCloud, Loader } from 'lucide-react';
import { uploadToBlossom } from '@nostr-wot/blossom';
import { useChatStore } from '../../store/chatStore';

export default function ProductEditModal({ editingProduct, onClose, onSubmit, identity }) {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const setToast = useChatStore(s => s.setToast);

  useEffect(() => {
    if (editingProduct?.product) {
      setTitle(editingProduct.product.title || '');
      setPrice(editingProduct.product.priceUsd?.toString() || '');
      setImage(editingProduct.product.image || '');
      setDescription(editingProduct.product.description || '');
    }
  }, [editingProduct]);

  if (!editingProduct) return null;

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
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
    } catch (err) {
      setToast({ type: 'error', message: 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title || !price) return;
    setSaving(true);
    await onSubmit({ title, priceUsd: parseFloat(price), image, description });
    setSaving(false);
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
        <motion.div 
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} 
          transition={{ type: 'spring', damping: 25, stiffness: 300 }} 
          onClick={e => e.stopPropagation()} 
          className="w-full max-w-md bg-[#1c1c1e] rounded-t-[2rem] border-t border-white/10 p-5 pb-8 max-h-[90dvh] flex flex-col"
        >
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">Edit Product</h2>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50"><X size={16}/></button>
          </div>

          <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-4">
            <div>
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Image</label>
              <div onClick={() => fileInputRef.current?.click()} className="w-full h-32 bg-[#0a0a0a] border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors overflow-hidden">
                {image ? (
                  <img src={image} className="w-full h-full object-cover" alt="preview" />
                ) : (
                  <div className="flex flex-col items-center text-white/40">
                    {uploading ? <Loader className="animate-spin mb-2" /> : <UploadCloud size={24} className="mb-2" />}
                    <span className="text-xs">{uploading ? 'Uploading...' : 'Tap to change photo'}</span>
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleUpload} className="hidden" />
            </div>

            <div>
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Title</label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Price (USD)</label>
              <input type="number" required step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none resize-none" />
            </div>

            <button type="submit" disabled={saving || uploading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 text-white font-bold py-3.5 rounded-xl transition-colors">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}