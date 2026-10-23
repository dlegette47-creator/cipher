import React from 'react';
import EmojiPicker from 'emoji-picker-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FullEmojiPicker({ onSelect, onClose }) {
  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[10000] bg-white dark:bg-black/60 backdrop-blur-sm flex items-end justify-center pb-sheet sm:items-center sm:pb-0"
      >
        <motion.div 
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#1c1c1e] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-gray-300 dark:border-gray-800"
        >
          <EmojiPicker 
            theme="dark" 
            onEmojiClick={(emojiData) => {
              onSelect(emojiData.emoji);
              onClose();
            }}
            lazyLoadEmojis={true}
            skinTonesDisabled={false}
            defaultSkinTone="neutral"
            style={{ width: '100%', maxWidth: '350px', height: '400px', background: '#1c1c1e' }}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
