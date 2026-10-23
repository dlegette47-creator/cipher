import React from 'react';

export default function ChatListSkeleton() {
  return (
    <div className="flex-1 overflow-hidden px-4 py-2 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 mb-2 rounded-2xl bg-white/5">
          <div className="w-12 h-12 rounded-full bg-white/10 flex-shrink-0"></div>
          <div className="flex-1">
            <div className="h-4 bg-white/10 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-white/5 rounded w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
