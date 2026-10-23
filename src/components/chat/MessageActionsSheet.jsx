import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Reply, Copy, Forward, Pin, Trash2, ShieldAlert, Bookmark, Pencil, X } from 'lucide-react';

export default function MessageActionsSheet({
  isOpen, onClose, onAction, msg, isAdmin, isMine, canEdit
}) {
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setCanClose(true), 150);
      return () => clearTimeout(t);
    } else {
      setCanClose(false);
    }
  }, [isOpen]);

  if (!isOpen || !msg) return null;

  const emojis = ['❤️', '👍', '🔥', '😂', '😮', '😢', '🙏'];

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={() => canClose && onClose()}>
      <div
        className="bg-[#1c1c1e] w-[300px] rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Emojis */}
        <div className="flex justify-around p-2 border-b border-white/10 bg-[#2c2c2e]">
          {emojis.map(emoji => (
            <button
              key={emoji}
              onClick={() => { onAction('react', emoji); onClose(); }}
              className="w-9 h-9 flex items-center justify-center text-xl hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={() => { onAction('open_picker'); }}
            className="w-9 h-9 flex items-center justify-center text-xl text-white/50 hover:text-white transition-transform bg-white/10 rounded-full ml-1"
          >
            +
          </button>
        </div>

        {/* Actions Grid */}
        <div className="grid grid-cols-3 gap-1 p-2">
          <button onClick={() => { onAction('reply'); onClose(); }} className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl hover:bg-white/10 transition-colors">
            <Reply size={20} className="text-blue-400" />
            <span className="text-[10px] text-white/80 font-semibold">Reply</span>
          </button>

          <button onClick={() => { onAction('select'); onClose(); }} className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl hover:bg-white/10 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/70"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            <span className="text-[10px] text-white/80 font-semibold">Select</span>
          </button>

          <button onClick={() => { onAction('copy'); onClose(); }} className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl hover:bg-white/10 transition-colors">
            <Copy size={20} className="text-white/70" />
            <span className="text-[10px] text-white/80 font-semibold">Copy</span>
          </button>

          <button onClick={() => { onAction('forward'); onClose(); }} className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl hover:bg-white/10 transition-colors">
            <Forward size={20} className="text-white/70" />
            <span className="text-[10px] text-white/80 font-semibold">Forward</span>
          </button>

          

          

          {isAdmin && (
            <button onClick={() => { onAction('pin'); onClose(); }} className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl hover:bg-white/10 transition-colors">
              <Pin size={20} className="text-yellow-400" />
              <span className="text-[10px] text-yellow-400 font-semibold">Pin</span>
            </button>
          )}

          {!isMine && (
            <button onClick={() => { onAction('report_scam'); onClose(); }} className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl hover:bg-red-500/10 transition-colors">
              <ShieldAlert size={20} className="text-red-500" />
              <span className="text-[10px] text-red-500 font-semibold">Report Scam</span>
            </button>
          )}

          {isMine && (
            <button onClick={() => { onAction('delete'); onClose(); }} className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl hover:bg-white/10 transition-colors">
              <Trash2 size={20} className="text-red-400" />
              <span className="text-[10px] text-red-400 font-semibold">Delete</span>
            </button>
          )}

          <button onClick={() => { onAction('report'); onClose(); }} className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl hover:bg-white/10 transition-colors">
            <ShieldAlert size={20} className="text-red-400" />
            <span className="text-[10px] text-red-400 font-semibold">Report</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
