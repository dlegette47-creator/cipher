import React, { useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import { scopedGet, scopedSet } from '../../lib/storage';
import { getAuthenticatedPool } from '../../lib/pool';
import { generalRelays, groupRelays } from '../../lib/relays';

export default function MyProfileModal({ identity }) {
  const showMyProfile = useChatStore((s) => s.showMyProfile);
  const setShowMyProfile = useChatStore((s) => s.setShowMyProfile);
  const myName = useChatStore((s) => s.myName);
  const setMyName = useChatStore((s) => s.setMyName);
  const myUsername = useChatStore((s) => s.myUsername);
  const setMyUsername = useChatStore((s) => s.setMyUsername);
  const myAbout = useChatStore((s) => s.myAbout);
  const setMyAbout = useChatStore((s) => s.setMyAbout);
  const setProfiles = useChatStore((s) => s.setProfiles);
  const setToast = useChatStore((s) => s.setToast);

  const [lockedUsername, setLockedUsername] = useState(
    () => scopedGet('my_username', '')
  );
  const [saving, setSaving] = useState(false);

  if (!showMyProfile) return null;

  const handleSave = async () => {
    try {
      setSaving(true);
      const { finalizeEvent } = await import('nostr-tools');
      const pool = await getAuthenticatedPool(identity);

      // Publish Kind 0
      const profileEv = finalizeEvent({
        kind: 0,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: JSON.stringify({
          name: myName,
          display_name: myName,
          about: myAbout,
          nip05: lockedUsername || myUsername
        })
      }, identity.sk);
      await Promise.allSettled(pool.publish(generalRelays, profileEv));

      // Publish Kind 10003 only if not locked yet
      if (!lockedUsername && myUsername) {
        const usernameEv = finalizeEvent({
          kind: 10003,
          created_at: Math.floor(Date.now() / 1000),
          tags: [
            ['d', 'username'],
            ['t', 'cipher_username_' + myUsername],
            ['t', 'cipher_username'],
            ['username', myUsername]
          ],
          content: ''
        }, identity.sk);
        const allPublishRelays = [...new Set([...generalRelays, ...groupRelays, 'wss://nos.lol', 'wss://relay.damus.io'])];
        await Promise.allSettled(pool.publish(allPublishRelays, usernameEv));
        scopedSet('my_username', myUsername);
        setLockedUsername(myUsername);
      }

      setProfiles((prev) => ({
        ...prev,
        [identity.pk]: {
          pubkey: identity.pk,
          name: myName,
          displayName: myName,
          about: myAbout,
          username: lockedUsername || myUsername
        }
      }));
      setToast({ type: 'success', message: 'Profile updated!' });
      setShowMyProfile(false);
    } catch (e) {
      console.error(e);
      setToast({ type: 'error', message: 'Error: ' + e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111]/80 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-gray-300 dark:border-gray-800 rounded-2xl w-full max-w-sm p-6 relative">
        <button onClick={() => setShowMyProfile(false)} className="absolute top-4 right-4 text-white/50 hover:text-white">✕</button>
        <h2 className="text-xl font-bold mb-4">Your Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">Display Name</label>
            <input type="text" value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="Your name" className="w-full bg-[#111] border border-gray-300 dark:border-gray-800 rounded-lg p-3 text-white" />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">Username (@handle)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">@</span>
              <input
                type="text"
                value={lockedUsername || myUsername}
                onChange={(e) => setMyUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                placeholder="alice"
                disabled={!!lockedUsername}
                className={`w-full bg-[#111] border border-gray-300 dark:border-gray-800 rounded-lg p-3 pl-8 text-white ${lockedUsername ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              {lockedUsername && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-xs flex items-center gap-1">🔒 Locked</span>
              )}
            </div>
            <p className="text-[10px] text-white/40 mt-1">
              {lockedUsername ? 'Usernames cannot be changed after they are set.' : 'Pick carefully! You can only set this once.'}
            </p>
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">Bio</label>
            <input type="text" value={myAbout} onChange={(e) => setMyAbout(e.target.value)} placeholder="Tell us about yourself" className="w-full bg-[#111] border border-gray-300 dark:border-gray-800 rounded-lg p-3 text-white" />
          </div>
          <button type="button" onClick={handleSave} disabled={saving} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg mt-2 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}
