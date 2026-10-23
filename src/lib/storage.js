// Per-account scoped localStorage. Fixes cross-account leakage (audit H3).
// All get/set/remove calls are prefixed with the active pubkey.

export function getActivePubkey() {
  return (
    localStorage.getItem('cipher_active_pubkey') ||
    localStorage.getItem('cipher_db_owner') ||
    'guest'
  );
}

export function scopeKey(key) {
  const pk = getActivePubkey();
  return `cipher_${pk.slice(0, 8)}_${key}`;
}

export function scopedGet(key, defaultValue = null) {
  try {
    const v = localStorage.getItem(scopeKey(key));
    return v !== null ? JSON.parse(v) : defaultValue;
  } catch { return defaultValue; }
}

export function scopedSet(key, value) {
  try { localStorage.setItem(scopeKey(key), JSON.stringify(value)); } catch {}
}

export function scopedRemove(key) {
  try { localStorage.removeItem(scopeKey(key)); } catch {}
}

// One-time migration from global keys -> scoped keys.
// Runs after login (pubkey known). Idempotent.
export function migrateGlobalKeys() {
  const pk = getActivePubkey();
  if (!pk || pk === 'guest') return;

  const marker = `cipher_migrated_v1_${pk.slice(0, 8)}`;
  if (localStorage.getItem(marker)) return;

  const keys = [
    'pinned', 'archived', 'muted', 'muted_until',
    'blocked', 'bookmarks', 'msg_edits', 'join_requests',
    'accepted_reqs', 'is_vendor', 'my_products', 'cached_products',
    'btc_address', 'xmr_address', 'my_username', 'rep_profile_cache',
  ];

  for (const k of keys) {
    const g = `cipher_${k}`;
    const val = localStorage.getItem(g);
    if (val !== null) {
      const scoped = `cipher_${pk.slice(0, 8)}_${k}`;
      if (!localStorage.getItem(scoped)) {
        localStorage.setItem(scoped, val);
      }
      localStorage.removeItem(g);
    }
  }

  // Migrate drafts
  const toMove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith('draft-dm-') || k.startsWith('draft-group-'))) {
      toMove.push(k);
    }
  }
  for (const k of toMove) {
    const val = localStorage.getItem(k);
    const scoped = `cipher_${pk.slice(0, 8)}_${k}`;
    if (val !== null && !localStorage.getItem(scoped)) {
      localStorage.setItem(scoped, val);
    }
    localStorage.removeItem(k);
  }

  localStorage.setItem(marker, '1');
  console.log('[storage] migrated global keys for', pk.slice(0, 8));
}
