import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import MessageBubble from '../MessageBubble';
import ChatHeader from './ChatHeader';
import ChatPinnedBar from './ChatPinnedBar';
import ChatReplyPreview from './ChatReplyPreview';
import MessageInput from '../MessageInput';
import MessageActionsSheet from './MessageActionsSheet';
import GroupInfoSidebar from './GroupInfoSidebar';
import ProfileModal from '../ProfileModal';
import ForwardModal from './ForwardModal';
import FullEmojiPicker from './FullEmojiPicker';
import ReviewModal from './ReviewModal';
import ReactionPicker from './ReactionPicker';
import ReactionsDetail from './ReactionsDetail';
import MessageEditHistory from './MessageEditHistory';
import ImageLightbox from '../ImageLightbox';
import DateSeparator from './DateSeparator';
import PostListingModal from './PostListingModal';
import { useChatStore } from '../../store/chatStore';
import { scopedGet, scopedSet, scopedRemove } from '../../lib/storage';
import { useReactions } from '../../hooks/useReactions';
import { useReputation } from '../../hooks/useReputation';
import { useScamReports } from '../../hooks/useScamReports';
import { useNIP29Group } from '../../hooks/useNIP29Group';
import { useGroupKeyReconciler } from '../../hooks/useGroupKeyReconciler';

export default function GroupView({
  identity,
  sendMessage,
  handleMessageAction,
  handleImageUpload,
  startRecording,
  stopRecording,
  handleForwardSubmit,
}) {
  const activeGroup = useChatStore(s => s.activeGroup);
  const groupMessages = useChatStore(s => s.groupMessages);
  const profiles = useChatStore(s => s.profiles);
  const deletedMsgs = useChatStore(s => s.deletedMsgs);
  const reactions = useChatStore(s => s.reactions);
  const selectedMessage = useChatStore(s => s.selectedMessage);
  const forwardingMsg = useChatStore(s => s.forwardingMsg);
  const showFullEmoji = useChatStore(s => s.showFullEmoji);
  const reviewTarget = useChatStore(s => s.reviewTarget);
  const profilePubkey = useChatStore(s => s.profilePubkey);
  const newMessage = useChatStore(s => s.newMessage);
  const isRecording = useChatStore(s => s.isRecording);
  const uploadingImage = useChatStore(s => s.uploadingImage);
  const showGroupInfo = useChatStore(s => s.showGroupInfo);
  const groupMembers = useChatStore(s => s.groupMembers);

  const setSelectedMessage = useChatStore(s => s.setSelectedMessage);
  const setForwardingMsg = useChatStore(s => s.setForwardingMsg);
  const setShowFullEmoji = useChatStore(s => s.setShowFullEmoji);
  const setReviewTarget = useChatStore(s => s.setReviewTarget);
  const setProfilePubkey = useChatStore(s => s.setProfilePubkey);
  const setNewMessage = useChatStore(s => s.setNewMessage);
  const setShowGroupInfo = useChatStore(s => s.setShowGroupInfo);
  const setVendorStorefrontPubkey = useChatStore(s => s.setVendorStorefrontPubkey);
  const setToast = useChatStore(s => s.setToast);
  const openChat = useChatStore(s => s.openChat);

  const { sendReaction } = useReactions({ identity });
  const { sendReview } = useReputation({ identity });
  const { isScammer } = useScamReports({ identity, targetPubkey: activeGroup?.creator });

  const {
    unpinMessage,
    addMember,
    kickMember,
    promoteMember,
    leaveGroup,
    updateGroupSettings,
    fetchGroupMembers,
    requestGroupKey,
  } = useNIP29Group({ identity });

  const groupMsgs = groupMessages[activeGroup?.id] || [];
  const scrollRef = useRef(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [showListingModal, setShowListingModal] = useState(false);
  const [emojiTarget, setEmojiTarget] = useState(null);
  const [reactionsDetail, setReactionsDetail] = useState(null);
  const [editingHistoryMsg, setEditingHistoryMsg] = useState(null);

  const selectionMode = useChatStore(s => s.selectionMode);
  const selectedMsgs = useChatStore(s => s.selectedMsgs);
  const toggleSelectedMsg = useChatStore(s => s.toggleSelectedMsg);

  const canPost = !activeGroup?.isChannel || activeGroup?.creator === identity?.pk;

  useEffect(() => {
    if (activeGroup?.id) {
      const draft = scopedGet(`draft-group-${activeGroup.id}`, '') || '';
      setNewMessage(draft);
    }
  }, [activeGroup?.id, setNewMessage]);

  useEffect(() => {
    if (activeGroup?.id) {
      fetchGroupMembers(activeGroup.id);
      const interval = setInterval(() => fetchGroupMembers(activeGroup.id), 30000);
      return () => clearInterval(interval);
    }
  }, [activeGroup?.id, fetchGroupMembers]);

  useEffect(() => {
    if (activeGroup?.id) {
      import('../../lib/crypto/groupKeyStore').then(({ getCurrentGroupKey }) => {
        getCurrentGroupKey(activeGroup.id).then(key => {
          if (!key) requestGroupKey(activeGroup.id);
        });
      });
    }
  }, [activeGroup?.id, requestGroupKey]);

  useGroupKeyReconciler({
    groupId: activeGroup?.id || null,
    members: (Array.isArray(groupMembers) ? groupMembers : []).map(m => m.pubkey),
    isOwner: activeGroup?.creator === identity?.pk,
    identity,
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeGroup?.id, groupMsgs.length, reactions, forwardingMsg]);

  const _vendorSet = new Set();
  groupMsgs.forEach(m => {
    try {
      const p = JSON.parse(m.rawContent || '{}');
      if (p.type === 'product') _vendorSet.add(m.pubkey);
    } catch {}
  });
  const _vendorList = Array.from(_vendorSet);
  const [_vouchMap, _setVouchMap] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { getAuthenticatedPool } = await import('../../lib/pool');
      const { generalRelays, queryWithTimeout } = await import('../../lib/relays');
      const pool = await getAuthenticatedPool(identity);
      const newMap = {};
      await Promise.all(_vendorList.map(async (pk) => {
        try {
          const events = await queryWithTimeout(pool, generalRelays, { kinds: [10004], '#p': [pk], limit: 200 }, 3000);
          const unique = new Set(events.filter(e => e.pubkey !== pk).map(e => e.pubkey));
          newMap[pk] = unique.size;
        } catch {
          newMap[pk] = 0;
        }
      }));
      if (!cancelled) _setVouchMap(newMap);
    })();
    return () => { cancelled = true; };
  }, [_vendorList.join(','), identity?.pk]);

  const handleReplyClick = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (!activeGroup) return null;

  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-50 flex flex-col bg-[#0a0a0a] pb-[72px]"
    >
      <ChatHeader mode="group" identity={identity} />
      <ChatPinnedBar unpinMessage={unpinMessage} />

      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-4 space-y-4">
        {groupMsgs.length === 0 && (
          <div className="text-center text-white/30 mt-10 text-sm">No messages yet. Say hi!</div>
        )}

        {groupMsgs.map((msg, i) => {
          if (deletedMsgs.has(msg.id)) return null;
          const prevMsg = i > 0 ? groupMsgs[i - 1] : null;
          const showDate = !prevMsg || new Date(msg.timestamp * 1000).toDateString() !== new Date(prevMsg.timestamp * 1000).toDateString();
          const showTail = i === 0 || groupMsgs[i - 1].isSender !== msg.isSender;
          const repliedMsg = msg.replyTo ? groupMsgs.find(m => m.id === msg.replyTo) : null;

          let parsed = {};
          try { parsed = JSON.parse(msg.rawContent || '{}'); } catch { parsed = { type: 'text', message: msg.rawContent || '' }; }

          let repliedParsed = {};
          try { repliedParsed = JSON.parse(repliedMsg?.rawContent || '{}'); } catch {}

          return (
            <React.Fragment key={msg.id}>
              {showDate && <DateSeparator timestamp={msg.timestamp} />}
              <MessageBubble
                msg={msg}
                data={{ ...parsed, vouchCount: _vouchMap[msg.pubkey] || 0 }}
                isScammer={isScammer}
                reactions={reactions[msg.id]}
                onReact={(emoji) => sendReaction(msg.id, emoji, true, activeGroup.id, msg.pubkey)}
                onAction={handleMessageAction}
                myPubkey={identity.pk}
                showTail={showTail}
                repliedTo={repliedMsg}
                repliedData={repliedParsed}
                onSelect={(m, d, action) => {
                  if (action === 'close') setSelectedMessage(null);
                  else if (action === 'open_picker') {
                    setShowFullEmoji(true);
                    setSelectedMessage({ id: msg.id, pubkey: msg.pubkey, text: parsed.message || parsed.url });
                  } else {
                    setSelectedMessage({ id: msg.id, pubkey: msg.pubkey, text: parsed.message || parsed.url });
                  }
                }}
                onReplyAction={() => setSelectedMessage({ id: msg.id, pubkey: msg.pubkey, text: parsed.message || parsed.url })}
                onImageClick={setLightboxUrl}
                onReplyClick={handleReplyClick}
                onShowReactions={() => setReactionsDetail(reactions[msg.id])}
                onShowEdits={(m) => setEditingHistoryMsg(m)}
                selectionMode={selectionMode}
                isSelectedMsg={selectedMsgs.includes(msg.id)}
                onToggleSelect={(id) => toggleSelectedMsg(id)}
                isSelected={selectedMessage?.id === msg.id}
                isGroup={true}
                onSenderClick={(pk) => setProfilePubkey(pk)}
                onVendorClick={(pk) => setVendorStorefrontPubkey(pk)}
                senderName={profiles[msg.pubkey]?.displayName || profiles[msg.pubkey]?.name || `User ${(msg.pubkey || 'anon').slice(0, 4)}`}
              />
            </React.Fragment>
          );
        })}
        <div className="h-4" />
      </div>

      <ChatReplyPreview />

      <MessageInput
        value={newMessage}
        onChange={(val) => {
          setNewMessage(val);
          if (val.trim() && activeGroup?.id) scopedSet(`draft-group-${activeGroup.id}`, val);
          else if (activeGroup?.id) scopedRemove(`draft-group-${activeGroup.id}`);
        }}
        onSend={() => {
          if (newMessage.trim()) {
            sendMessage(newMessage);
            setNewMessage('');
          }
        }}
        canPost={canPost}
        isChannel={activeGroup.isChannel}
        onImageUpload={handleImageUpload}
        startRecording={startRecording}
        stopRecording={stopRecording}
        isRecording={isRecording}
        uploadingImage={uploadingImage}
        onPostListing={() => setShowListingModal(true)}
      />

      <GroupInfoSidebar
        showGroupInfo={showGroupInfo}
        setShowGroupInfo={setShowGroupInfo}
        activeGroup={activeGroup}
        identity={identity}
        groupMembers={groupMembers}
        profiles={profiles}
        addMember={addMember}
        kickMember={kickMember}
        promoteMember={promoteMember}
        leaveGroup={leaveGroup}
        setProfilePubkey={setProfilePubkey}
        setToast={setToast}
        updateGroupSettings={updateGroupSettings}
      />

      {profilePubkey && (
        <ProfileModal
          pubkey={profilePubkey}
          profile={profiles[profilePubkey]}
          identity={identity}
          onClose={() => setProfilePubkey(null)}
          onMessage={(pk) => { openChat('dm', pk); setProfilePubkey(null); }}
          onReview={(pk) => setReviewTarget(pk)}
          onViewStorefront={(pk) => setVendorStorefrontPubkey(pk)}
        />
      )}

      <MessageActionsSheet
        isOpen={!!selectedMessage}
        onClose={() => setSelectedMessage(null)}
        onAction={(action, emoji) => {
          if (action === 'open_picker') {
            setEmojiTarget(selectedMessage);
            setSelectedMessage(null);
            return;
          }
          handleMessageAction(action, emoji);
        }}
        msg={selectedMessage}
        isAdmin={activeGroup.creator === identity.pk}
        isMine={selectedMessage?.pubkey === identity.pk}
        canEdit={selectedMessage?.pubkey === identity.pk && selectedMessage?.data?.type === 'text'}
      />

      {emojiTarget && (
        <ReactionPicker
          onSelect={(emoji) => {
            sendReaction(emojiTarget.id, emoji, true, activeGroup.id, emojiTarget.pubkey);
            setEmojiTarget(null);
          }}
          onClose={() => setEmojiTarget(null)}
        />
      )}

      <ReactionsDetail
        isOpen={!!reactionsDetail}
        onClose={() => setReactionsDetail(null)}
        reactions={reactionsDetail}
        profiles={profiles}
      />

      <MessageEditHistory
        isOpen={!!editingHistoryMsg}
        onClose={() => setEditingHistoryMsg(null)}
        msg={editingHistoryMsg}
      />

      {forwardingMsg && (
        <ForwardModal
          isOpen={!!forwardingMsg}
          onClose={() => setForwardingMsg(null)}
          onForward={handleForwardSubmit}
        />
      )}

      {showFullEmoji && selectedMessage && (
        <FullEmojiPicker
          onSelect={(emoji) => {
            const id = selectedMessage.id;
            const pk = selectedMessage.pubkey;
            setShowFullEmoji(false);
            setSelectedMessage(null);
            if (id) sendReaction(id, emoji, true, activeGroup.id, pk);
          }}
          onClose={() => {
            setShowFullEmoji(false);
            setSelectedMessage(null);
          }}
        />
      )}

      {reviewTarget && (
        <ReviewModal
          targetName={profiles[reviewTarget]?.displayName || profiles[reviewTarget]?.name || `User ${reviewTarget.slice(0, 4)}`}
          onSubmit={async (rating, text) => {
            const res = await sendReview(reviewTarget, rating, text);
            if (res.success) {
              setToast({ type: 'success', message: 'Review published!' });
              return true;
            }
            setToast({ type: 'error', message: res.error || 'Failed to publish' });
            return false;
          }}
          onClose={() => setReviewTarget(null)}
        />
      )}

      <PostListingModal
        isOpen={showListingModal}
        onClose={() => setShowListingModal(false)}
        onSubmit={async (data) => {
          const payload = {
            type: 'product',
            title: data.title,
            priceUsd: data.priceUsd,
            image: data.image,
            description: data.description,
          };
          await sendMessage('', false, null, null, payload);
        }}
      />

      <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </motion.div>
  );
}
