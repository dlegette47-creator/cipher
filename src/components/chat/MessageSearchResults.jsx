import React from 'react';
import { ChevronLeft, Search, MessageSquare, Users, Megaphone } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

export default function MessageSearchResults({ identity, setView, openChat }) {
  const searchResults = useChatStore(s => s.searchResults);
  const searchQuery = useChatStore(s => s.searchQuery);

  const handleJump = (result) => {
    // Navigate to the chat, then scroll to the message
    if (result.type === 'dm') {
      openChat('dm', result.pubkey);
      setTimeout(() => {
        const el = document.getElementById(`msg-${result.msg.id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    } else {
      const groups = useChatStore.getState().groups;
      const group = groups.find(g => g.id === result.groupId);
      if (group) {
        openChat('group', result.groupId, group);
        setTimeout(() => {
          const el = document.getElementById(`msg-${result.msg.id}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 500);
      }
    }
  };

  const formatTime = (ts) => {
    const d = new Date(ts * 1000);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] pb-8">
      <div className="p-4 border-b border-white/5 flex items-center gap-3 shrink-0">
        <button onClick={() => setView('list')} className="p-2 -ml-2 text-white/60 hover:text-white">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <h2 className="text-sm font-bold text-white">Search Results</h2>
          <p className="text-[10px] text-white/40">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {searchResults.length === 0 ? (
          <div className="text-center text-white/40 mt-20">
            <Search size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">No messages found</p>
            <p className="text-xs text-white/30 mt-1">Try a different search term</p>
          </div>
        ) : (
          searchResults.map((r, i) => (
            <button
              key={i}
              onClick={() => handleJump(r)}
              className="w-full bg-[#111] hover:bg-[#1a1a1a] border border-white/5 rounded-2xl p-3 flex items-start gap-3 text-left transition-colors active:scale-[0.98]"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${r.type === 'dm' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                {r.type === 'dm' ? <MessageSquare size={18} /> : <Users size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-sm font-bold text-white truncate">{r.name}</p>
                  <p className="text-[10px] text-white/40 shrink-0 ml-2">{formatTime(r.msg.timestamp)}</p>
                </div>
                <p className="text-xs text-white/60 line-clamp-2">{r.text}</p>
                <p className="text-[10px] text-white/30 uppercase mt-1">{r.type === 'dm' ? 'Direct Message' : 'Group'}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}