import React, { useState, useEffect } from 'react'
import { haptic } from './lib/haptics';
import { MessageSquare, Compass, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useIdentity } from './useIdentity'
import { useChatStore } from './store/chatStore'
import { usePanicWipe } from './hooks/usePanicWipe'
import TutorialModal from './components/TutorialModal'
import LockScreen from './LockScreen'
import Shop from './Shop'
import Chat from './Chat'
import Wallet from './Wallet' 

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-red-500 p-6 font-mono flex flex-col items-center justify-center">
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
  const theme = useChatStore((s) => s.theme);
  usePanicWipe(identity, panicWipeEnabled);
  if (identity?.pk) console.log('YOUR PUBKEY:', identity.pk)
  const [activeTab, setActiveTab] = useState('chat')

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);


  useEffect(() => {
    if (identity?.pk && localStorage.getItem('cipher_new_account') === 'true') {
      setShowTutorial(true);
    }
  }, [identity?.pk]);

  const [showTutorial, setShowTutorial] = useState(false)
    

  if (identity.loadingSession) {
    return <div className="h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div></div>;
  }

  if (!identity.sk) return <LockScreen identity={identity} />

  return (
    <div className="h-full w-full bg-base text-white overflow-hidden flex justify-center">
      <TutorialModal isOpen={showTutorial} onClose={() => { setShowTutorial(false); localStorage.removeItem('cipher_new_account'); }} />
      <main className="w-full max-w-md h-full relative overflow-hidden">
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
            {activeTab === 'explore' && <Shop identity={identity} setActiveTab={setActiveTab} />}
            {activeTab === 'profile' && <Wallet identity={identity} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <motion.nav 
        initial={{ y: 50 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-base/90 backdrop-blur-xl border-t border-white/10 pb-safe"
      >
        <div className="flex justify-around items-center h-16 max-w-md mx-auto px-6">
          <button onClick={() => { haptic(10); setActiveTab('chat'); }} className={`flex flex-col items-center justify-center gap-1 w-16 h-full outline-none focus:outline-none focus:ring-0 transition-all active:scale-90 ${activeTab === 'chat' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            <MessageSquare size={22} strokeWidth={activeTab === 'chat' ? 2.5 : 2} strokeLinecap="round" className={activeTab === 'chat' ? 'text-blue-500' : ''} />
            <span className="text-[10px] font-medium">Chats</span>
          </button>
          <button onClick={() => { haptic(10); setActiveTab('explore'); }} className={`flex flex-col items-center justify-center gap-1 w-16 h-full outline-none focus:outline-none focus:ring-0 transition-all active:scale-90 ${activeTab === 'explore' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            <Compass size={22} strokeWidth={activeTab === 'explore' ? 2.5 : 2} className={activeTab === 'explore' ? 'text-blue-500' : ''} />
            <span className="text-[10px] font-medium">Explore</span>
          </button>
          <button onClick={() => { haptic(10); setActiveTab('profile'); }} className={`flex flex-col items-center justify-center gap-1 w-16 h-full outline-none focus:outline-none focus:ring-0 transition-all active:scale-90 ${activeTab === 'profile' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            <User size={22} strokeWidth={activeTab === 'profile' ? 2.5 : 2} className={activeTab === 'profile' ? 'text-blue-500' : ''} />
            <span className="text-[10px] font-medium">Profile</span>
          </button>
        </div>
      </motion.nav>
    </div>
  )
}

export default function App() {
  return <ErrorBoundary><MainApp /></ErrorBoundary>
}
