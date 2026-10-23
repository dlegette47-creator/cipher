import React, { useRef, useState } from 'react';
import { Send, Image as ImageIcon, Mic, Square, Smile, Tag } from 'lucide-react';
import FullEmojiPicker from './chat/FullEmojiPicker';
import { useChatStore } from '../store/chatStore';

export default function MessageInput({ 
  value, onChange, onSend, canPost, isChannel, onPostListing,
  onImageUpload, startRecording, stopRecording, isRecording, uploadingImage
}) {
  const fileInputRef = useRef(null);
  const isVendor = useChatStore(s => s.isVendor);
  const [showInputEmoji, setShowInputEmoji] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const activeGroup = useChatStore(s => s.activeGroup);
  const groupMembers = useChatStore(s => s.groupMembers);
  const profiles = useChatStore(s => s.profiles);


  const getMemberList = () => {
    if (!activeGroup || !Array.isArray(groupMembers)) return [];
    return groupMembers
      .map(m => ({
        pubkey: m.pubkey,
        username: profiles[m.pubkey]?.name || profiles[m.pubkey]?.username || m.pubkey.slice(0, 8),
        displayName: profiles[m.pubkey]?.displayName || profiles[m.pubkey]?.name || 'User'
      }))
      .filter(m => m.username.toLowerCase().includes(mentionQuery.toLowerCase()));
  };

  const handleTextChange = (val) => {
    onChange(val);
    
    // Detect @mention
    const cursorPos = document.activeElement?.selectionStart || val.length;
    const beforeCursor = val.slice(0, cursorPos);
    const match = beforeCursor.match(/@([a-zA-Z0-9_]*)$/);
    
    if (match && activeGroup) {
      setMentionQuery(match[1]);
      setShowMentions(true);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (member) => {
    const textarea = document.activeElement;
    const cursorPos = textarea?.selectionStart || value.length;
    const beforeCursor = value.slice(0, cursorPos);
    const afterCursor = value.slice(cursorPos);
    
    const match = beforeCursor.match(/@([a-zA-Z0-9_]*)$/);
    if (!match) return;
    
    const newText = beforeCursor.slice(0, beforeCursor.length - match[0].length) + `@${member.username} ` + afterCursor;
    onChange(newText);
    setShowMentions(false);
    setMentionQuery('');
  };

  const handleKeyDown = (e) => {
    if (!showMentions) return;
    const list = getMemberList();
    if (list.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionIndex(prev => (prev + 1) % list.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionIndex(prev => (prev - 1 + list.length) % list.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertMention(list[mentionIndex]);
    } else if (e.key === 'Escape') {
      setShowMentions(false);
    }
  };

  return (
    <div className="p-3 bg-[#111] border-t border-white/10 flex-shrink-0 flex flex-col gap-2 relative z-30">
      {canPost ? (
        <div className="flex items-end gap-2">
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage || isRecording} className="p-3 bg-[#171717] hover:bg-[#222] rounded-full text-white/70 transition-colors disabled:opacity-50 shrink-0">
            <ImageIcon size={18} />
          </button>
          <input type="file" accept="image/*" multiple className="hidden" ref={fileInputRef} onChange={onImageUpload} />

          <button type="button" onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} disabled={uploadingImage} className={`p-3 rounded-full text-white/70 transition-colors disabled:opacity-50 shrink-0 ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-[#171717] hover:bg-[#222]'}`}>
            {isRecording ? <Square size={18} /> : <Mic size={18} />}
          </button>

          <button type="button" onClick={() => setShowInputEmoji(true)} className="p-3 bg-[#171717] hover:bg-[#222] rounded-full text-white/70 transition-colors shrink-0">
            <Smile size={18} />
          </button>

          {isVendor && onPostListing && (
            <button type="button" onClick={onPostListing} className="p-3 bg-green-500/10 hover:bg-green-500/20 rounded-full text-green-400 transition-colors shrink-0" title="Post a product listing">
              <Tag size={18} />
            </button>
          )}

          <form onSubmit={(e) => { e.preventDefault(); onSend?.() }} className="flex-1 bg-[#171717] rounded-2xl border border-white/10 flex items-end p-1">
            <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={isChannel ? "Broadcast..." : "Message"} className="w-full bg-transparent text-white px-3 py-2 text-sm outline-none resize-none max-h-32 focus:ring-0" rows={1} />
          </form>

          <button type="button" onClick={onSend} disabled={!value?.trim()} className="p-3 bg-blue-600 rounded-full text-white disabled:opacity-50 hover:bg-blue-500 transition-colors shrink-0">
            <Send size={18} />
          </button>
        </div>
      ) : (
        <div className="text-center text-white/40 text-xs py-2">Only the channel creator can post here.</div>
      )}

      {showInputEmoji && (
        <FullEmojiPicker onSelect={(emoji) => { onChange(value + emoji); }} onClose={() => setShowInputEmoji(false)} />
      )}
    </div>
  );
}
