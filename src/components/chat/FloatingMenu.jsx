import React from 'react';
import { Plus, X, Users, Megaphone } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

function MessageIcon({ size }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;
}

export default function FloatingMenu() {
  const showMenu = useChatStore((s) => s.showMenu);
  const setShowMenu = useChatStore((s) => s.setShowMenu);
  const setView = useChatStore((s) => s.setView);
  const setShowCreateGroup = useChatStore((s) => s.setShowCreateGroup);
  const setIsChannel = useChatStore((s) => s.setIsChannel);

  return (
    <>
      {showMenu && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={() => setShowMenu(false)}>
          <div className="absolute bottom-[10rem] right-6 flex flex-col gap-3 items-end">
            <button
              onClick={() => { setShowMenu(false); setView('search'); }}
              className="flex items-center gap-3 bg-[#1c1c1e] px-4 py-3 rounded-full border border-white/10 shadow-2xl animate-slide-up"
            >
              <span className="text-sm font-semibold text-white">New Chat</span>
              <div className="p-2 bg-blue-500 rounded-full text-white"><MessageIcon size={18} /></div>
            </button>
            <button
              onClick={() => { setShowMenu(false); setIsChannel(false); setShowCreateGroup(true); }}
              className="flex items-center gap-3 bg-[#1c1c1e] px-4 py-3 rounded-full border border-white/10 shadow-2xl animate-slide-up"
              style={{ animationDelay: '50ms' }}
            >
              <span className="text-sm font-semibold text-white">New Group</span>
              <div className="p-2 bg-green-500 rounded-full text-white"><Users size={18} /></div>
            </button>
            <button
              onClick={() => { setShowMenu(false); setIsChannel(true); setShowCreateGroup(true); }}
              className="flex items-center gap-3 bg-[#1c1c1e] px-4 py-3 rounded-full border border-white/10 shadow-2xl animate-slide-up"
              style={{ animationDelay: '100ms' }}
            >
              <span className="text-sm font-semibold text-white">New Channel</span>
              <div className="p-2 bg-purple-500 rounded-full text-white"><Megaphone size={18} /></div>
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`fixed bottom-24 right-6 p-4 rounded-full shadow-lg transition-all z-[70] ${
          showMenu ? 'bg-[#1c1c1e] border border-white/20 text-white rotate-45' : 'bg-white text-black hover:scale-105 active:scale-90'
        }`}
      >
        <Plus size={24} className={showMenu ? 'rotate-45 transition-transform' : 'transition-transform'} />
      </button>
    </>
  );
}
