import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, LogOut, Trash2, User } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

export default function AccountSwitcher({ isOpen, onClose, identity }) {
  const [switchingTo, setSwitchingTo] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setToast = useChatStore(s => s.setToast);

  if (!isOpen) return null;

  const accounts = identity.getAccounts ? identity.getAccounts() : [];

  const handleSwitch = async (pk) => {
    setSwitchingTo(pk);
    setPin('');
    setError('');
  };

  const submitPin = async () => {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }
    setLoading(true);
    setError('');
    const res = await identity.switchAccount(switchingTo, pin);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Invalid PIN');
      setPin('');
    }
  };

  const handleRemove = (pk, handle) => {
    useChatStore.getState().openDialog({
      title: 'Remove Account',
      message: `Remove "${handle}" from this device? You can re-add it later with your seed phrase.`,
      type: 'danger',
      confirmText: 'Remove',
      onConfirm: () => {
        identity.removeAccount(pk);
        setToast({ type: 'success', message: 'Account removed' });
      }
    });
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
        <motion.div 
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} 
          transition={{ type: 'spring', damping: 25, stiffness: 300 }} 
          onClick={e => e.stopPropagation()} 
          className="w-full max-w-md bg-[#1c1c1e] rounded-t-[2rem] border-t border-white/10 p-5 pb-8 max-h-[85vh] flex flex-col"
        >
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">Accounts</h2>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50"><X size={16}/></button>
          </div>

          {!switchingTo ? (
            <>
              <div className="flex-1 overflow-y-auto space-y-2">
                {accounts.map(acc => (
                  <div key={acc.pubkey} className={`bg-[#0a0a0a] border rounded-2xl p-4 ${acc.isActive ? 'border-blue-500/40' : 'border-white/5'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${acc.isActive ? 'bg-blue-500/30 text-blue-300' : 'bg-white/10 text-white/60'}`}>
                        {(acc.displayName || acc.handle || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{acc.displayName || acc.handle}</p>
                        <p className="text-[10px] text-white/40">@{acc.handle} · {acc.pubkey.slice(0, 8)}...</p>
                      </div>
                      {acc.isActive ? (
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full">ACTIVE</span>
                      ) : (
                        <button 
                          onClick={() => handleSwitch(acc.pubkey)} 
                          className="text-[10px] font-bold text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Switch
                        </button>
                      )}
                    </div>
                    {!acc.isActive && (
                      <button 
                        onClick={() => handleRemove(acc.pubkey, acc.handle)} 
                        className="mt-2 text-[10px] text-red-400/60 hover:text-red-400 flex items-center gap-1"
                      >
                        <Trash2 size={10} /> Remove from device
                      </button>
                    )}
                  </div>
                ))}

                <button 
                  onClick={() => identity.addNewAccount()} 
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 border-dashed rounded-2xl p-4 flex items-center justify-center gap-2 text-white/60 hover:text-white transition-colors"
                >
                  <Plus size={16} /> Add Another Account
                </button>
              </div>
            </>
          ) : (
            <>
              <button 
                onClick={() => { setSwitchingTo(null); setPin(''); setError(''); }} 
                className="text-xs text-blue-400 mb-4 flex items-center gap-1"
              >
                ← Back
              </button>
              
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <User size={28} />
                </div>
                <p className="text-sm text-white/60">Enter PIN for</p>
                <p className="text-lg font-bold text-white">{accounts.find(a => a.pubkey === switchingTo)?.displayName}</p>
              </div>

              <input 
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') submitPin(); }}
                placeholder="••••"
                autoFocus
                maxLength={8}
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-4 text-center text-2xl tracking-[0.5em] text-white focus:border-blue-500 outline-none font-mono mb-3"
              />

              {error && <p className="text-xs text-red-400 text-center mb-3">{error}</p>}

              <button 
                onClick={submitPin}
                disabled={loading || pin.length < 4}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 text-white font-bold py-3.5 rounded-xl transition-colors"
              >
                {loading ? 'Switching...' : 'Unlock & Switch'}
              </button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}