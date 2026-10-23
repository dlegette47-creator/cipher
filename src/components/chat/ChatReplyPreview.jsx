import React from 'react';
import { X, Reply } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

export default function ChatReplyPreview() {
  const replyingTo = useChatStore((s) => s.replyingTo);
  const setReplyingTo = useChatStore((s) => s.setReplyingTo);

  if (!replyingTo) return null;

  // Extract preview text from various message formats
  let previewText = 'Message';
  if (replyingTo.data?.message) previewText = replyingTo.data.message;
  else if (replyingTo.data?.title) previewText = replyingTo.data.title;
  else if (replyingTo.data?.url) previewText = '[attachment]';
  else if (replyingTo.rawContent) {
    try {
      const parsed = JSON.parse(replyingTo.rawContent);
      previewText = parsed.message || parsed.title || '[attachment]';
    } catch { previewText = replyingTo.rawContent; }
  } else if (replyingTo.text) previewText = replyingTo.text;

  // Sender display
  let sender = 'Replying to';
  if (replyingTo.isSender) sender = 'Replying to yourself';
  else if (replyingTo.pubkey) {
    const profiles = useChatStore.getState().profiles || {};
    const name = profiles[replyingTo.pubkey]?.displayName || profiles[replyingTo.pubkey]?.name;
    sender = name ? `Replying to ${name}` : `Replying to User ${replyingTo.pubkey.slice(0, 4)}`;
  }

  return (
    <div className="px-3 pt-2 bg-[#111]">
      <div className="flex items-center gap-2 bg-white dark:bg-black/40 border-l-2 border-blue-400 rounded-lg px-3 py-2">
        <Reply size={14} className="text-blue-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-blue-400 font-bold uppercase">{sender}</p>
          <p className="text-xs text-black dark:text-white/70 truncate">{previewText.slice(0, 120)}</p>
        </div>
        <button
          onClick={() => setReplyingTo(null)}
          className="p-1 text-black dark:text-white/40 hover:text-black dark:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
