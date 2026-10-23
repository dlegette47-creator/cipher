import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from 'emoji-picker-react';
import { X } from 'lucide-react';

export default function ReactionPicker({ onSelect, onClose }) {
  return createPortal(
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 pb-24 sm:pb-4"
        onClick={onClose}
      >
        <motion.div 
          initial={{ y: 50, scale: 0.95 }} 
          animate={{ y: 0, scale: 1 }} 
          exit={{ y: 50, scale: 0.95 }} 
          onClick={e => e.stopPropagation()}
          className="bg-[#1c1c1e] border border-white/10 rounded-3xl w-full max-w-[350px] overflow-hidden shadow-2xl flex flex-col"
        >
          <div className="flex justify-between items-center p-4 border-b border-white/5 bg-[#111]">
            <h3 className="text-white font-bold">React</h3>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50 hover:text-white transition-colors">
              <X size={16}/>
            </button>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <EmojiPicker 
              theme="dark"
              onEmojiClick={(emojiData) => {
                onSelect(emojiData.emoji);
                onClose();
              }}
              lazyLoadEmojis={true}
              skinTonesDisabled={false}
              defaultSkinTone="neutral"
              width="100%"
              height="400px"
              style={{ 
                background: '#1c1c1e', 
                border: 'none',
                '--epr-bg-color': '#1c1c1e',
                '--epr-category-label-bg-color': '#1c1c1e',
                '--epr-picker-border-color': 'transparent'
              }}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}