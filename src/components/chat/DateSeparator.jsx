import React from 'react';

export const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

export default function DateSeparator({ timestamp }) {
  return (
    <div className="w-full flex justify-center my-4">
      <span className="bg-[#1c1c1e] text-gray-400 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-white/5">
        {formatDate(timestamp)}
      </span>
    </div>
  );
}