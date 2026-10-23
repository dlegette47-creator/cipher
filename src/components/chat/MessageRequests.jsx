import React, { useState, useMemo } from 'react';
import { ChevronLeft, UserPlus, X, Check } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { scopedGet, scopedSet } from '../../lib/storage';

export default function MessageRequests({ identity, setView, openChat }) {
  const dms = useChatStore(s => s.dms);
  const profiles = useChatStore(s => s.profiles);
  const setDms = useChatStore(s => s.setDms);
  const setToast = useChatStore(s => s.setToast);
  const [acceptedReqs, setAcceptedReqs] = useState(() => scopedGet('accepted_reqs', []));

  // A "request" is a DM from a pubkey you've never accepted
  const requests = useMemo(() => {
    return Object.entries(dms)
      .filter(([pubkey]) => !acceptedReqs.includes(pubkey))
      .map(([pubkey, msgs]) => {
        const lastMsg = msgs[msgs.length - 1];
        const preview = lastMsg?.data?.message || lastMsg?.data?.url || '(media)';
        return {
          pubkey,
          name: profiles[pubkey]?.displayName || `User ${pubkey.slice(0, 8)}`,
          preview,
          timestamp: lastMsg?.timestamp || 0,
          count: msgs.length
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [dms, acceptedReqs, profiles]);

  const handleAccept = (pubkey) => {
    const updated = [...acceptedReqs, pubkey];
    setAcceptedReqs(updated);
    scopedSet('accepted_reqs', updated);
    setToast({ type: 'success', message: 'Request accepted' });
    openChat('dm', pubkey);
  };

  const handleDecline = (pubkey) => {
    // Remove from DMs (but keep localStorage marker so they don't come back)
    setDms(prev => {
      const next = { ...prev };
      delete next[pubkey];
      return next;
    });
    setToast({ type: 'info', message: 'Request declined' });
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] pb-24">
      <div className="p-4 border-b border-white/5 flex items-center gap-3 shrink-0">
        <button onClick={() => setView('main')} className="p-2 -ml-2 text-white/60 hover:text-white">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-bold text-white">Message Requests</h2>
        {requests.length > 0 && (
          <span className="ml-auto bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{requests.length}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {requests.length === 0 ? (
          <div className="text-center text-white/40 mt-20">
            <UserPlus size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">No pending requests</p>
            <p className="text-xs text-white/30 mt-1">New DMs from strangers will appear here</p>
          </div>
        ) : (
          requests.map(r => (
            <div key={r.pubkey} className="bg-[#111] border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{r.name}</p>
                  <p className="text-xs text-white/40">{r.count} message{r.count !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <p className="text-xs text-white/60 mb-3 line-clamp-2">{r.preview}</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleDecline(r.pubkey)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <X size={14} /> Decline
                </button>
                <button 
                  onClick={() => handleAccept(r.pubkey)}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Check size={14} /> Accept
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}