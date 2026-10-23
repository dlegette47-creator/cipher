import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, Megaphone, Users, X, UserPlus } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

export default function SearchView({ ToastUI, handleSearch, joinGroupById, openChat }) {
  const searchQuery = useChatStore((s) => s.searchQuery);
  const setSearchQuery = useChatStore((s) => s.setSearchQuery);
  const searchResults = useChatStore((s) => s.searchResults);
  const isSearching = useChatStore((s) => s.isSearching);
  const setView = useChatStore((s) => s.setView);

  const searchTimer = useRef(null);
  
  useEffect(() => {
    clearTimeout(searchTimer.current);
    
    // Don't search for empty strings or just "@" (prevents random user spam)
    if (searchQuery.trim().length < 2) {
      useChatStore.getState().setSearchResults([]);
      return;
    }
    
    searchTimer.current = setTimeout(() => {
      handleSearch();
    }, 800); // Wait 800ms after you stop typing
    
    return () => clearTimeout(searchTimer.current);
  }, [searchQuery]);

  const handleResultClick = (res) => {
    if (res.type === 'user') {
      openChat('dm', res.pubkey);
    } else if (res.type === 'group') {
      const localGroups = JSON.parse(localStorage.getItem('cipher_my_groups') || '[]');
      if (!localGroups.find(g => g.id === res.id)) {
        localGroups.push({ id: res.id, name: res.name, isChannel: res.isChannel, creator: res.creator });
        localStorage.setItem('cipher_my_groups', JSON.stringify(localGroups));
      }
      openChat('group', res.id, res);
    }
  };

  const isGroupId = searchQuery.length >= 12 && searchQuery.length <= 20 && /^[a-z0-9_-]+$/i.test(searchQuery) && !searchQuery.includes(' ');

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      <ToastUI />
      
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center gap-3 sticky top-0 z-10 bg-[#0a0a0a]">
        <button onClick={() => setView('list')} className="p-2 -ml-2 text-white/60 hover:text-white transition-colors">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 flex items-center bg-[#171717] rounded-xl px-4 py-2.5 border border-white/5 focus-within:border-blue-500 transition-colors">
          <Search size={18} className="text-white/40 mr-2" />
          <input
            autoFocus
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="Search @users, groups, or paste ID..."
            className="bg-transparent text-[15px] text-white outline-none w-full placeholder-white/30"
          />
          {searchQuery.length > 0 && (
            <button onClick={() => setSearchQuery('')} className="p-1 text-white/40 hover:text-white">
              <X size={16} />
            </button>
          )}
        </div>
        <button onClick={handleSearch} className="text-sm font-bold text-blue-500 hover:text-blue-400">
          Search
        </button>
      </div>

      {/* Results Area */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3">
        
        {/* Smart Group ID Join Card */}
        {isGroupId && !isSearching && (
          <div 
            onClick={() => joinGroupById(searchQuery)}
            className="bg-blue-600/10 border border-blue-500/30 p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-blue-600/20 transition-colors mb-4"
          >
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
              <UserPlus size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Join Group</p>
              <p className="text-xs text-blue-400/80 font-mono truncate">{searchQuery}</p>
            </div>
          </div>
        )}

        {isSearching && (
          <div className="flex flex-col items-center justify-center mt-20 text-white/40">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-medium">Searching relays...</p>
          </div>
        )}

        {!isSearching && searchResults.length === 0 && !isGroupId && (
          <div className="text-center mt-20 px-6 flex flex-col items-center">
            <div className="w-20 h-20 bg-[#171717] rounded-full flex items-center justify-center mb-6">
              <Search size={32} className="text-white/20" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {searchQuery.length > 0 ? 'No results found' : 'Find your people'}
            </h2>
            <p className="text-sm text-white/40 mb-6 text-center leading-relaxed">
              {searchQuery.length > 0 
                ? `We couldn't find anything for "${searchQuery}". Try waiting a few seconds and searching again.`
                : <>Search for <span className="text-blue-400">@usernames</span>, paste an <span className="text-blue-400">npub</span>, or enter a Group ID to join a community.</>}
            </p>
          </div>
        )}

        {searchResults.map((res, i) => (
          <div
            key={i}
            onClick={() => handleResultClick(res)}
            className="bg-[#111] hover:bg-[#1a1a1a] p-3 rounded-2xl border border-white/5 flex items-center gap-4 cursor-pointer transition-colors active:scale-[0.98]"
          >
            {res.type === 'user' ? (
              res.picture ? (
                <img src={res.picture} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-lg">
                  {res.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )
            ) : (
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                {res.isChannel ? <Megaphone size={22} className="text-purple-400" /> : <Users size={22} className="text-blue-400" />}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-white truncate">{res.name}</p>
              <p className="text-[11px] text-white/40 uppercase tracking-wider font-medium">
                {res.type === 'user' ? 'User' : (res.isChannel ? 'Channel' : 'Public Group')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}