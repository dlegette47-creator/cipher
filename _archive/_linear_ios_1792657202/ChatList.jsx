import React from 'react';
import { Users, Megaphone } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

export default function ChatList({ onOpenChat }) {
  const dms = useChatStore((s) => s.dms);
  const groups = useChatStore((s) => s.groups);
  const groupMessages = useChatStore((s) => s.groupMessages);
  const profiles = useChatStore((s) => s.profiles);
  const unreadCounts = useChatStore((s) => s.unreadCounts);

  // Compute DM list (with fallback for missing profiles)
  const dmList = Object.entries(dms).map(([pubkey, msgs]) => {
    const profile = profiles[pubkey];
    const safeProfile = (profile && profile.name && !/^[0-9a-f]{8,64}$/i.test(profile.name))
      ? profile
      : { displayName: `User ${pubkey.slice(0, 4)}`, picture: null, name: pubkey.slice(0, 4) };
    return { type: 'dm', id: pubkey, lastMsg: msgs[msgs.length - 1], profile: safeProfile };
  });

  // Compute group list
  const groupList = groups.map(g => ({
    type: 'group',
    id: g.id,
    group: g,
    lastMsg: groupMessages[g.id]?.[groupMessages[g.id].length - 1]
  }));

  // Deduplicate by chat ID to prevent React "duplicate key" errors
  const chatMap = new Map();
  [...dmList, ...groupList].forEach(c => chatMap.set(c.id, c));
  
  const allChats = Array.from(chatMap.values()).sort(
    (a, b) => (b.lastMsg?.timestamp || 0) - (a.lastMsg?.timestamp || 0)
  );

  if (allChats.length === 0) {
    return <p className="text-center text-black dark:text-white/40 mt-10">No chats yet.</p>;
  }

  return (
    <div className="space-y-2">
      {allChats.map((chat) => {
        if (chat.type === 'dm') {
          const profile = profiles[chat.id] || { displayName: `User ${chat.id.slice(0, 4)}`, picture: null };
          return (
            <div
              key={chat.id}
              onClick={() => onOpenChat('dm', chat.id)}
              className="bg-gray-50 dark:bg-[#0a0a0a] p-4 rounded-2xl border border-gray-300 dark:border-gray-800/50 active:scale-[0.98] cursor-pointer flex items-center gap-4"
            >
              {profile.picture ? (
                <img src={profile.picture} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-[#171717] flex items-center justify-center font-bold">
                  {profile.displayName.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{profile.displayName}</p>
                <p className="text-xs text-black dark:text-white/50 truncate">
                  {chat.lastMsg?.data?.type === 'cipher_order' ? '📦 Order'
                    : chat.lastMsg?.data?.type === 'image' ? '🖼️ Photo'
                    : chat.lastMsg?.data?.type === 'audio' ? '🎤 Voice Note'
                    : chat.lastMsg?.data?.message || ''}
                </p>
              </div>
              {unreadCounts[chat.id] > 0 && (
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-black dark:text-white shrink-0">
                  {unreadCounts[chat.id]}
                </div>
              )}
            </div>
          );
        } else {
          const Icon = chat.group.isChannel ? Megaphone : Users;
          return (
            <div
              key={chat.id}
              onClick={() => onOpenChat('group', chat.id, chat.group)}
              className="bg-gray-50 dark:bg-[#0a0a0a] p-4 rounded-2xl border border-gray-300 dark:border-gray-800/50 active:scale-[0.98] cursor-pointer flex items-center gap-4"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${chat.group.isChannel ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                <Icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {chat.group.name && !chat.group.name.startsWith('Group ') ? chat.group.name : 'Unnamed Group'}
                </p>
                <p className="text-xs text-black dark:text-white/50 truncate">
                  {chat.group.isChannel ? '📢 Channel' : '👥 Public Group'}
                </p>
              </div>
              {unreadCounts[chat.id] > 0 && (
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-black dark:text-white shrink-0">
                  {unreadCounts[chat.id]}
                </div>
              )}
            </div>
          );
        }
      })}
    </div>
  );
}
