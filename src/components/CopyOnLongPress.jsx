import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { useChatStore } from '../store/chatStore';

export const CopyOnLongPress = ({ value, displayValue, className = '', icon = false }) => {
  const [copied, setCopied] = useState(false);
  const [pressed, setPressed] = useState(false);
  const setToast = useChatStore(s => s.setToast);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setToast({ type: 'success', message: 'Copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setToast({ type: 'error', message: 'Copy failed' });
    }
  };

  const handleTouchStart = () => {
    setPressed(true);
  };

  const handleTouchEnd = () => {
    if (pressed) {
      handleCopy();
      setPressed(false);
    }
  };

  return (
    <span 
      onClick={handleCopy}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`cursor-pointer hover:text-blue-400 transition-colors ${className}`}
      title="Tap to copy"
    >
      {copied ? (
        <span className="flex items-center gap-1"><Check size={12} className="text-green-400" /> Copied</span>
      ) : (
        displayValue || value
      )}
    </span>
  );
};