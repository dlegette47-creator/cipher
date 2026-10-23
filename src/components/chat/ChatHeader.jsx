import React, { useState } from 'react';
import { ArrowLeft, Megaphone, Users, Info, Share2, MoreVertical, Search, X, Clock } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import VendorCatalogSheet from './VendorCatalogSheet';
import GroupInviteModal from './GroupInviteModal';
import MediaGallery from './MediaGallery';
import { exportChatAsText } from '../../lib/exportChat';
import { CopyOnLongPress } from '../CopyOnLongPress';

export default function ChatHeader({ mode, identity }) {
  const activeDm = useChatStore((s) => s.activeDm);
  const activeGroup = useChatStore((s) => s.activeGroup);
  const profiles = useChatStore((s) => s.profiles);
  const typingUsers = useChatStore((s) => s.typingUsers);
  const groupTypingUsers = useChatStore((s) => s.groupTypingUsers);
  const setView = useChatStore((s) => s.setView);
  const setProfilePubkey = useChatStore((s) => s.setProfilePubkey);
  const setShowGroupInfo = useChatStore((s) => s.setShowGroupInfo);
  const setToast = useChatStore((s) => s.setToast);
  const disappearingTimers = useChatStore(s => s.disappearingTimers);
  const setDisappearingTimer = useChatStore(s => s.setDisappearingTimer);
  const setChatSearch = useChatStore(s => s.setChatSearch);
  const dms = useChatStore(s => s.dms);

  const [showMore, setShowMore] = useState(false);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDmMedia, setShowDmMedia] = useState(false);

  const handleBack = () => setView('list');
  const handleCopy = async (text, successMsg) => {
    try { await navigator.clipboard.writeText(text); setToast({ type: 'success', message: successMsg }); } catch (e) {}
  };

  if (mode === 'dm' && activeDm) {
    const profile = profiles[activeDm] || { displayName: `User ${activeDm.slice(0, 4)}`, picture: null };
    const activeMsgs = dms[activeDm] || [];
    const latestOrder = [...activeMsgs].reverse().find(m => m.data?.type === 'cipher_order' || m.data?.type === 'order_request');
    const orderStatus = latestOrder?.data?.status;
    const currentTimer = disappearingTimers[activeDm];

    if (showSearch) {
      return (
        <div className="flex items-center gap-2 p-3 bg-[#0a0a0a] border-b border-white/5 flex-shrink-0 relative z-[80]">
          <button onClick={() => { setShowSearch(false); setChatSearch(''); }} className="p-2 text-white/60"><ArrowLeft size={20} /></button>
          <input autoFocus onChange={e => setChatSearch(e.target.value)} placeholder="Search messages..." className="flex-1 bg-[#171717] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none" />
        </div>
      );
    }

    return (
      <>
        <div className="flex items-center gap-3 p-4 glass-header flex-shrink-0 relative z-[80]">
          <button onClick={handleBack} className="p-2 -ml-2 text-white/60 hover:text-white"><ArrowLeft size={20} /></button>
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80" onClick={() => setShowCatalog(true)}>
            {profile.picture ? <img src={profile.picture} className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-[#171717] flex items-center justify-center text-xs font-bold">{profile.displayName.charAt(0)}</div>}
            <div>
              <div className="flex items-center">
                <h3 className="text-sm font-semibold">{profile.displayName}</h3>
                {orderStatus && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ml-2 ${
                    orderStatus === 'completed' ? 'text-green-400 border-green-400/20' :
                    orderStatus === 'shipped' ? 'text-purple-400 border-purple-400/20' :
                    orderStatus === 'accepted' ? 'text-blue-400 border-blue-400/20' :
                    'text-yellow-400 border-yellow-400/20'
                  }`}>
                    {orderStatus.toUpperCase()}
                  </span>
                )}
              </div>
              {typingUsers[activeDm] ? <p className="text-[11px] text-blue-400 animate-pulse">typing...</p> : <p className="text-[11px] text-white/40">Direct Message</p>}
            </div>
          </div>
          <div className="flex-1" />
          <div className="relative">
            <button onClick={() => setShowMore(!showMore)} className="p-2 text-white/60 hover:text-white"><MoreVertical size={20} /></button>
            {showMore && (
              <>
                <div className="fixed inset-0 z-[90]" onClick={() => setShowMore(false)} />
                <div className="absolute right-0 top-10 bg-[#1c1c1e] border border-white/10 rounded-xl shadow-xl z-[100] w-48 overflow-hidden">
                  <button onClick={() => { setShowSearch(true); setShowMore(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10 text-left">
                    <Search size={16} /> Search Messages
                  </button>
                  <button onClick={() => { setShowDmMedia(true); setShowMore(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10 text-left border-t border-white/5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Shared Media
                  </button>
                  <button onClick={() => { const msgs = dms[activeDm] || []; exportChatAsText(msgs, profiles[activeDm]?.displayName || 'Chat', profiles); setShowMore(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10 text-left border-t border-white/5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Export Chat
                  </button>
                  <button onClick={() => { setShowTimerMenu(true); setShowMore(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10 text-left border-t border-white/5">
                    <Clock size={16} /> Disappearing {currentTimer && currentTimer !== 'off' && <span className="ml-auto text-[10px] bg-blue-500 text-white px-1.5 rounded">{currentTimer}</span>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        
        {showTimerMenu && (
          <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowTimerMenu(false)}>
            <div className="bg-[#1c1c1e] rounded-2xl border border-white/10 w-full max-w-xs p-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-white font-bold mb-3">Disappearing Messages</h3>
              {['off', '1h', '24h', '7d'].map(t => (
                <button key={t} onClick={() => { setDisappearingTimer(activeDm, t); setShowTimerMenu(false); }} className={`w-full text-left px-3 py-2 text-sm rounded-lg ${currentTimer === t ? 'bg-blue-500 text-white' : 'text-white/70 hover:bg-white/5'}`}>
                  {t === 'off' ? 'Off' : t === '1h' ? '1 Hour' : t === '24h' ? '24 Hours' : '7 Days'}
                </button>
              ))}
              <button onClick={() => { setShowTimerMenu(false); useChatStore.getState().openDialog({ title: 'Custom Timer', hasInput: true, placeholder: 'Enter minutes...', onConfirm: (val) => val && setDisappearingTimer(activeDm, val + 'm') }); }} className="w-full text-left px-3 py-2 text-sm text-blue-400 font-bold hover:bg-white/5 rounded-lg border-t border-white/5 mt-1 pt-2">Custom...</button>
            </div>
          </div>
        )}

        <MediaGallery isOpen={showDmMedia} onClose={() => setShowDmMedia(false)} chatId={activeDm} isGroup={false} />
        <VendorCatalogSheet isOpen={showCatalog} onClose={() => setShowCatalog(false)} vendorPubkey={activeDm} profiles={profiles} identity={identity} />
      </>
    );
  }

  if (mode === 'group' && activeGroup) {
    return (
      <>
        <div className="flex items-center gap-3 p-4 glass-header flex-shrink-0 relative z-[80]">
          <button onClick={handleBack} className="p-2 -ml-2 text-white/60 hover:text-white"><ArrowLeft size={20} /></button>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeGroup.isChannel ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
            {activeGroup.isChannel ? <Megaphone size={20} /> : <Users size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold truncate">{activeGroup.name}</h3>
            <p className="text-[11px] text-white/40">{activeGroup.isChannel ? 'Channel' : 'Group'}</p>
          </div>
          <button onClick={() => setShowInviteModal(true)} className="p-2 text-white/60 hover:text-white"><Share2 size={20} /></button>
          <button onClick={() => setShowGroupInfo(true)} className="p-2 text-white/60 hover:text-white"><Info size={20} /></button>
        </div>
        <GroupInviteModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} group={activeGroup} />
      </>
    );
  }

  return null;
}
