import React, { useState, useEffect } from 'react';
import { Compass, Users, Megaphone, Search } from 'lucide-react';
import { getAuthenticatedPool } from './lib/pool';
import { groupRelays, queryWithTimeout } from './lib/relays';
import { useChatStore } from './store/chatStore';
import { getMyGroups, setMyGroups } from './lib/myGroups';

export default function Discover({ identity, setActiveTab }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const openChat = useChatStore(s => s.openChat);
  const setToast = useChatStore(s => s.setToast);

  useEffect(() => {
    if (!identity?.pk) return;
    const fetchGroups = async () => {
      try {
        const pool = await getAuthenticatedPool(identity);
        const events = await queryWithTimeout(pool, groupRelays, { kinds: [39000, 9002], limit: 100 });
        
        const parsed = events.map(ev => {
          const getTag = (t) => ev.tags.find(x => x[0] === t)?.[1];
          return {
            id: getTag('h') || getTag('d'),
            name: getTag('name') || 'Unnamed Group',
            about: getTag('about') || 'No description',
            isChannel: ev.tags.some(t => t[0] === 'channel' || t[0] === 'broadcast')
          };
        }).filter(g => g.id && g.name);

        const unique = Array.from(new Map(parsed.map(g => [g.id, g])).values());
        setGroups(unique);
      } catch (err) {
        console.error("Failed to fetch groups:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, [identity]);

  const handleJoin = (g) => {
    const localGroups = getMyGroups(identity.pk);
    if (!localGroups.find(x => x.id === g.id)) {
      setMyGroups(identity.pk, [...localGroups, g]);
    }
    openChat('group', g.id, g);
    if (setActiveTab) setActiveTab('chat');
    setToast({ type: 'success', message: 'Joined ' + g.name });
  };

  const filtered = groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-full p-4 flex flex-col bg-[#0a0a0a] overflow-hidden pb-8">
      <div className="flex items-center gap-3 mb-6 shrink-0">
        <Compass size={24} className="text-white" />
        <h2 className="text-2xl font-bold tracking-tight text-white">Discover</h2>
      </div>

      <div className="relative mb-6 shrink-0">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input 
          type="text" 
          placeholder="Search public groups..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#171717] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 space-y-3">
        {loading ? (
          <div className="flex justify-center mt-20">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-white/40 mt-20">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p>No public groups found.</p>
          </div>
        ) : (
          filtered.map(g => (
            <div key={g.id} className="bg-[#111] border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${g.isChannel ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {g.isChannel ? <Megaphone size={24} /> : <Users size={24} />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold truncate">{g.name}</h3>
                <p className="text-xs text-white/50 line-clamp-2 mt-0.5">{g.about}</p>
              </div>
              <button 
                onClick={() => handleJoin(g)}
                className="bg-white text-black text-xs font-bold px-4 py-2 rounded-xl hover:bg-gray-200 transition-colors shrink-0"
              >
                Join
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}