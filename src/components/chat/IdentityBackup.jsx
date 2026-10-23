import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Upload, Copy, CheckCircle2, AlertTriangle, Key } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { QRCodeSVG } from 'qrcode.react';
import { nip19 } from 'nostr-tools';

export default function IdentityBackup({ isOpen, onClose, identity }) {
  const setToast = useChatStore(s => s.setToast);
  const openDialog = useChatStore(s => s.openDialog);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState('backup'); // 'backup' | 'restore' | 'qr'
  const [restoreInput, setRestoreInput] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [newPin, setNewPin] = useState('');

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!identity?.sk) {
      setToast({ type: 'error', message: 'Not unlocked' });
      return;
    }
    try {
      const nsec = nip19.nsecEncode(identity.sk);
      let mnemonic = null;
      try { mnemonic = await identity.getMnemonic?.(); } catch (e) {}

      const lines = [
        'CIPHER ACCOUNT RECOVERY',
        '=======================',
        'Exported: ' + new Date().toLocaleString(),
        '',
        'Public key (npub): ' + (identity.npub || identity.pk),
        'Private key (nsec): ' + nsec,
      ];
      if (mnemonic) {
        lines.push('');
        lines.push('Recovery Phrase (12 words):');
        lines.push(mnemonic);
        lines.push('');
        lines.push('To recover on a new device: open Cipher, tap "Restore it",');
        lines.push('choose "Use Recovery Phrase", paste the words above,');
        lines.push('and pick a new PIN.');
      }
      lines.push('');
      lines.push('WARNING: Never share this file.');
      lines.push('Anyone with these keys controls this account.');

      const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'cipher-recovery-' + (identity.npub || identity.pk).slice(0, 8) + '.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      setToast({ type: 'success', message: 'Recovery file downloaded' });
    } catch (e) {
      console.error(e);
      setToast({ type: 'error', message: 'Download failed: ' + (e.message || 'unknown') });
    }
  };

  const handleCopyNpub = async () => {
    try {
      await navigator.clipboard.writeText(identity.npub || identity.pk);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };

  const handleRestore = async () => {
    if (!restoreInput.trim()) return;
    setRestoring(true);
    try {
      let sk;
      const input = restoreInput.trim();
      
      if (input.startsWith('nsec1')) {
        const decoded = nip19.decode(input);
        sk = decoded.data;
      } else if (/^[0-9a-f]{64}$/i.test(input)) {
        // Hex private key
        const bytes = new Uint8Array(32);
        for (let i = 0; i < 32; i++) bytes[i] = parseInt(input.substr(i * 2, 2), 16);
        sk = bytes;
      } else {
        throw new Error('Invalid key format. Must be nsec1... or 64-char hex.');
      }

      if (newPin.length < 4) throw new Error('Please set a PIN (4+ digits) to secure this account');
      
      const { encryptKey } = await import('../../useIdentity');
      const { getPublicKey } = await import('nostr-tools');
      const pk = getPublicKey(sk);
      
      const vault = await encryptKey(Array.from(sk), newPin);
      const vaults = JSON.parse(localStorage.getItem('cipher_vaults') || '{}');
      
      // Generate a sensible fallback handle instead of hardcoding 'restored_user'
      const defaultHandle = 'user_' + pk.slice(0, 6);
      vaults[pk] = { vault, handle: defaultHandle, displayName: 'Restored User', createdAt: Date.now() };
      
      localStorage.setItem('cipher_vaults', JSON.stringify(vaults));
      localStorage.setItem('cipher_active_pubkey', pk);
      localStorage.setItem('cipher_vault', JSON.stringify(vault));
      localStorage.setItem('cipher_handle', defaultHandle);
      
      sessionStorage.setItem('cipher_session_sk', JSON.stringify(Array.from(sk)));
      
      setToast({ type: 'success', message: 'Identity restored! Reloading...' });
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
        <motion.div 
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} 
          transition={{ type: 'spring', damping: 25, stiffness: 300 }} 
          onClick={e => e.stopPropagation()} 
          className="w-full max-w-md bg-[#1c1c1e] rounded-t-[2rem] border-t border-white/10 p-5 pb-sheet max-h-[85dvh] flex flex-col"
        >
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
          
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><Key size={18} className="text-blue-400"/> Identity & Backup</h2>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50"><X size={16}/></button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 bg-[#0a0a0a] p-1 rounded-xl">
            <button onClick={() => setTab('backup')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${tab === 'backup' ? 'bg-blue-600 text-white' : 'text-white/50'}`}>Backup</button>
            <button onClick={() => setTab('qr')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${tab === 'qr' ? 'bg-blue-600 text-white' : 'text-white/50'}`}>Share QR</button>
            <button onClick={() => setTab('restore')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${tab === 'restore' ? 'bg-blue-600 text-white' : 'text-white/50'}`}>Restore</button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {tab === 'backup' && (
              <div className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex gap-2">
                  <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-400/80">Never share your private key with anyone. Cipher staff will never ask for it.</p>
                </div>

                <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase text-white/40 mb-2">Public ID (Safe to share)</p>
                  <p className="text-xs font-mono text-white/80 break-all mb-3">{identity.npub || identity.pk}</p>
                  <button onClick={handleCopyNpub} className="w-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                    {copied ? <><CheckCircle2 size={14} className="text-green-400"/> Copied!</> : <><Copy size={14}/> Copy Public ID</>}
                  </button>
                </div>

                <button onClick={handleExport} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                  <Download size={16} /> Export Private Key
                </button>
                <p className="text-[10px] text-white/40 text-center">Save this to a password manager or offline. You'll need it to restore if you lose this device.</p>
              </div>
            )}

            {tab === 'qr' && (
              <div className="flex flex-col items-center">
                <p className="text-sm text-white/60 mb-4 text-center">Have someone scan this to add you</p>
                <div className="bg-white p-6 rounded-2xl mb-4">
                  <QRCodeSVG value={`cipher://user/${identity.npub || identity.pk}`} size={220} level="H" />
                </div>
                <p className="text-xs text-white/40 text-center">Works for vendor meetups, in-person trades, and quick DM exchanges</p>
              </div>
            )}

            {tab === 'restore' && (
              <div className="space-y-4">
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex gap-2">
                  <AlertTriangle size={16} className="text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-yellow-400/80">Restoring will replace your current identity. Export your current key first if you need it.</p>
                </div>
                <input 
                  type="password"
                  placeholder="Set a new PIN (4+ digits)"
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-3 text-sm text-white font-mono focus:border-blue-500 outline-none mb-2"
                />
                <textarea 
                  value={restoreInput}
                  onChange={e => setRestoreInput(e.target.value)}
                  placeholder="Paste your nsec1... or 64-char hex private key"
                  rows={3}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-3 text-sm text-white font-mono focus:border-blue-500 outline-none resize-none"
                />
                <button 
                  onClick={handleRestore}
                  disabled={restoring || !restoreInput.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {restoring ? 'Restoring...' : <><Upload size={16}/> Restore Identity</>}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}