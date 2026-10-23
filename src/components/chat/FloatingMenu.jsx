import React, { useEffect } from 'react';
import { Plus, Users, Megaphone, MessageCircle } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

const ACTIONS = [
  { key: 'chat', label: 'New Chat', Icon: MessageCircle, color: 'bg-blue-500' },
  { key: 'group', label: 'New Group', Icon: Users, color: 'bg-emerald-500' },
  { key: 'channel', label: 'New Channel', Icon: Megaphone, color: 'bg-violet-500' },
];

export default function FloatingMenu() {
  const showMenu = useChatStore((s) => s.showMenu);
  const setShowMenu = useChatStore((s) => s.setShowMenu);
  const setView = useChatStore((s) => s.setView);
  const setShowCreateGroup = useChatStore((s) => s.setShowCreateGroup);
  const setIsChannel = useChatStore((s) => s.setIsChannel);

  useEffect(() => {
    if (!showMenu) return;
    const onKey = (e) => { if (e.key === 'Escape') setShowMenu(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showMenu, setShowMenu]);

  const run = (key) => {
    setShowMenu(false);
    if (key === 'chat') setView('search');
    else { setIsChannel(key === 'channel'); setShowCreateGroup(true); }
  };

  return (
    <>
      {showMenu && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={() => setShowMenu(false)}>
          <div className="fixed fab-menu-pos flex flex-col gap-3 items-end" role="menu">
            {ACTIONS.map(({ key, label, Icon, color }, i) => (
              <button
                key={key}
                role="menuitem"
                onClick={(e) => { e.stopPropagation(); run(key); }}
                className="flex items-center gap-3 bg-[#1c1c1e] pl-4 pr-2 py-2 rounded-full border border-white/10 shadow-2xl animate-slide-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <span className="text-sm font-semibold text-white">{label}</span>
                <span className={`p-2 ${color} rounded-full text-white`}><Icon size={18} aria-hidden="true" /></span>
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setShowMenu(!showMenu)}
        aria-label={showMenu ? 'Close menu' : 'New chat, group or channel'}
        aria-expanded={showMenu}
        className={`fixed fab-pos h-14 w-14 flex items-center justify-center rounded-full shadow-lg shadow-black/50 transition-all z-[70] ${
          showMenu ? 'bg-[#1c1c1e] border border-white/20 text-white' : 'bg-white text-black hover:scale-105 active:scale-90'
        }`}
      >
        <Plus size={24} className={`transition-transform ${showMenu ? 'rotate-45' : ''}`} aria-hidden="true" />
      </button>
    </>
  );
}
