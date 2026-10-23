import { useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { getAuthenticatedPool } from '../lib/pool';
import { groupRelays, queryWithTimeout } from '../lib/relays';
import { saveMessage } from '../db';
import { getMyGroups, setMyGroups } from '../lib/myGroups';

export function useNIP29Group({ identity }) {
  const setGroupsStore = useChatStore((s) => s.setGroups);
  const setGroups = useCallback((val) => {
    setGroupsStore((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      // Strict filter: only allow groups the user has explicitly joined/created.
      // This kills the relay WS listener that injects "lmfao".
      const myGroupIds = new Set(getMyGroups(identity?.pk).map(g => g.id));
      return next.filter(g => myGroupIds.has(g.id));
    });
  }, [identity?.pk, setGroupsStore]);
  const setGroupMessages = useChatStore((s) => s.setGroupMessages);
  const setGroupMembers = useChatStore((s) => s.setGroupMembers);
  const setGroupTypingUsers = useChatStore((s) => s.setGroupTypingUsers);
  const setPinnedMessages = useChatStore((s) => s.setPinnedMessages);
  const activeGroup = useChatStore((s) => s.activeGroup);

  const sortMessages = (a, b) => {
    const tA = a.local_timestamp || (a.timestamp * 1000);
    const tB = b.local_timestamp || (b.timestamp * 1000);
    if (tA !== tB) return tA - tB;
    return (a.id || '').localeCompare(b.id || '');
  };

  // CREATE GROUP
  const createGroup = useCallback(async (name, about, isChannel) => {
    const { finalizeEvent } = await import('nostr-tools');
    const pool = await getAuthenticatedPool(identity);
    const groupId = (globalThis.crypto?.randomUUID?.() || Date.now().toString()).replace(/-/g, '').slice(0, 16);

    const createEv = finalizeEvent({
      kind: 9007, created_at: Math.floor(Date.now() / 1000),
      tags: [['h', groupId], ['name', name], ['about', about || ''], ['open'], ['p', identity.pk, 'admin']],
      content: ''
    }, identity.sk);

    const r9007 = await Promise.allSettled(pool.publish(groupRelays, createEv));
    const ok = r9007.some(r => r.status === 'fulfilled');
    if (!ok) throw new Error('No relay accepted 9007');

    const metaTags = [['h', groupId], ['name', name], ['about', about || '']];
    if (isChannel) {
      metaTags.push(['channel', 'true']);
      metaTags.push(['broadcast', 'true']);
    }
    
    const metaEv = finalizeEvent({
      kind: 9002, created_at: Math.floor(Date.now() / 1000),
      tags: metaTags,
      content: ''
    }, identity.sk);
    await Promise.allSettled(pool.publish(groupRelays, metaEv));

    const joinEv = finalizeEvent({
      kind: 9021, created_at: Math.floor(Date.now() / 1000),
      tags: [['h', groupId]], content: 'Creator'
    }, identity.sk);
    await Promise.allSettled(pool.publish(groupRelays, joinEv));

    const newGroup = { id: groupId, name, about: about || '', isChannel, creator: identity.pk, members: [identity.pk] };

    const localGroups = getMyGroups(identity.pk);
    if (!localGroups.find(g => g.id === groupId)) {
      localGroups.push(newGroup);
      setMyGroups(identity.pk, localGroups);
    }
    setGroups(prev => [newGroup, ...(prev || []).filter(g => g.id !== groupId)]);

    return newGroup;
  }, [identity, setGroups]);

  // JOIN GROUP
  const joinGroupById = useCallback(async (groupId, passedName = null) => {
    if (!groupId) return;
    let realName = passedName || 'Unnamed Group';

    const localGroups = getMyGroups(identity.pk);
    const localMatch = localGroups.find(g => g.id === groupId);
    if (!passedName && localMatch?.name && localMatch.name !== 'Unnamed Group') {
      realName = localMatch.name;
    } else if (!passedName) {
      try {
        const pool = await getAuthenticatedPool(identity);
        const events = await queryWithTimeout(pool, groupRelays, { kinds: [9002], limit: 200 }, 3000);
        const match = events.find(ev => ev.tags.find(t => t[0] === 'h')?.[1] === groupId);
        if (match) {
          const nameTag = match.tags.find(t => t[0] === 'name')?.[1];
          if (nameTag) realName = nameTag;
        }
      } catch (e) {}
    }

    if (realName === 'Unnamed Group') {
      const userInput = window.prompt('What is this group called?', '');
      if (userInput && userInput.trim()) realName = userInput.trim();
    }

    const newGroup = { id: groupId, name: realName, isChannel: false, creator: '' };
    const idx = localGroups.findIndex(g => g.id === groupId);
    if (idx === -1) localGroups.push(newGroup);
    else localGroups[idx].name = realName;
    setMyGroups(identity.pk, localGroups);
    setGroups(prev => [newGroup, ...(prev || []).filter(g => g.id !== groupId)]);

    return newGroup;
  }, [identity, setGroups]);

  // LEAVE GROUP
  const leaveGroup = useCallback(async (groupId) => {
    const { finalizeEvent } = await import('nostr-tools');
    const pool = await getAuthenticatedPool(identity);
    const leaveEv = finalizeEvent({
      kind: 9022, created_at: Math.floor(Date.now() / 1000),
      tags: [['h', groupId]], content: ''
    }, identity.sk);
    await Promise.allSettled(pool.publish(groupRelays, leaveEv));

    const localGroups = getMyGroups(identity.pk);
    const updated = localGroups.filter(g => g.id !== groupId);
    setMyGroups(identity.pk, updated);
    setGroups(updated);
  }, [identity, setGroups]);

  // SEND GROUP MESSAGE
  const sendGroupMessage = useCallback(async (groupId, payload, clientId = null, replyId = null) => {
    const { finalizeEvent } = await import('nostr-tools');
    const pool = await getAuthenticatedPool(identity);
    const tags = [['h', groupId]];
    if (clientId) tags.push(['client', clientId]);
    if (replyId) tags.push(['e', replyId, '', 'reply']);

    const event = finalizeEvent({
      kind: 9, created_at: Math.floor(Date.now() / 1000),
      tags, content: JSON.stringify(payload)
    }, identity.sk);

    const results = await Promise.allSettled(pool.publish(groupRelays, event));
    return { success: true, event, results };
  }, [identity]);

  // SEND GROUP TYPING INDICATOR
  const sendGroupTypingIndicator = useCallback(async (groupId) => {
    try {
      const { finalizeEvent } = await import('nostr-tools');
      const pool = await getAuthenticatedPool(identity);
      const ev = finalizeEvent({
        kind: 9, created_at: Math.floor(Date.now() / 1000),
        tags: [['h', groupId]], content: JSON.stringify({ type: 'typing' })
      }, identity.sk);
      pool.publish(groupRelays, ev);
    } catch (e) {}
  }, [identity]);

  // ADMIN ACTIONS
  const kickMember = useCallback(async (groupId, memberPubkey) => {
    const { finalizeEvent } = await import('nostr-tools');
    const pool = await getAuthenticatedPool(identity);
    const ev = finalizeEvent({
      kind: 9001, created_at: Math.floor(Date.now() / 1000),
      tags: [['h', groupId], ['p', memberPubkey]], content: ''
    }, identity.sk);
    await Promise.allSettled(pool.publish(groupRelays, ev));
    setGroupMembers(prev => prev.filter(m => m.pubkey !== memberPubkey));
  }, [identity, setGroupMembers]);

  const promoteMember = useCallback(async (groupId, memberPubkey, isAdmin) => {
    const { finalizeEvent } = await import('nostr-tools');
    const pool = await getAuthenticatedPool(identity);
    const ev = finalizeEvent({
      kind: 9000, created_at: Math.floor(Date.now() / 1000),
      tags: [['h', groupId], ['p', memberPubkey], ['role', isAdmin ? 'member' : 'admin']],
      content: ''
    }, identity.sk);
    await Promise.allSettled(pool.publish(groupRelays, ev));
    setGroupMembers(prev => prev.map(m => m.pubkey === memberPubkey ? { ...m, role: isAdmin ? 'member' : 'admin' } : m));
  }, [identity, setGroupMembers]);

  // FETCH MEMBERS
  const fetchGroupMembers = useCallback(async (groupId) => {
    try {
      const pool = await getAuthenticatedPool(identity);
      const evs = await queryWithTimeout(pool, groupRelays, { kinds: [39002], '#d': [groupId], '#h': [groupId] });
      if (evs.length) {
        const t = evs[0].tags.filter(x => x[0] === 'p');
        const m = t.map(x => ({ pubkey: x[1], role: x[2] || 'member' }));
        if (!m.find(x => x.pubkey === identity.pk)) {
          m.push({ pubkey: identity.pk, role: activeGroup?.creator === identity.pk ? 'admin' : 'member' });
        }
        setGroupMembers(m);
        return m.map(x => x.pubkey);
      }
      return [];
    } catch (err) {
      console.error('[useNIP29Group] fetchGroupMembers failed:', err);
      return [];
    }
  }, [identity, activeGroup, setGroupMembers]);

  // RAW WEBSOCKET SUBSCRIPTION (NIP-42 AUTH + join + subscribe)
  const subscribeToGroups = useCallback((groupIds, since) => {
    if (!groupIds || groupIds.length === 0) return () => {};

    let ws;
    let authSent = false;
    let sentReq = false;
    let isMounted = true;

    const connect = () => {
      ws = new WebSocket('wss://groups.aegispayhq.com');

      ws.onopen = () => console.log('✅ Group WS connected');

      ws.onmessage = async (e) => {
        if (!isMounted) return;
        const msg = JSON.parse(e.data);

        if (msg[0] === 'AUTH') {
          if (authSent) return;
          authSent = true;
          const { finalizeEvent } = await import('nostr-tools');
          const challenge = typeof msg[1] === 'string' ? msg[1] : msg[1].challenge;
          const authEv = finalizeEvent({
            kind: 22242, created_at: Math.floor(Date.now() / 1000),
            tags: [['relay', 'wss://groups.aegispayhq.com'], ['challenge', challenge]],
            content: ''
          }, identity.sk);
          ws.send(JSON.stringify(['AUTH', authEv]));
          console.log('➡️ Group WS sent AUTH');
        }
        else if (msg[0] === 'OK' && msg[2] === true && !sentReq) {
          sentReq = true;
          console.log('✅ Group WS Auth OK');
          const { finalizeEvent } = await import('nostr-tools');

          for (const gid of groupIds) {
            const adminEv = finalizeEvent({
              kind: 9000, created_at: Math.floor(Date.now() / 1000),
              tags: [['h', gid], ['p', identity.pk], ['role', 'admin']], content: ''
            }, identity.sk);
            ws.send(JSON.stringify(['EVENT', adminEv]));
          }

          setTimeout(() => {
            if (!isMounted) return;
            for (const gid of groupIds) {
              const joinEv = finalizeEvent({
                kind: 9021, created_at: Math.floor(Date.now() / 1000),
                tags: [['h', gid]], content: 'Auto-join'
              }, identity.sk);
              ws.send(JSON.stringify(['EVENT', joinEv]));
            }

            setTimeout(() => {
              if (!isMounted) return;
              for (const gid of groupIds) {
                ws.send(JSON.stringify(['REQ', `group-sub-${gid}`, { kinds: [7, 9], '#h': [gid], since }]));
              }
              console.log('✅ Group WS sent individual REQs');
            }, 1500);
          }, 1000);
        }
        else if (msg[0] === 'EVENT' && msg[1].startsWith('group-sub-')) {
          const event = msg[2];
          const hTag = event.tags.find(t => t[0] === 'h');
          if (!hTag) return;
          const groupId = hTag[1];

          // Handle Reaction Events
          if (event.kind === 7) {
            const targetId = event.tags.find(t => t[0] === 'e')?.[1];
            if (targetId) {
              useChatStore.getState().setReactions(prev => {
                const existing = prev[targetId] || [];
                if (existing.find(r => r.pubkey === event.pubkey && r.emoji === event.content)) return prev;
                return { ...prev, [targetId]: [...existing, { emoji: event.content, pubkey: event.pubkey }] };
              });
            }
            return;
          }

          let parsed = {};
          try { parsed = JSON.parse(event.content); } catch (e) {}
          if (parsed.type === 'typing') {
            const age = (Date.now() / 1000) - event.created_at;
            if (age < 10 && event.pubkey !== identity.pk) {
              setGroupTypingUsers(prev => ({ ...prev, [event.pubkey]: Date.now() }));
            }
            return;
          }

          const replyTag = event.tags.find(t => t[0] === 'e' && t[3] === 'reply');
          const clientId = event.tags.find(t => t[0] === 'client')?.[1];

          setGroupMessages(prev => {
            const groupMsgs = prev[groupId] || [];
            const existingIndex = groupMsgs.findIndex(m => {
              if (clientId && m.clientId === clientId) return true;
              if (m.isSender === (event.pubkey === identity.pk) && parsed.message) {
                let oldData = {};
                try { oldData = JSON.parse(m.rawContent || '{}'); } catch(e) {}
                return oldData.message === parsed.message && Math.abs(m.timestamp - event.created_at) < 5;
              }
              return false;
            });

            if (existingIndex >= 0) {
              const newMsgs = [...groupMsgs];
              newMsgs[existingIndex] = { ...newMsgs[existingIndex], id: event.id, clientId };
              saveMessage(groupId, newMsgs[existingIndex]);
              return { ...prev, [groupId]: newMsgs };
            } else {
              const newMsg = {
                id: event.id, clientId, isSender: event.pubkey === identity.pk,
                pubkey: event.pubkey, timestamp: event.created_at,
                local_timestamp: Date.now(), rawContent: event.content,
                replyTo: replyTag ? replyTag[1] : null, isGroup: true
              };
              saveMessage(groupId, newMsg);
              return { ...prev, [groupId]: [...groupMsgs, newMsg].sort(sortMessages) };
            }
          });
        }
        else if (msg[0] === 'CLOSED') {
          console.log('❌ Group WS closed:', msg[2]);
        }
      };

      ws.onclose = (e) => {
        console.log('❌ Group WS closed:', e.reason);
        if (isMounted) setTimeout(connect, 3000);
      };

      ws.onerror = (e) => console.error('Group WS error:', e);
    };

    connect();

    return () => {
      isMounted = false;
      if (ws) ws.close();
    };
  }, [identity, setGroupMessages, setGroupTypingUsers]);

  const pinMessage = useCallback(async (groupId, messageEventId) => {
    const { finalizeEvent } = await import('nostr-tools');
    const pool = await getAuthenticatedPool(identity);
    const ev = finalizeEvent({
      kind: 9005,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['h', groupId], ['e', messageEventId]],
      content: ''
    }, identity.sk);
    await Promise.allSettled(pool.publish(groupRelays, ev));
    setPinnedMessages(prev => ({ ...prev, [groupId]: messageEventId }));
    return { success: true };
  }, [identity, setPinnedMessages]);

  const unpinMessage = useCallback(async (groupId) => {
    const { finalizeEvent } = await import('nostr-tools');
    const pool = await getAuthenticatedPool(identity);
    const ev = finalizeEvent({
      kind: 9005,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['h', groupId]],
      content: 'unpin'
    }, identity.sk);
    await Promise.allSettled(pool.publish(groupRelays, ev));
    setPinnedMessages(prev => ({ ...prev, [groupId]: null }));
    return { success: true };
  }, [identity, setPinnedMessages]);

  const fetchPinnedMessage = useCallback(async (groupId) => {
    try {
      const pool = await getAuthenticatedPool(identity);
      const events = await queryWithTimeout(pool, groupRelays, { kinds: [9005], '#h': [groupId], limit: 10 }, 3000);
      if (events.length === 0) {
        setPinnedMessages(prev => ({ ...prev, [groupId]: null }));
        return null;
      }
      events.sort((a, b) => b.created_at - a.created_at);
      const eTag = events[0].tags.find(t => t[0] === 'e')?.[1];
      setPinnedMessages(prev => ({ ...prev, [groupId]: eTag || null }));
      return eTag || null;
    } catch (e) {
      return null;
    }
  }, [identity, setPinnedMessages]);

  return {
    createGroup,
    joinGroupById,
    leaveGroup,
    sendGroupMessage,
    sendGroupTypingIndicator,
    kickMember,
    promoteMember,
    fetchGroupMembers,
    subscribeToGroups,
    pinMessage,
    unpinMessage,
    fetchPinnedMessage,
  };
}
