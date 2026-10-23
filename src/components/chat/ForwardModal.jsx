import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Users, User, Megaphone } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

export default function ForwardModal({ isOpen, onClose, onForward }) {
  const [query, setQuery] = useState('');
  const dms = useChatStore((s) => s.dms);
  const groups = useChatStore((s) => s.groups);
  const profiles = useChatStore((s) => s.profiles);

  if (!isOpen) return null;

  // Build unified list of chats
  const dmList = Object.keys(dms).map(pk => ({
    id: pk,
    isGroup: false,
    name: profiles[pk]?.displayName || profiles[pk]?.name || `User ${pk.slice(0, 6)}`,
    icon: User
  }));

  const groupList = groups.map(g => ({
    id: g.id,
    isGroup: true,
    name: g.name,
    isChannel: g.isChannel,
    icon: g.isChannel ? Megaphone : Users
  }));

  const allChats = [...dmList, ...groupList].filter(c => 
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-[#111] border border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-md h-[70vh] flex flex-col overflow-hidden shadow-2xl animate-slide-up">
        
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#0a0a0a]">
          <h2 className="text-lg font-bold text-white">Forward to...</h2>
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white bg-white/5 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-3 border-b border-white/5 bg-[#0a0a0a]">
          <div className="flex items-center bg-black border border-white/10 rounded-xl px-3 py-2">
            <Search size={16} className="text-white/40 mr-2" />
            <input 
              type="text" 
              placeholder="Search chats and groups..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-transparent text-sm text-white outline-none w-full"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {allChats.length === 0 && (
            <p className="text-center text-white/40 text-sm mt-10">No chats found.</p>
          )}
          {allChats.map((chat) => {
            const Icon = chat.icon;
            return (
              <div 
                key={chat.id}
                onClick={() => onForward(chat.id, chat.isGroup)}
                className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${chat.isChannel ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{chat.name}</p>
                  <p className="text-[10px] text-white/40 uppercase">{chat.isGroup ? (chat.isChannel ? 'Channel' : 'Group') : 'Direct Message'}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
