import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Check, X as XIcon, ShieldAlert } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

export default function JoinRequestsPanel({ isOpen, onClose, groupId, profiles, identity, addMember, setToast }) {
  const joinRequests = useChatStore(s => s.joinRequests);
  const removeJoinRequest = useChatStore(s => s.removeJoinRequest);
  const [processing, setProcessing] = useState({});

  if (!isOpen || !groupId) return null;
  
  const requests = joinRequests[groupId] || [];

  const handleApprove = async (pubkey) => {
    setProcessing(p => ({ ...p, [pubkey]: 'approving' }));
    try {
      await addMember(groupId, pubkey);
      removeJoinRequest(groupId, pubkey);
      setToast({ type: 'success', message: 'Member approved' });
    } catch (e) {
      setToast({ type: 'error', message: 'Failed to approve' });
    } finally {
      setProcessing(p => { const n = { ...p }; delete n[pubkey]; return n; });
    }
  };

  const handleDeny = (pubkey) => {
    setProcessing(p => ({ ...p, [pubkey]: 'denying' }));
    removeJoinRequest(groupId, pubkey);
    setToast({ type: 'info', message: 'Request denied' });
    setProcessing(p => { const n = { ...p }; delete n[pubkey]; return n; });
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-start justify-center" onClick={onClose}>
        <motion.div 
          initial={{ y: '-100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }} 
          transition={{ type: 'spring', damping: 25, stiffness: 300 }} 
          onClick={e => e.stopPropagation()} 
          className="w-full max-w-md bg-[#1c1c1e] rounded-b-[2rem] border-t border-white/10 p-5 pt-10 max-h-[85vh] flex flex-col"
        >
                    <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus size={18} className="text-blue-400" /> Join Requests ({requests.length})
            </h2>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50"><X size={16}/></button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {requests.length === 0 ? (
              <div className="text-center text-white/40 py-12">
                <UserPlus size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No pending requests</p>
                <p className="text-xs text-white/30 mt-1">New members waiting for approval will appear here</p>
              </div>
            ) : (
              requests.map(pubkey => {
                const profile = profiles[pubkey] || {};
                const isApproving = processing[pubkey] === 'approving';
                const isDenying = processing[pubkey] === 'denying';
                return (
                  <div key={pubkey} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-3">
                    <div className="flex items-center gap-3 mb-2">
                      {profile.picture ? (
                        <img src={profile.picture} className="w-10 h-10 rounded-full object-cover" alt="" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                          {(profile.displayName || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{profile.displayName || `User ${pubkey.slice(0, 8)}`}</p>
                        <p className="text-[10px] text-white/40 font-mono truncate">{pubkey.slice(0, 24)}...</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleDeny(pubkey)} disabled={isDenying || isApproving} className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50">
                        <XIcon size={14} /> Deny
                      </button>
                      <button onClick={() => handleApprove(pubkey)} disabled={isApproving || isDenying} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50">
                        <Check size={14} /> {isApproving ? 'Approving...' : 'Approve'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}