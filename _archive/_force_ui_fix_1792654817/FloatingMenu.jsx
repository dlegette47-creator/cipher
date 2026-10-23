import React from 'react';
import { Plus, Users } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

function MessageIcon({ size }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;
}

export default function FloatingMenu() {
  const showMenu = useChatStore((s) => s.showMenu);
  const setShowMenu = useChatStore((s) => s.setShowMenu);
  const setView = useChatStore((s) => s.setView);
  const setShowCreateGroup = useChatStore((s) => s.setShowCreateGroup);

  return (
    <>
      {showMenu && (
        <div className="absolute inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowMenu(false)}>
          <div className="absolute bottom-24 right-6 flex flex-col gap-3 items-end">
            <button onClick={() => { setShowMenu(false); setView('search'); }} className="flex items-center gap-3 bg-surface px-4 py-3 rounded-full border border-white/10 shadow-xl animate-slide-up">
              <span className="text-sm font-semibold">New Chat</span>
              <div className="p-2 bg-blue-500 rounded-full text-white"><MessageIcon size={18} /></div>
            </button>
            <button onClick={() => { setShowMenu(false); setShowCreateGroup(true); }} className="flex items-center gap-3 bg-surface px-4 py-3 rounded-full border border-white/10 shadow-xl animate-slide-up" style={{ animationDelay: '50ms' }}>
              <span className="text-sm font-semibold">New Group/Channel</span>
              <div className="p-2 bg-green-500 rounded-full text-white"><Users size={18} /></div>
            </button>
          </div>
        </div>
      )}

      <button onClick={() => setShowMenu(true)} className="fixed bottom-24 right-6 p-4 bg-white text-black rounded-full shadow-lg hover:scale-105 active:scale-90 transition-transform z-50">
        <Plus size={24} />
      </button>
    </>
  );
}
