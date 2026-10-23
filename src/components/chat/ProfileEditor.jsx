import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Loader, Save } from 'lucide-react';
import { uploadToBlossom } from '@nostr-wot/blossom';
import { useChatStore } from '../../store/chatStore';
import { updateProfileCache } from '../../useProfiles';
import ImageCropper from './ImageCropper';

export default function ProfileEditor({ isOpen, onClose, identity, currentProfile }) {
  const [displayName, setDisplayName] = useState('');
  const [about, setAbout] = useState('');
  const [picture, setPicture] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const fileInputRef = useRef(null);
  const setToast = useChatStore(s => s.setToast);
  const setProfiles = useChatStore(s => s.setProfiles);

  useEffect(() => {
    if (currentProfile) {
      setDisplayName(currentProfile.displayName || currentProfile.name || '');
      setAbout(currentProfile.about || '');
      setPicture(currentProfile.picture || '');
    }
  }, [currentProfile, isOpen]);

  if (!isOpen || !identity) return null;

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPendingImage(reader.result);
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropComplete = async (croppedFile) => {
    setPendingImage(null);
    setUploading(true);
    try {
      const blob = await uploadToBlossom(croppedFile, {
        signer: {
          getPublicKey: async () => identity.pk,
          signEvent: async (event) => {
            const { finalizeEvent } = await import('nostr-tools');
            return finalizeEvent(event, identity.sk);
          }
        }
      });
      setPicture(blob.url);
      setToast({ type: 'success', message: 'Photo updated' });
    } catch (err) {
      setToast({ type: 'error', message: 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      setToast({ type: 'error', message: 'Display name is required' });
      return;
    }
    setSaving(true);
    try {
      const { finalizeEvent } = await import('nostr-tools');
      const { getAuthenticatedPool } = await import('../../lib/pool');
      const { generalRelays } = await import('../../lib/relays');
      
      const pool = await getAuthenticatedPool(identity);
      const existing = currentProfile || {};
      
      // Preserve the existing username (which is permanent)
      const isNpub = existing.name && existing.name.startsWith('npub');
      const username = isNpub ? '' : (existing.name || existing.username || '');
      
      const ev = finalizeEvent({
        kind: 0,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: JSON.stringify({
          name: username,
          display_name: displayName.trim(),
          about: about.trim(),
          picture: picture || null
        })
      }, identity.sk);

      await Promise.allSettled(pool.publish(generalRelays, ev));

      // Update local cache
      const updatedProfile = {
        pubkey: identity.pk,
        name: username,
        displayName: displayName.trim(),
        about: about.trim(),
        picture: picture || null
      };
      
      await updateProfileCache(identity.pk, updatedProfile);
      setProfiles(prev => ({ ...prev, [identity.pk]: updatedProfile }));
      
      setToast({ type: 'success', message: 'Profile saved!' });
      onClose();
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Save failed: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
        <motion.div 
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} 
          transition={{ type: 'spring', damping: 25, stiffness: 300 }} 
          onClick={e => e.stopPropagation()} 
          className="w-full max-w-md bg-[#1c1c1e] rounded-t-[2rem] border-t border-white/10 p-5 pb-sheet max-h-[90dvh] flex flex-col"
        >
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">Edit Profile</h2>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50"><X size={16}/></button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Avatar */}
            <div className="flex justify-center mb-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative w-24 h-24 rounded-full overflow-hidden cursor-pointer group border-2 border-white/10 hover:border-blue-500/50 transition-colors"
              >
                {picture ? (
                  <img src={picture} className="w-full h-full object-cover" alt="avatar" />
                ) : (
                  <div className="w-full h-full bg-[#0a0a0a] flex items-center justify-center">
                    <Camera size={28} className="text-white/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera size={20} className="text-white" />
                </div>
                {uploading && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <Loader size={24} className="animate-spin text-white" />
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" />
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Display Name</label>
                <input 
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Bio</label>
                <textarea 
                  value={about}
                  onChange={e => setAbout(e.target.value)}
                  rows={3}
                  placeholder="Tell people about yourself or your shop..."
                  maxLength={200}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none resize-none"
                />
                <p className="text-[10px] text-white/30 mt-1 text-right">{about.length}/200</p>
              </div>

              <div className="bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3">
                <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Username (permanent)</p>
                <p className="text-sm text-white/60 font-mono">@{currentProfile?.name?.startsWith('npub') ? 'Not Set' : (currentProfile?.name || 'unknown')}</p>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={saving || uploading || !displayName.trim()}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Save size={16}/> {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </motion.div>
      
      {pendingImage && (
        <ImageCropper
          imageSrc={pendingImage}
          onComplete={handleCropComplete}
          onClose={() => setPendingImage(null)}
        />
      )}
    </motion.div>
    </AnimatePresence>
  );
}