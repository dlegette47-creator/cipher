import React from 'react';
import { useChatStore } from '../../store/chatStore';

export default function CreateGroupModal({ createGroup }) {
  const showCreateGroup = useChatStore((s) => s.showCreateGroup);
  const setShowCreateGroup = useChatStore((s) => s.setShowCreateGroup);
  const newGroupName = useChatStore((s) => s.newGroupName);
  const setNewGroupName = useChatStore((s) => s.setNewGroupName);
  const newGroupAbout = useChatStore((s) => s.newGroupAbout);
  const setNewGroupAbout = useChatStore((s) => s.setNewGroupAbout);
  const isChannel = useChatStore((s) => s.isChannel);
  const setIsChannel = useChatStore((s) => s.setIsChannel);
  const loading = useChatStore((s) => s.loading);

  if (!showCreateGroup) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-gray-300 dark:border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button onClick={() => setShowCreateGroup(false)} className="absolute top-4 right-4 text-black dark:text-white/50 hover:text-black dark:text-white">✕</button>
        <h2 className="text-xl font-bold mb-4">New Group/Channel</h2>
        <form onSubmit={createGroup} className="space-y-4">
          <div>
            <label className="block text-sm text-black dark:text-white/60 mb-1">Name</label>
            <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Group name" className="w-full bg-white dark:bg-black border border-gray-300 dark:border-gray-800 rounded-lg p-3 text-black dark:text-white focus:outline-none focus:border-blue-500" autoFocus />
          </div>
          <div>
            <label className="block text-sm text-black dark:text-white/60 mb-1">About (Optional)</label>
            <input type="text" value={newGroupAbout} onChange={(e) => setNewGroupAbout(e.target.value)} placeholder="What is this about?" className="w-full bg-white dark:bg-black border border-gray-300 dark:border-gray-800 rounded-lg p-3 text-black dark:text-white focus:outline-none focus:border-blue-500" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={isChannel} onChange={(e) => setIsChannel(e.target.checked)} id="isChannel" className="rounded border-gray-300 dark:border-gray-800 bg-white dark:bg-black" />
            <label htmlFor="isChannel" className="text-sm text-black dark:text-white/80">Create as Channel</label>
          </div>
          <button type="submit" disabled={loading || newGroupName.trim().length === 0} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-black dark:text-white font-semibold py-3 rounded-lg transition-colors">
            {loading ? 'Creating...' : 'Create'}
          </button>
        </form>
      </div>
    </div>
  );
}
