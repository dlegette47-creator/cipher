import { useEffect } from 'react';
import { getAuthenticatedPool } from '../lib/pool';
import { generalRelays } from '../lib/relays';
import { fromHex } from '../lib/crypto/groupCipher';
import { hasGroupKey, putGroupKey } from '../lib/crypto/groupKeyStore';
export function useGroupKeyMember({ identity }) {
  useEffect(() => {
    if (!identity?.sk || !identity?.pk) return;
    let sub = null; let mounted = true;
    (async () => {
      const pool = await getAuthenticatedPool(identity);
      sub = pool.subscribe(generalRelays, { kinds: [4], '#p': [identity.pk] }, {
        onevent: async (event) => {
          if (!mounted) return;
          try {
            const { nip44 } = await import('nostr-tools');
            const shared = nip44.v2.utils.getConversationKey(identity.sk, event.pubkey);
            const plaintext = nip44.v2.decrypt(event.content, shared);
            const payload = JSON.parse(plaintext);
            if (payload?.t !== 'gkey' || !Array.isArray(payload.keys)) return;
            const { gid } = payload;
            let changed = false;
            for (const item of payload.keys) {
              if (await hasGroupKey(gid, item.ep)) continue;
              await putGroupKey(gid, item.ep, fromHex(item.k), { source: 'dm', from: event.pubkey });
              changed = true;
            }
            if (changed) window.dispatchEvent(new CustomEvent('cipher:group-key-updated', { detail: { groupId: gid } }));
          } catch {}
        },
      });
    })();
    return () => { mounted = false; if (sub) try { sub.close(); } catch {} };
  }, [identity?.pk, identity?.sk]);
}
