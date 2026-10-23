import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Loader } from 'lucide-react';
import { uploadToBlossom } from '@nostr-wot/blossom';
import { useChatStore } from '../../store/chatStore';

export default function GroupSettingsModal({ isOpen, onClose, group, identity, onSave }) {
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [avatar, setAvatar] = useState('');
  const [requireApproval, setRequireApproval] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const setToast = useChatStore(s => s.setToast);

  useEffect(() => {
    if (group) {
      setName(group.name || '');
      setAbout(group.about || '');
      setAvatar(group.avatar || '');
      setRequireApproval(group.requireApproval === true);
    }
  }, [group]);

  if (!isOpen || !group) return null;

  const handleAvatarUpload = async (e) => {
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
      setAvatar(blob.url);
    } catch (err) {
      setToast({ type: 'error', message: 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setToast({ type: 'error', message: 'Group name is required' });
      return;
    }
    setSaving(true);
    await onSave({ name: name.trim(), about: about.trim(), avatar, requireApproval });
    setSaving(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-start justify-center" onClick={onClose}>
        <motion.div 
          initial={{ y: '-100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }} 
          transition={{ type: 'spring', damping: 25, stiffness: 300 }} 
          onClick={e => e.stopPropagation()} 
          className="w-full max-w-md bg-[#1c1c1e] rounded-b-[2rem] border-t border-white/10 p-5 pt-10"
        >
                    <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">Group Settings</h2>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50"><X size={16}/></button>
          </div>

          <div className="space-y-4">
            <div className="flex justify-center">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative w-24 h-24 rounded-full bg-[#2c2c2e] border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500/50 transition-colors group"
              >
                {avatar ? (
                  <img src={avatar} className="w-full h-full object-cover" alt="avatar" />
                ) : (
                  <Camera size={28} className="text-white/40 group-hover:text-blue-400 transition-colors" />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader size={24} className="animate-spin text-white" />
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" />
            </div>

            <div>
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Group Name</label>
              <input 
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Group name"
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Description</label>
              <textarea 
                value={about}
                onChange={e => setAbout(e.target.value)}
                rows={2}
                placeholder="What is this group about?"
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between bg-[#0a0a0a] border border-white/10 rounded-xl p-3.5 mt-1">
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Require Approval to Join</p>
              <p className="text-[11px] text-white/40">New members wait for admin approval</p>
            </div>
            <button
              type="button"
              onClick={() => setRequireApproval(!requireApproval)}
              className={`w-12 h-6 rounded-full p-0.5 transition-colors ${requireApproval ? 'bg-blue-500' : 'bg-white/20'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${requireApproval ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <button 
            onClick={handleSave}
            disabled={saving || uploading || !name.trim()}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 text-white font-bold py-3.5 rounded-xl transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}