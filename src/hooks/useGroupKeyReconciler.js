import { useEffect } from 'react';
import { getCurrentGroupKey, getAllGroupKeys, getGrantedEpochsFor, putGroupKey } from '../lib/crypto/groupKeyStore';
import { distributeGroupKey } from '../lib/crypto/groupKeyDistribution';
import { generateGroupKey } from '../lib/crypto/groupCipher';
import { getAuthenticatedPool } from '../lib/pool';
import { generalRelays } from '../lib/relays';
import { db, currentOwner } from '../db';
const lastRunByGroup = new Map();
export function useGroupKeyReconciler({ groupId, members, isOwner, identity }) {
  useEffect(() => {
    if (!groupId || !identity?.sk || !identity?.pk) return;
    if (!Array.isArray(members)) return;
    if (members.length === 0 && !isOwner) return;
    if (!currentOwner()) return;
    const sig = members.slice().sort().join(',') + '|' + (isOwner ? '1' : '0');
    if (lastRunByGroup.get(groupId) === sig) return;
    lastRunByGroup.set(groupId, sig);
    reconcile({ groupId, members, isOwner, identity }).catch(err => { console.warn('[group-key] reconcile deferred', err); lastRunByGroup.delete(groupId); });
  }, [groupId, members, isOwner, identity?.pk, identity?.sk]);
}
async function reconcile({ groupId, members, isOwner, identity }) {
  const pool = await getAuthenticatedPool(identity);
  const publish = async (ev) => {
    const results = await Promise.allSettled(pool.publish(generalRelays, ev));
    if (!results.some(r => r.status === 'fulfilled')) throw new Error('all relays rejected');
  };
  let current = await getCurrentGroupKey(groupId);
  if (!current && isOwner) {
    const key = generateGroupKey();
    await putGroupKey(groupId, 1, key);
    current = { epoch: 1, bytes: key };
    await distributeGroupKey({ senderPrivkey: identity.sk, senderPubkey: identity.pk, groupId, epoch: 1, keyBytes: key, recipients: dedupe([...members, identity.pk]), publish });
    return;
  }
  if (!current) return;
  if (isOwner) {
    const prev = await safeGetSnapshot(groupId);
    const prevSet = new Set(prev || []);
    const removed = [...prevSet].filter(pk => !members.includes(pk));
    if (removed.length > 0) {
      const nextEpoch = current.epoch + 1;
      const newKey = generateGroupKey();
      await putGroupKey(groupId, nextEpoch, newKey);
      const priorEpochs = (await getAllGroupKeys(groupId)).filter(e => e.epoch !== nextEpoch);
      await distributeGroupKey({ senderPrivkey: identity.sk, senderPubkey: identity.pk, groupId, epoch: nextEpoch, keyBytes: newKey, recipients: dedupe([...members, identity.pk]), extraEpochs: priorEpochs, publish });
      await safePutSnapshot(groupId, members);
      return;
    }
    await safePutSnapshot(groupId, members);
  }
  const allEpochs = await getAllGroupKeys(groupId);
  const recipients = [];
  for (const pk of members) { const granted = await getGrantedEpochsFor(groupId, pk); if (!granted.has(current.epoch)) recipients.push(pk); }
  if (!recipients.length) return;
  await distributeGroupKey({ senderPrivkey: identity.sk, senderPubkey: identity.pk, groupId, epoch: current.epoch, keyBytes: current.bytes, recipients: dedupe(recipients), extraEpochs: allEpochs.filter(e => e.epoch !== current.epoch), publish });
}
async function safeGetSnapshot(groupId) { try { const row = await db.groupMemberSigs.get(groupId); return row?.members || null; } catch { return null; } }
async function safePutSnapshot(groupId, members) {
  try { await db.groupMemberSigs.put({ groupId, signature: members.slice().sort().join(','), members: members.slice(), updatedAt: Math.floor(Date.now() / 1000) }); } catch {}
}
function dedupe(arr) { return Array.from(new Set(arr.filter(Boolean))); }
