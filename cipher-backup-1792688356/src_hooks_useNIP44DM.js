import { useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { getAuthenticatedPool } from '../lib/pool';
import { generalRelays, queryWithTimeout } from '../lib/relays';
import { saveMessage } from '../db';

export function useNIP44DM({ identity }) {
  const setDms = useChatStore((s) => s.setDms);
  const setTypingUsers = useChatStore((s) => s.setTypingUsers);

  const sortMessages = (a, b) => {
    const tA = a.local_timestamp || (a.timestamp * 1000);
    const tB = b.local_timestamp || (b.timestamp * 1000);
    if (tA !== tB) return tA - tB;
    return (a.id || '').localeCompare(b.id || '');
  };

  // SEND A DM
  const sendDM = useCallback(async (recipientPubkey, payload, clientId = null, replyId = null) => {
    if (!recipientPubkey || !identity?.sk) return { success: false, error: 'Missing params' };

    // Defensive: trim and cap length
    let targetDm = recipientPubkey.trim();
    if (targetDm.length > 64) targetDm = targetDm.slice(0, 64);

    try {
      const { finalizeEvent, nip44 } = await import('nostr-tools');
      const pool = await getAuthenticatedPool(identity);
      const shared = nip44.v2.utils.getConversationKey(identity.sk, targetDm);
      const encrypted = nip44.v2.encrypt(JSON.stringify(payload), shared);
      const tags = [['p', targetDm]];
      if (clientId) tags.push(['client', clientId]);
      if (replyId) tags.push(['e', replyId, '', 'reply']);
      const event = finalizeEvent({
        kind: 4,
        created_at: Math.floor(Date.now() / 1000),
        tags,
        content: encrypted
      }, identity.sk);
      const results = await Promise.allSettled(pool.publish(generalRelays, event));
      return { success: true, event, results };
    } catch (err) {
      console.error('[useNIP44DM] Send failed:', err);
      return { success: false, error: err.message };
    }
  }, [identity]);

  // SEND TYPING INDICATOR
  const sendTypingIndicator = useCallback(async (recipientPubkey) => {
    if (!recipientPubkey || !identity?.sk) return;
    try {
      const { finalizeEvent, nip44 } = await import('nostr-tools');
      const pool = await getAuthenticatedPool(identity);
      const shared = nip44.v2.utils.getConversationKey(identity.sk, recipientPubkey);
      const encrypted = nip44.v2.encrypt(JSON.stringify({ type: 'typing' }), shared);
      const ev = finalizeEvent({
        kind: 4,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['p', recipientPubkey]],
        content: encrypted
      }, identity.sk);
      pool.publish(generalRelays, ev);
    } catch (e) {}
  }, [identity]);

  // SUBSCRIBE TO INCOMING + OUTGOING DMs
  const subscribeToDMs = useCallback((since) => {
    let subs = [];
    const mounted = { current: true };

    const setup = async () => {
      const pool = await getAuthenticatedPool(identity);
      const dmFilters = [
        { kinds: [4], '#p': [identity.pk], since },
        { kinds: [4], authors: [identity.pk], since }
      ];
      dmFilters.forEach(filter => {
        const sub = pool.subscribe(generalRelays, filter, {
          onevent: async (event) => {
            if (!mounted.current) return;
            try {
              const { nip44 } = await import('nostr-tools');
              const isSender = event.pubkey === identity.pk;
              const counterparty = isSender ? event.tags.find(t => t[0] === 'p')?.[1] : event.pubkey;
              if (!counterparty) return;
              const shared = nip44.v2.utils.getConversationKey(identity.sk, counterparty);
              let text;
              try { text = nip44.v2.decrypt(event.content, shared); }
              catch (e) { return; }
              let data = {};
              try { data = JSON.parse(text); } catch (e) { data = { type: 'text', message: text }; }

              if (data.type === 'typing') {
                const age = (Date.now() / 1000) - event.created_at;
                if (age < 10) setTypingUsers(prev => ({ ...prev, [counterparty]: Date.now() }));
                return;
              }
              if (data.type === 'read' || data.type === 'pin') return;

              const replyTag = event.tags.find(t => t[0] === 'e' && t[3] === 'reply');
              const clientId = event.tags.find(t => t[0] === 'client')?.[1];
              const newMsg = {
                id: event.id, clientId, isSender,
                timestamp: event.created_at, data,
                pubkey: event.pubkey,
                replyTo: replyTag ? replyTag[1] : null
              };
              await saveMessage(counterparty, newMsg);
              setDms(prev => {
                const chatMsgs = prev[counterparty] || [];
                if (chatMsgs.find(m => m.id === event.id)) return prev;
                const filtered = chatMsgs.filter(m => m.clientId !== clientId);
                return { ...prev, [counterparty]: [...filtered, newMsg].sort(sortMessages) };
              });
            } catch (e) { console.error('Live DM error:', e); }
          }
        });
        subs.push(sub);
      });
    };
    setup();
    return () => {
      mounted.current = false;
      subs.forEach(s => { try { s.close(); } catch (e) {} });
    };
  }, [identity, setDms, setTypingUsers]);

  // FULL FETCH OF DM HISTORY
  const fetchDMs = useCallback(async () => {
    const pool = await getAuthenticatedPool(identity);
    const { nip44 } = await import('nostr-tools');
    const [sentDms, recvDms] = await Promise.all([
      queryWithTimeout(pool, generalRelays, { kinds: [4], authors: [identity.pk], limit: 50 }),
      queryWithTimeout(pool, generalRelays, { kinds: [4], '#p': [identity.pk], limit: 50 })
    ]);
    const allDms = Array.from(new Map([...sentDms, ...recvDms].map(ev => [ev.id, ev])).values());
    for (const ev of allDms) {
      try {
        const isSender = ev.pubkey === identity.pk;
        const counterparty = isSender ? ev.tags.find(t => t[0] === 'p')?.[1] : ev.pubkey;
        if (!counterparty) continue;
        const shared = nip44.v2.utils.getConversationKey(identity.sk, counterparty);
        let text;
        try { text = nip44.v2.decrypt(ev.content, shared); }
        catch (e) { continue; }
        let data = {};
        try { data = JSON.parse(text); } catch (e) { data = { type: 'text', message: text }; }
        if (data.type === 'typing' || data.type === 'read' || data.type === 'pin') continue;
        const replyTag = ev.tags.find(t => t[0] === 'e' && t[3] === 'reply');
        const clientId = ev.tags.find(t => t[0] === 'client')?.[1];
        await saveMessage(counterparty, {
          id: ev.id, clientId, isSender,
          timestamp: ev.created_at, data,
          pubkey: ev.pubkey,
          replyTo: replyTag ? replyTag[1] : null,
          isGroup: false
        });
      } catch (e) {}
    }
    const counterparties = new Set();
    for (const ev of allDms) {
      const isSender = ev.pubkey === identity.pk;
      const counterparty = isSender ? ev.tags.find(t => t[0] === 'p')?.[1] : ev.pubkey;
      if (counterparty) counterparties.add(counterparty);
    }
    return [...counterparties];
  }, [identity]);

  return { sendDM, sendTypingIndicator, subscribeToDMs, fetchDMs };
}
