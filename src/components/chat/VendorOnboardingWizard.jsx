import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Wallet, CheckCircle2, Store, Send, Shield } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { scopedGet, scopedSet } from '../../lib/storage';

export default function VendorOnboardingWizard({ isOpen, onClose, onComplete }) {
  const [step, setStep] = useState(1);
  const [btc, setBtc] = useState(scopedGet('btc_address', ''));
  const [xmr, setXmr] = useState(scopedGet('xmr_address', ''));
  const [error, setError] = useState('');
  const setToast = useChatStore(s => s.setToast);

  if (!isOpen) return null;

  const validateBtc = (addr) => /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(addr);
  const validateXmr = (addr) => /^[48][0-9AB][1-9A-HJ-NP-Za-km-z]{93}$/.test(addr);

  const handleNext = () => {
    setError('');
    if (step === 2) {
      if (!btc && !xmr) { setError('Please enter at least one address'); return; }
      if (btc && !validateBtc(btc)) { setError('Invalid BTC address format'); return; }
      if (xmr && !validateXmr(xmr)) { setError('Invalid XMR address format'); return; }
    }
    setStep(step + 1);
  };

  const handleFinish = () => {
    if (btc) scopedSet('btc_address', btc);
    if (xmr) scopedSet('xmr_address', xmr);
    setToast({ type: 'success', message: 'You are now a vendor!' });
    onComplete();
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
        <motion.div 
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} 
          transition={{ type: 'spring', damping: 25, stiffness: 300 }} 
          onClick={e => e.stopPropagation()} 
          className="w-full max-w-md bg-[#1c1c1e] rounded-t-[2rem] sm:rounded-[2rem] border-t sm:border border-white/10 p-6 pb-8 max-h-[90vh] flex flex-col"
        >
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />
          
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Store size={16} />
              </div>
              <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Step {step} of 3</span>
            </div>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50 hover:text-white"><X size={16}/></button>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1 bg-white/5 rounded-full mb-6 overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500" 
              animate={{ width: `${(step / 3) * 100}%` }} 
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="flex-1">
            {/* STEP 1: Welcome */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <Store size={36} className="text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Become a Vendor</h2>
                  <p className="text-sm text-white/50">Start selling in 3 simple steps</p>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-3 p-3 bg-[#0a0a0a] rounded-xl border border-white/5">
                    <Wallet size={20} className="text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-white">Set payment addresses</p>
                      <p className="text-xs text-white/50">BTC and/or XMR so buyers can pay you directly</p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-3 bg-[#0a0a0a] rounded-xl border border-white/5">
                    <Send size={20} className="text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-white">Post your first product</p>
                      <p className="text-xs text-white/50">Use the green Tag button in any group</p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-3 bg-[#0a0a0a] rounded-xl border border-white/5">
                    <Shield size={20} className="text-green-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-white">Build trust</p>
                      <p className="text-xs text-white/50">Successful deliveries auto-earn vouches</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Payment Addresses */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">Payment Addresses</h2>
                  <p className="text-sm text-white/50 mb-4">Where buyers will send funds. You control these wallets, Cipher never touches your crypto.</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Bitcoin (BTC) Address</label>
                  <input 
                    type="text" 
                    value={btc} 
                    onChange={e => { setBtc(e.target.value); setError(''); }}
                    placeholder="bc1q..." 
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-orange-500 outline-none"
                  />
                  <p className="text-[10px] text-white/30 mt-1">P2PKH, P2SH, or Bech32 addresses supported</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Monero (XMR) Address</label>
                  <input 
                    type="text" 
                    value={xmr} 
                    onChange={e => { setXmr(e.target.value); setError(''); }}
                    placeholder="4..." 
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-orange-500 outline-none"
                  />
                  <p className="text-[10px] text-white/30 mt-1">95-char Monero address (starts with 4 or 8)</p>
                </div>

                {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-2">{error}</p>}
              </motion.div>
            )}

            {/* STEP 3: Done */}
            {step === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 size={40} className="text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">You're a Vendor!</h2>
                <p className="text-sm text-white/50">Your storefront is ready. Here's what to do next:</p>

                <div className="space-y-2 text-left">
                  <div className="p-3 bg-[#0a0a0a] rounded-xl border border-white/5">
                    <p className="text-xs font-bold text-blue-400 mb-1">1. Join a Promo Group</p>
                    <p className="text-[11px] text-white/50">Find your community in the Discover tab</p>
                  </div>
                  <div className="p-3 bg-[#0a0a0a] rounded-xl border border-white/5">
                    <p className="text-xs font-bold text-purple-400 mb-1">2. Post your first product</p>
                    <p className="text-[11px] text-white/50">Tap the green Tag icon in the group chat input</p>
                  </div>
                  <div className="p-3 bg-[#0a0a0a] rounded-xl border border-white/5">
                    <p className="text-xs font-bold text-green-400 mb-1">3. Broadcast to multiple groups</p>
                    <p className="text-[11px] text-white/50">Tap the share icon on your product card</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <div className="mt-6">
            {step < 3 ? (
              <button 
                onClick={handleNext} 
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                Continue <ChevronRight size={18} />
              </button>
            ) : (
              <button 
                onClick={handleFinish} 
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl transition-colors"
              >
                Start Selling
              </button>
            )}
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="w-full text-xs text-white/40 hover:text-white mt-2 py-1">
                Back
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}