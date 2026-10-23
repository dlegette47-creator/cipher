import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, MessageSquare } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

export default function FloatingMenu() {
  const showMenu = useChatStore((s) => s.showMenu);
  const setShowMenu = useChatStore((s) => s.setShowMenu);
  const setView = useChatStore((s) => s.setView);
  const setShowCreateGroup = useChatStore((s) => s.setShowCreateGroup);

  return (
    <>
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-white dark:bg-black/60 backdrop-blur-sm"
              onClick={() => setShowMenu(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="fixed bottom-40 right-6 flex flex-col gap-3 items-end z-50"
            >
              <button 
                onClick={() => { setShowMenu(false); setView('search'); }} 
                className="flex items-center gap-3 bg-[#1c1c1e] px-5 py-3.5 rounded-full border border-gray-300 dark:border-gray-800 shadow-2xl text-black dark:text-white hover:bg-[#2c2c2e] transition-colors"
              >
                <span className="text-sm font-bold tracking-wide">New Chat</span>
                <div className="p-2 bg-blue-500 rounded-full text-black dark:text-white shadow-lg"><MessageSquare size={16} /></div>
              </button>
              
              <button 
                onClick={() => { setShowMenu(false); setShowCreateGroup(true); }} 
                className="flex items-center gap-3 bg-[#1c1c1e] px-5 py-3.5 rounded-full border border-gray-300 dark:border-gray-800 shadow-2xl text-black dark:text-white hover:bg-[#2c2c2e] transition-colors"
              >
                <span className="text-sm font-bold tracking-wide">New Group</span>
                <div className="p-2 bg-green-500 rounded-full text-black dark:text-white shadow-lg"><Users size={16} /></div>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.button 
        animate={{ rotate: showMenu ? 45 : 0 }}
        onClick={() => setShowMenu(!showMenu)} 
        className="fixed bottom-24 right-6 p-4 bg-white text-black rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-transform z-50"
      >
        <Plus size={24} strokeWidth={2.5} />
      </motion.button>
    </>
  );
}
