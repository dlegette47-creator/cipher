import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Share2, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useChatStore } from '../../store/chatStore';

export default function GroupInviteModal({ isOpen, onClose, group }) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const setToast = useChatStore(s => s.setToast);

  if (!isOpen || !group) return null;

  const inviteLink = `${window.location.origin}?group=${group.id}&name=${encodeURIComponent(group.name || 'Group')}`;
  const qrValue = `cipher://group/${group.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setToast({ type: 'success', message: 'Invite link copied!' });
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setToast({ type: 'error', message: 'Failed to copy' });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${group.name} on Cipher`,
          text: `Come join my group "${group.name}" on Cipher!`,
          url: inviteLink
        });
      } catch (e) {}
    } else {
      handleCopyLink();
    }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
        <motion.div 
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} 
          transition={{ type: 'spring', damping: 25, stiffness: 300 }} 
          onClick={e => e.stopPropagation()} 
          className="w-full max-w-md bg-[#1c1c1e] rounded-t-[2rem] border-t border-white/10 p-5 pb-8"
        >
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">Invite to {group.name}</h2>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50"><X size={16}/></button>
          </div>

          {!showQR ? (
            <>
              <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4 mb-4">
                <p className="text-[10px] font-bold uppercase text-white/40 mb-2">Invite Link</p>
                <p className="text-xs text-white/80 font-mono break-all mb-3">{inviteLink}</p>
                <button 
                  onClick={handleCopyLink} 
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {copied ? <><Check size={14}/> Copied!</> : <><Copy size={14}/> Copy Link</>}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setShowQR(true)} 
                  className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
                >
                  <QrCode size={24} className="text-white/80" />
                  <span className="text-xs font-semibold text-white">Show QR</span>
                </button>
                <button 
                  onClick={handleNativeShare} 
                  className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
                >
                  <Share2 size={24} className="text-white/80" />
                  <span className="text-xs font-semibold text-white">Share</span>
                </button>
              </div>

              <p className="text-[10px] text-white/40 text-center mt-4">
                Anyone with this link can request to join. Group admins still control membership.
              </p>
            </>
          ) : (
            <>
              <button 
                onClick={() => setShowQR(false)} 
                className="text-xs text-blue-400 mb-4 flex items-center gap-1"
              >
                ← Back
              </button>
              <div className="bg-white p-6 rounded-2xl mx-auto mb-4" style={{ width: 'fit-content' }}>
                <QRCodeSVG value={qrValue} size={200} level="H" />
              </div>
              <p className="text-sm text-white/60 text-center mb-4">Scan to join {group.name}</p>
              <p className="text-[10px] text-white/40 text-center">For in-person meetups and quick joins</p>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}