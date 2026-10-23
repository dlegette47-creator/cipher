import React, { useState } from 'react';
import { ArrowLeft, Megaphone, Users, ShieldAlert, Store, UserPlus } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import ModerationLog from './ModerationLog';
import MediaGallery from './MediaGallery';
import VendorDirectory from './VendorDirectory';
import JoinRequestsPanel from './JoinRequestsPanel';
import GroupSettingsModal from './GroupSettingsModal';
import { CopyOnLongPress } from '../CopyOnLongPress';

export default function GroupInfoSidebar({
  showGroupInfo, setShowGroupInfo, activeGroup, identity,
  groupMembers, profiles, addMember, kickMember, promoteMember, leaveGroup,
  setProfilePubkey, setToast, updateGroupSettings
}) {
  const [showModLog, setShowModLog] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [showVendorDir, setShowVendorDir] = useState(false);
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const joinRequests = useChatStore(s => s.joinRequests);
  const pendingCount = (joinRequests[activeGroup?.id] || []).length;
  const safeGroupMembers = Array.isArray(groupMembers) ? groupMembers : [];

  if (!showGroupInfo || !activeGroup) return null;

  const amIAdmin = activeGroup.creator === identity.pk
    || (safeGroupMembers.find(m => m.pubkey === identity.pk)?.role === 'admin');

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-black/60 backdrop-blur-sm" onClick={() => setShowGroupInfo(false)}>
      <div className="w-full max-w-sm bg-[#0a0a0a] h-full shadow-2xl flex flex-col border-l border-white/10" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#111]">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowGroupInfo(false)} className="text-white/60 hover:text-white"><ArrowLeft size={20} /></button>
            <h2 className="text-lg font-bold">Group Info</h2>
          </div>
        </div>

        <div className="p-6 flex flex-col items-center border-b border-white/5">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-3 overflow-hidden ${activeGroup.isChannel ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
            {activeGroup.avatar
              ? <img src={activeGroup.avatar} className="w-full h-full object-cover" alt="" />
              : activeGroup.isChannel ? <Megaphone size={32} /> : <Users size={32} />}
          </div>
          <h3 className="text-xl font-bold">{activeGroup.name}</h3>
          <p className="text-xs mt-1"><CopyOnLongPress value={activeGroup.id} displayValue={activeGroup.id} className="text-white/50 font-mono" /></p>
          <p className="text-xs text-white/40 mt-2 text-center">{activeGroup.about || 'No description'}</p>
          {amIAdmin && (
            <button onClick={() => setShowSettingsModal(true)} className="mt-3 text-xs text-blue-400 font-bold hover:text-blue-300">✏️ Edit Group</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-4">
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Members ({safeGroupMembers.length})</p>
            {amIAdmin && (
              <button onClick={() => {
                useChatStore.getState().openDialog({
                  title: 'Add Member', message: 'Enter the pubkey (hex) to add:', hasInput: true,
                  onConfirm: (pk) => { if (pk && pk.trim()) addMember(activeGroup.id, pk.trim()); }
                });
              }} className="text-xs text-blue-400 font-bold hover:text-blue-300">+ Add Member</button>
            )}
          </div>

          <div className="space-y-3">
            {safeGroupMembers.map(member => {
              const isMe = member.pubkey === identity.pk;
              const isAdmin = member.role === 'admin' || member.pubkey === activeGroup.creator;
              return (
                <div key={member.pubkey} onClick={() => setProfilePubkey(member.pubkey)} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isAdmin ? 'bg-purple-500/30 text-purple-300' : 'bg-blue-500/30 text-blue-300'}`}>{member.pubkey.slice(0, 2).toUpperCase()}</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{isMe ? 'You' : (profiles[member.pubkey]?.displayName || profiles[member.pubkey]?.name || `User ${member.pubkey.slice(0, 4)}`)}</p>
                    <p className="text-[10px] text-white/50 uppercase">{isAdmin ? '👑 Admin' : 'Member'}</p>
                  </div>
                  {amIAdmin && !isMe && (
                    <div className="flex gap-1">
                      <button onClick={async (e) => {
                        e.stopPropagation();
                        if (promoteMember) { await promoteMember(activeGroup.id, member.pubkey, isAdmin); setToast({ type: 'success', message: isAdmin ? 'Demoted' : 'Promoted' }); }
                      }} className="text-[10px] bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-2 py-1.5 rounded-lg font-bold">{isAdmin ? 'Demote' : 'Promote'}</button>
                      <button onClick={(e) => {
                        e.stopPropagation();
                        useChatStore.getState().openDialog({
                          title: 'Remove Member', message: `Remove ${profiles[member.pubkey]?.displayName || 'this user'}?`,
                          type: 'danger', confirmText: 'Remove',
                          onConfirm: async () => { await kickMember(activeGroup.id, member.pubkey); setToast({ type: 'success', message: 'Removed' }); }
                        });
                      }} className="text-[10px] bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded-lg font-bold">Remove</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 space-y-2">
            {amIAdmin && pendingCount > 0 && (
              <button onClick={() => setShowJoinRequests(true)} className="w-full flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-left">
                <UserPlus size={18} className="text-yellow-400" />
                <div className="flex-1"><p className="text-sm font-semibold text-yellow-400">Join Requests</p><p className="text-[10px] text-yellow-400/60">{pendingCount} pending</p></div>
                <span className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingCount}</span>
              </button>
            )}
            <button onClick={() => setShowVendorDir(true)} className="w-full flex items-center gap-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-left">
              <Store size={18} className="text-purple-400" />
              <div><p className="text-sm font-semibold text-purple-400">Vendor Directory</p><p className="text-[10px] text-purple-400/60">Browse verified vendors</p></div>
            </button>
            <button onClick={() => setShowMediaGallery(true)} className="w-full flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-left">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <div><p className="text-sm font-semibold text-blue-400">Shared Media</p><p className="text-[10px] text-blue-400/60">Photos and voice</p></div>
            </button>
            {amIAdmin && (
              <button onClick={() => setShowModLog(true)} className="w-full flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-left">
                <ShieldAlert size={18} className="text-yellow-400" />
                <div><p className="text-sm font-semibold text-yellow-400">Moderation Log</p><p className="text-[10px] text-yellow-400/60">Admin actions</p></div>
              </button>
            )}
            <button onClick={async () => { setShowGroupInfo(false); if (leaveGroup) await leaveGroup(activeGroup.id); }} className="w-full flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 text-left">
              <div><p className="text-sm font-semibold text-red-400">Leave Group</p><p className="text-xs text-red-400/60">Remove yourself</p></div>
            </button>
          </div>
        </div>
      </div>

      <GroupSettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} group={activeGroup} identity={identity} onSave={async (u) => { if (updateGroupSettings) await updateGroupSettings(activeGroup.id, u); }} />
      <JoinRequestsPanel isOpen={showJoinRequests} onClose={() => setShowJoinRequests(false)} groupId={activeGroup.id} profiles={profiles} identity={identity} addMember={addMember} setToast={setToast} />
      <VendorDirectory isOpen={showVendorDir} onClose={() => setShowVendorDir(false)} groupId={activeGroup.id} profiles={profiles} identity={identity} onOpenVendor={(pk) => setProfilePubkey(pk)} />
      <MediaGallery isOpen={showMediaGallery} onClose={() => setShowMediaGallery(false)} chatId={activeGroup.id} isGroup={true} />
      <ModerationLog isOpen={showModLog} onClose={() => setShowModLog(false)} groupId={activeGroup.id} />
    </div>
  );
}
