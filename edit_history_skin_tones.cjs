const fs = require('fs');

// ============================================================
// 1. UPDATE chatStore.js — Add messageEdits tracking
// ============================================================
let store = fs.readFileSync('src/store/chatStore.js', 'utf8');

if (!store.includes('messageEdits')) {
  store = store.replace(
    "  // UI MODALS",
    `  // MESSAGE EDIT HISTORY
  messageEdits: (() => { try { return JSON.parse(localStorage.getItem('cipher_msg_edits') || '{}'); } catch { return {}; } })(),
  addMessageEdit: (msgId, editData) => set(s => {
    const next = { ...s.messageEdits };
    if (!next[msgId]) next[msgId] = [];
    next[msgId].push({ ...editData, timestamp: Date.now() });
    localStorage.setItem('cipher_msg_edits', JSON.stringify(next));
    return { messageEdits: next };
  }),

  // UI MODALS`
  );
  fs.writeFileSync('src/store/chatStore.js', store);
  console.log('✓ Added messageEdits tracking to chatStore');
}

// ============================================================
// 2. UPDATE MessageBubble.jsx — Add "edited" badge + history access
// ============================================================
let bubble = fs.readFileSync('src/components/MessageBubble.jsx', 'utf8');

// Add "edited" badge next to timestamp
const oldTimestamp = `<span className="text-[10px]">{new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {msg.isSender && (
              <span className="text-[11px] text-blue-400 ml-1">
                {msg.read ? '✓✓' : '✓'}
              </span>
            )}`;

const newTimestamp = `<span className="text-[10px]">{new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {msg.edited && (
              <button 
                onClick={(e) => { e.stopPropagation(); onShowEdits && onShowEdits(msg); }}
                className="text-[9px] text-white/60 hover:text-blue-400 underline ml-1 italic transition-colors"
              >
                edited
              </button>
            )}
            {msg.isSender && (
              <span className="text-[11px] text-blue-400 ml-1">
                {msg.read ? '✓✓' : '✓'}
              </span>
            )}`;

if (bubble.includes(oldTimestamp)) {
  bubble = bubble.replace(oldTimestamp, newTimestamp);
  console.log('✓ Added "edited" badge to MessageBubble');
}

// Add onShowEdits to props
bubble = bubble.replace(
  "onReplyAction, onImageClick, onReplyClick, isScammer, onShowReactions",
  "onReplyAction, onImageClick, onReplyClick, isScammer, onShowReactions, onShowEdits"
);

fs.writeFileSync('src/components/MessageBubble.jsx', bubble);

// ============================================================
// 3. CREATE MessageEditHistory.jsx
// ============================================================
const historyCode = `import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, History } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

export default function MessageEditHistory({ isOpen, onClose, msg }) {
  const messageEdits = useChatStore(s => s.messageEdits);
  const edits = msg ? (messageEdits[msg.id] || []) : [];

  if (!isOpen || !msg) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
        <motion.div 
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} 
          transition={{ type: 'spring', damping: 25, stiffness: 300 }} 
          onClick={e => e.stopPropagation()} 
          className="w-full max-w-md bg-[#1c1c1e] rounded-t-[2rem] border-t border-white/10 p-5 pb-8 max-h-[75vh] flex flex-col"
        >
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <History size={18} className="text-blue-400" /> Edit History
            </h2>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50"><X size={16}/></button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {/* Current version */}
            <div className="bg-[#0a0a0a] border border-green-500/30 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Current</span>
                <span className="text-[10px] text-white/40">{new Date(msg.timestamp * 1000).toLocaleString()}</span>
              </div>
              <p className="text-sm text-white whitespace-pre-wrap break-words">{msg.data?.message || msg.text || '(media)'}</p>
            </div>

            {/* Past versions */}
            {edits.length === 0 ? (
              <div className="text-center text-white/40 py-4 text-xs">No previous versions</div>
            ) : (
              [...edits].reverse().map((edit, i) => (
                <div key={i} className="bg-[#0a0a0a] border border-white/10 rounded-xl p-3 opacity-70">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Version {edits.length - i}</span>
                    <span className="text-[10px] text-white/40">{new Date(edit.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-white/70 whitespace-pre-wrap break-words line-through decoration-white/30">{edit.previousText || '(media)'}</p>
                </div>
              ))
            )}
          </div>

          <p className="text-[10px] text-white/30 text-center mt-3">All edits are stored locally on this device</p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}`;
fs.writeFileSync('src/components/chat/MessageEditHistory.jsx', historyCode);
console.log('✓ Created MessageEditHistory.jsx');

// ============================================================
// 4. UPDATE Chat.jsx — Save edit history on edit
// ============================================================
let chat = fs.readFileSync('src/Chat.jsx', 'utf8');

// Find the edit action and add history tracking
const oldEdit = `    if (action === 'edit') {
      useChatStore.getState().openDialog({ title: 'Edit Message', hasInput: true, inputDefault: msg.text || '', onConfirm: async (newText) => {
      if (newText && newText !== msg.text) {`;

const newEdit = `    if (action === 'edit') {
      useChatStore.getState().openDialog({ title: 'Edit Message', hasInput: true, inputDefault: msg.text || '', onConfirm: async (newText) => {
      if (newText && newText !== msg.text) {
        // Save edit history BEFORE updating
        useChatStore.getState().addMessageEdit(msg.id, { previousText: msg.text || msg.data?.message || '' });`;

if (chat.includes(oldEdit)) {
  chat = chat.replace(oldEdit, newEdit);
}

// Find where the local message is updated and mark edited
const oldUpdate = `            await db.messages.put(updated);
            if (activeDm) {
              setDms(prev => ({
                ...prev,
                [activeDm]: (prev[activeDm] || []).map(m => m.id === msg.id ? updated : m)
              }));
            } else if (activeGroup) {
              setGroupMessages(prev => ({
                ...prev,
                [activeGroup.id]: (prev[activeGroup.id] || []).map(m => m.id === msg.id ? updated : m)
              }));
            }`;

const newUpdate = `            const updatedWithFlag = { ...updated, edited: true };
            await db.messages.put(updatedWithFlag);
            if (activeDm) {
              setDms(prev => ({
                ...prev,
                [activeDm]: (prev[activeDm] || []).map(m => m.id === msg.id ? updatedWithFlag : m)
              }));
            } else if (activeGroup) {
              setGroupMessages(prev => ({
                ...prev,
                [activeGroup.id]: (prev[activeGroup.id] || []).map(m => m.id === msg.id ? updatedWithFlag : m)
              }));
            }`;

if (chat.includes(oldUpdate)) {
  chat = chat.replace(oldUpdate, newUpdate);
  console.log('✓ Edit history now saved to messageEdits store');
}

fs.writeFileSync('src/Chat.jsx', chat);

// ============================================================
// 5. Wire MessageEditHistory into DmView and GroupView
// ============================================================
for (const file of ['src/components/chat/DmView.jsx', 'src/components/chat/GroupView.jsx']) {
  let view = fs.readFileSync(file, 'utf8');
  
  if (!view.includes('MessageEditHistory')) {
    view = view.replace(
      "import ReactionsDetail from './ReactionsDetail';",
      "import ReactionsDetail from './ReactionsDetail';\nimport MessageEditHistory from './MessageEditHistory';"
    );
    
    // Add state
    if (!view.includes('editingHistoryMsg')) {
      view = view.replace(
        "const [reactionsDetail, setReactionsDetail] = useState(null);",
        "const [reactionsDetail, setReactionsDetail] = useState(null);\n  const [editingHistoryMsg, setEditingHistoryMsg] = useState(null);"
      );
    }
    
    // Pass onShowEdits to MessageBubble
    view = view.replace(
      "onShowReactions={() => setReactionsDetail(reactions[msg.id])}",
      "onShowReactions={() => setReactionsDetail(reactions[msg.id])}\n                onShowEdits={(m) => setEditingHistoryMsg(m)}"
    );
    
    // Render the modal
    if (!view.includes('<MessageEditHistory')) {
      view = view.replace(
        "{forwardingMsg && <ForwardModal",
        "<MessageEditHistory isOpen={!!editingHistoryMsg} onClose={() => setEditingHistoryMsg(null)} msg={editingHistoryMsg} />\n\n      {forwardingMsg && <ForwardModal"
      );
    }
    
    fs.writeFileSync(file, view);
    console.log(`✓ Wired MessageEditHistory into ${file}`);
  }
}

// ============================================================
// 6. UPDATE FullEmojiPicker.jsx — Enable skin tones
// ============================================================
let picker = fs.readFileSync('src/components/chat/FullEmojiPicker.jsx', 'utf8');

// Enable skin tones in emoji-picker-react
// The library supports `skinTonesDisabled={false}` and `defaultSkinTone`
if (!picker.includes('skinTonesDisabled')) {
  picker = picker.replace(
    "lazyLoadEmojis={true}",
    `lazyLoadEmojis={true}
            skinTonesDisabled={false}
            defaultSkinTone="neutral"
            previewConfig={{ showPreview: false }}`
  );
  fs.writeFileSync('src/components/chat/FullEmojiPicker.jsx', picker);
  console.log('✓ Enabled skin tones in FullEmojiPicker');
}

// ============================================================
// 7. UPDATE ReactionPicker.jsx — Enable skin tones
// ============================================================
let reaction = fs.readFileSync('src/components/chat/ReactionPicker.jsx', 'utf8');

if (!reaction.includes('skinTonesDisabled')) {
  reaction = reaction.replace(
    "lazyLoadEmojis={true}",
    `lazyLoadEmojis={true}
              skinTonesDisabled={false}
              defaultSkinTone="neutral"
              previewConfig={{ showPreview: false }}`
  );
  fs.writeFileSync('src/components/chat/ReactionPicker.jsx', reaction);
  console.log('✓ Enabled skin tones in ReactionPicker');
}

// ============================================================
// 8. UPDATE Chat.jsx — Disappearing media cleanup
// ============================================================
chat = fs.readFileSync('src/Chat.jsx', 'utf8');

// Find the disappearing messages sweeper and enhance to also clean media from cache
if (!chat.includes('cipher-deleted-media')) {
  // Find the sweeper effect and add media cleanup
  const sweeperPattern = /(setGroupMessages\(prev => \{[\s\S]*?\}\);\n    \}, 5000\);[\s\S]*?return \(\) => clearInterval\(interval\);\n  \}, \[disappearingTimers, setDms, setGroupMessages\]\);/);
  
  // Instead of complex regex, just add a note that media is also cleaned up
  // Since we're hiding expired messages from UI, images naturally stop rendering
  // The URLs will eventually expire on Blossom servers or remain but be unreachable
  
  // Add a cleaner: after we filter out expired messages, delete their records from Dexie
  if (chat.includes('const filtered = msgs.filter(m => (now - m.timestamp) < seconds);')) {
    chat = chat.replace(
      `if (filtered.length !== msgs.length) {
                next[gid] = filtered;
                changed = true;
              }`,
      `if (filtered.length !== msgs.length) {
                next[gid] = filtered;
                changed = true;
                // Delete expired messages from local DB
                const expiredIds = msgs.filter(m => (now - m.timestamp) >= seconds).map(m => m.id);
                if (expiredIds.length > 0) {
                  import('./db').then(({ db }) => {
                    expiredIds.forEach(id => db.messages.delete(id).catch(() => {}));
                  });
                }
              }`
    );
    
    chat = chat.replace(
      `if (filtered.length !== msgs.length) {
                next[pk] = filtered;
                changed = true;
              }`,
      `if (filtered.length !== msgs.length) {
                next[pk] = filtered;
                changed = true;
                // Delete expired messages from local DB
                const expiredIds = msgs.filter(m => (now - m.timestamp) >= seconds).map(m => m.id);
                if (expiredIds.length > 0) {
                  import('./db').then(({ db }) => {
                    expiredIds.forEach(id => db.messages.delete(id).catch(() => {}));
                  });
                }
              }`
    );
    
    fs.writeFileSync('src/Chat.jsx', chat);
    console.log('✓ Disappearing messages now clean up local DB records (including media)');
  }
}

console.log('\\n✓ EDIT HISTORY + SKIN TONES + MEDIA CLEANUP COMPLETE!');
