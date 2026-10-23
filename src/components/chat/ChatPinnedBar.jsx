import React, { useState } from 'react';
import { Pin, X } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

export default function ChatPinnedBar({ unpinMessage }) {
  const activeGroup = useChatStore((s) => s.activeGroup);
  const pinnedMessages = useChatStore((s) => s.pinnedMessages);
  const groupMessages = useChatStore((s) => s.groupMessages);

  const [expanded, setExpanded] = useState(false);

  if (!activeGroup) return null;
  const pinnedId = pinnedMessages[activeGroup.id];
  if (!pinnedId) return null;

  const groupMsgs = groupMessages[activeGroup.id] || [];
  const pinnedMsg = groupMsgs.find((m) => m.id === pinnedId);
  if (!pinnedMsg) return null;

  let preview = 'Pinned message';
  try {
    const parsed = JSON.parse(pinnedMsg.rawContent || '{}');
    preview = parsed.message || parsed.url || 'Pinned message';
  } catch (e) {
    preview = pinnedMsg.rawContent || 'Pinned message';
  }

  return (
    <div className="border-b border-gray-300 dark:border-gray-800 bg-[#0a0a0a]">
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
      >
        <Pin size={14} className="text-yellow-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider">Pinned</p>
          <p className={`text-xs text-black dark:text-white/70 ${expanded ? '' : 'truncate'}`}>{preview}</p>
        </div>
        <button
          onClick={async (e) => {
            e.stopPropagation();
            if (unpinMessage) await unpinMessage(activeGroup.id);
          }}
          className="p-1 text-black dark:text-white/40 hover:text-black dark:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
