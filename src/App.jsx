import { requestNotificationPermission } from './lib/notifications';
import React, { useState, useEffect } from 'react'
import { haptic } from './lib/haptics';
import { MessageSquare, Compass, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useIdentity } from './useIdentity'
import { useChatStore } from './store/chatStore'
import { migrateGlobalKeys } from './lib/storage'
import { openDBFor } from './db';
import { usePanicWipe } from './hooks/usePanicWipe'
import { useGroupKeyMember } from './hooks/useGroupKeyMember'
import TutorialModal from './components/TutorialModal'
import GlobalDialog from './components/GlobalDialog'
import LockScreen from './LockScreen'
import Discover from './Discover'
import Chat from './Chat'
import Wallet from './Wallet' 

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full overflow-auto bg-black text-red-500 p-6 font-mono flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold mb-4">App Crashed</h1>
          <pre className="text-xs whitespace-pre-wrap bg-red-900/20 p-4 rounded-xl border border-red-500/50 w-full max-w-md overflow-auto">{this.state.error.toString()}</pre>
          <button onClick={() => window.location.reload()} className="mt-6 px-6 py-3 bg-white text-black font-bold rounded-xl">Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function MainApp() {
  const identity = useIdentity()
  const panicWipeEnabled = useChatStore((s) => s.panicWipeEnabled);
  usePanicWipe(identity, panicWipeEnabled);
  useEffect(() => { requestNotificationPermission(); }, []);
  useGroupKeyMember({ identity });

  // Migrate old global keys + reload store per-account (fixes cross-account leakage)
  useEffect(() => {
    if (!identity?.pk) return;
    try {
      openDBFor(identity.pk); // CRITICAL: Open DB before any chat hooks fire
      migrateGlobalKeys();
      useChatStore.getState().reload();
    } catch (e) { console.warn('storage migration:', e); }
  }, [identity?.pk]);


  // Auto-lock when app is backgrounded/locked for >30s
  useEffect(() => {
    let hiddenAt = null;
    const handler = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
      } else if (hiddenAt) {
        const elapsed = Date.now() - hiddenAt;
        if (elapsed > 30000 && identity?.sk && typeof identity.lockApp === 'function') {
          identity.lockApp();
        }
        hiddenAt = null;
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [identity?.sk]);

  const [activeTab, setActiveTab] = useState('chat')
  const unreadCounts = useChatStore(s => s.unreadCounts);
  const chatView = useChatStore(s => s.view);
  const totalUnread = Object.values(unreadCounts || {}).reduce((sum, n) => sum + (n || 0), 0);

  useEffect(() => {
    const handler = () => setActiveTab('chat');
    window.addEventListener('switch-to-chat-tab', handler);
    return () => window.removeEventListener('switch-to-chat-tab', handler);
  }, []);

  // Cipher is pure black — always dark
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.style.background = '#000000';
    document.body.style.background = '#000000';
  }, []);


  useEffect(() => {
    if (identity?.pk && localStorage.getItem('cipher_new_account') === 'true') {
      setShowTutorial(true);
    }
  }, [identity?.pk]);

  const [showTutorial, setShowTutorial] = useState(false)
    

  if (identity.loadingSession) {
    return <div className="h-full bg-black flex items-center justify-center" role="status" aria-label="Loading"><div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div></div>;
  }

  if (!identity.sk) return <LockScreen identity={identity} />

  const tabs = [
    { id: 'chat', label: 'Chats', Icon: MessageSquare, badge: totalUnread },
    { id: 'explore', label: 'Discover', Icon: Compass },
    { id: 'profile', label: 'Profile', Icon: User },
  ];
  const hideNav = activeTab === 'chat' && (chatView === 'dm' || chatView === 'group');

  return (
    <div className="h-full w-full bg-base text-white overflow-hidden flex flex-col pt-safe">
      <TutorialModal isOpen={showTutorial} onClose={() => { setShowTutorial(false); localStorage.removeItem('cipher_new_account'); }} />
      <GlobalDialog />
      <main className="flex-1 min-h-0 w-full max-w-md mx-auto relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="h-full flex flex-col overflow-hidden"
          >
            {activeTab === 'chat' && <Chat identity={identity} />}
            {activeTab === 'explore' && <Discover identity={identity} setActiveTab={setActiveTab} />}
            {activeTab === 'profile' && <Wallet identity={identity} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {!hideNav && (
        <nav aria-label="Main" className="shrink-0 z-50 bg-black/85 backdrop-blur-xl border-t border-white/10 pb-safe">
          <div className="flex justify-around items-stretch h-16 max-w-md mx-auto px-2">
            {tabs.map(({ id, label, Icon, badge }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => {
                    haptic(10);
                    if (active && id === 'chat') useChatStore.getState().closeChat?.();
                    setActiveTab(id);
                  }}
                  className={`relative flex-1 flex flex-col items-center justify-center gap-1 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors active:scale-95 ${active ? 'text-white' : 'text-white/45 hover:text-white/70'}`}
                >
                  {active && <motion.span layoutId="nav-pill" className="absolute top-1.5 h-8 w-14 rounded-full bg-white/10" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                  <span className="relative">
                    <Icon size={22} strokeWidth={active ? 2.4 : 2} className={active ? 'text-blue-500' : ''} aria-hidden="true" />
                    {badge > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1 ring-2 ring-black">
                        {badge > 99 ? '99+' : badge}
                        <span className="sr-only"> unread</span>
                      </span>
                    )}
                  </span>
                  <span className="relative text-[11px] font-medium">{label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  )
}

export default function App() {
  return <ErrorBoundary><MainApp /></ErrorBoundary>
}
