import { useState, useEffect } from 'react'
import { registerPasskeyIdentity, unlockPasskeyIdentity, isPRFSupported } from 'nostr-passkey'
import * as bip39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39'

// Derive 32-byte secret key from BIP39 mnemonic
export function deriveSkFromMnemonic(mnemonic) {
  const seed = mnemonicToSeedSync(mnemonic);
  return new Uint8Array(seed.slice(0, 32));
}

async function encryptWithSk(sk, plaintext) {
  const key = await crypto.subtle.importKey('raw', sk, { name: 'AES-GCM' }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));
  return { iv: Array.from(iv), ct: Array.from(new Uint8Array(ct)) };
}

async function decryptWithSk(sk, encrypted) {
  const key = await crypto.subtle.importKey('raw', sk, { name: 'AES-GCM' }, false, ['decrypt']);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(encrypted.iv) }, key, new Uint8Array(encrypted.ct)
  );
  return new TextDecoder().decode(pt);
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function getKey(secret) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "PBKDF2" }, false, ["deriveKey"]
  )
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("cipher_secure_salt"), iterations: 100000, hash: "SHA-256" },
    keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
  )
}

export async function encryptKey(skArray, secret) {
  const key = await getKey(secret)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(skArray))
  )
  return { iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) }
}

export async function decryptKey(encryptedObj, secret) {
  const key = await getKey(secret)
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(encryptedObj.iv) }, key, new Uint8Array(encryptedObj.data)
  )
  const dec = new TextDecoder()
  return JSON.parse(dec.decode(decrypted))
}

const getVaults = () => {
  try {
    return JSON.parse(localStorage.getItem('cipher_vaults') || '{}');
  } catch { return {}; }
};

const saveVaults = (vaults) => {
  localStorage.setItem('cipher_vaults', JSON.stringify(vaults));
};

const getActivePubkey = () => localStorage.getItem('cipher_active_pubkey');

const setActivePubkey = (pk) => localStorage.setItem('cipher_active_pubkey', pk);

export function useIdentity() {
  const [keys, setKeys] = useState({ sk: null, pk: null, npub: null })
  const [hasVault, setHasVault] = useState(false)
  const [hasBiometric, setHasBiometric] = useState(false)
  const [loadingSession, setLoadingSession] = useState(true)

  useEffect(() => {
    const init = async () => {
      const sessionSk = sessionStorage.getItem('cipher_session_sk')
      if (sessionSk) {
        try {
          const { getPublicKey, nip19 } = await import('nostr-tools')
          const sk = Uint8Array.from(JSON.parse(sessionSk))
          const pk = getPublicKey(sk)
          setKeys({ sk, pk, npub: nip19.npubEncode(pk) })
          setHasVault(true)
          setLoadingSession(false)
          return
        } catch (e) { sessionStorage.removeItem('cipher_session_sk') }
      }

      const vault = localStorage.getItem('cipher_vault')
      if (vault) setHasVault(true)

      const bioEnabled = localStorage.getItem('cipher_biometric_enabled')
      if (bioEnabled === 'true') {
        const supported = await isPRFSupported()
        if (supported) setHasBiometric(true)
      }
      
      setLoadingSession(false)
    }
    init()
  }, [])

  const createVault = async (handle, pin) => {
    const { getPublicKey, nip19 } = await import('nostr-tools')
    const mnemonic = generateMnemonic(wordlist, 128)
    const sk = deriveSkFromMnemonic(mnemonic)
    const pk = getPublicKey(sk)
    
    // Use the handle (lowercased) as the lookup ID for restoring
    const lookupId = await sha256(handle.toLowerCase().trim())

    // Encrypt with PIN locally
    const encryptedLocal = await encryptKey(Array.from(sk), pin)
    
    // Multi-account support: store vaults by pubkey
    const vaults = getVaults();
    vaults[pk] = { 
      vault: encryptedLocal, 
      handle: handle.toLowerCase().trim(),
      displayName: handle,
      createdAt: Date.now(),
      mnemonicEnc: await encryptWithSk(sk, mnemonic)
    };
    saveVaults(vaults);
    localStorage.setItem('cipher_active_pubkey', pk);
    
    // Legacy fallback (for backwards compat)
    localStorage.setItem('cipher_vault', JSON.stringify(encryptedLocal))
    localStorage.setItem('cipher_handle', handle.toLowerCase().trim())
    localStorage.setItem('cipher_fails', '0')

    // (relay backup removed for security — recovery is phrase-only)


    return { sk, pk, npub: nip19.npubEncode(pk), handle, mnemonic }
  }

  // UPDATED: Accepts a full profile object
  const finalizeLogin = async (sk, pk, npub, profile) => {
    try {
      const { SimplePool, finalizeEvent } = await import('nostr-tools')
      const pool = new SimplePool()
      const relays = ['wss://nos.lol', 'wss://relay.primal.net', 'wss://relay.damus.io', 'wss://relay.nostr.band']

      const profileData = {
        name: profile.username, // @handle (e.g. "alice")
        display_name: profile.displayName || profile.username, // "Alice's Shop"
        about: 'New to Cipher.',
        picture: profile.picture || null
      }

      const ev = finalizeEvent({
        kind: 0, created_at: Math.floor(Date.now() / 1000), tags: [],
        content: JSON.stringify(profileData)
      }, sk)

      // Also publish kind:10003 username registry (critical for search)
      const username = profile?.username;
      let usernameEv = null;
      if (username) {
        usernameEv = finalizeEvent({
          kind: 10003,
          created_at: Math.floor(Date.now() / 1000),
          tags: [
            ['d', 'username'],
            ['t', 'cipher_username_' + username],
            ['t', 'cipher_username'],
            ['username', username]
          ],
          content: ''
        }, sk)
      }

      const timeout = new Promise((resolve) => setTimeout(resolve, 3000))
      const promises = [Promise.allSettled(pool.publish(relays, ev))]
      if (usernameEv) promises.push(Promise.allSettled(pool.publish(relays, usernameEv)))
      await Promise.race([Promise.all(promises), timeout])
    } catch (e) { console.error("Failed to publish initial profile", e) }

    try {
      const { saveProfile } = await import('./db')
      await saveProfile({
        pubkey: pk,
        name: profile?.username || 'user',
        displayName: profile?.displayName || profile?.username || 'User',
        picture: profile?.picture || null,
        about: 'New to Cipher.'
      })
    } catch (e) { console.error('Profile seed failed:', e) }

    sessionStorage.setItem('cipher_session_sk', JSON.stringify(Array.from(sk)))
    setKeys({ sk, pk, npub })
    setHasVault(true)
  }

  const unlock = async (pin) => {
    try {
      // Multi-account: use the active account's vault
      const activePk = getActivePubkey();
      const vaults = getVaults();
      let vault;
      
      if (activePk && vaults[activePk]) {
        vault = vaults[activePk].vault;
      } else {
        // Fallback to legacy single vault
        const vaultStr = localStorage.getItem('cipher_vault');
        if (!vaultStr) throw new Error("No local vault found");
        vault = JSON.parse(vaultStr);
      }
      
      const skArray = await decryptKey(vault, pin)
      
      const { getPublicKey, nip19 } = await import('nostr-tools')
      const sk = Uint8Array.from(skArray)
      const pk = getPublicKey(sk)
      
      sessionStorage.setItem('cipher_session_sk', JSON.stringify(Array.from(sk)))
      localStorage.setItem('cipher_fails', '0')
      setKeys({ sk, pk, npub: nip19.npubEncode(pk) })
      return { success: true }
    } catch (e) {
      const fails = parseInt(localStorage.getItem('cipher_fails') || '0') + 1
      localStorage.setItem('cipher_fails', fails.toString())
      if (fails >= 5) {
        // Only wipe THIS account's vault — other accounts stay intact
        const activePk = getActivePubkey();
        if (activePk) {
          try {
            const vaults = getVaults();
            delete vaults[activePk];
            saveVaults(vaults);
            // Also clear the legacy single-vault if it belongs to this account
            const legacyVault = localStorage.getItem('cipher_vault');
            if (legacyVault) localStorage.removeItem('cipher_vault');
            // Clear active pointer so next open shows create/restore
            localStorage.removeItem('cipher_active_pubkey');
          } catch (e) {}
        }
        sessionStorage.removeItem('cipher_session_sk');
        window.location.reload();
      }
      return { success: false, remaining: 5 - fails }
    }
  }

  const unlockWithBiometric = async () => {
    try {
      const { secretKey, pubkey } = await unlockPasskeyIdentity()
      const { nip19 } = await import('nostr-tools')
      const sk = Uint8Array.from(secretKey)
      sessionStorage.setItem('cipher_session_sk', JSON.stringify(Array.from(sk)))
      setKeys({ sk, pk: pubkey, npub: nip19.npubEncode(pubkey) })
      return { success: true }
    } catch (e) { return { success: false, error: e.message } }
  }

  const restoreFromRelays = async (handle, pin) => {
    const vaults = getVaults();
    let targetPk = null;
    let targetVault = null;

    // 1. Search in multi-account vaults
    for (const [pk, data] of Object.entries(vaults)) {
      if (data.handle === handle) {
        targetPk = pk;
        targetVault = data.vault;
        break;
      }
    }

    // 2. Fallback to legacy single vault
    if (!targetPk) {
      const legacyVaultStr = localStorage.getItem('cipher_vault');
      const legacyHandle = localStorage.getItem('cipher_handle');
      if (legacyVaultStr && legacyHandle === handle) {
        targetVault = JSON.parse(legacyVaultStr);
      }
    }

    if (!targetVault) {
      return { success: false, error: 'Account not found on this device. Use your 12-word recovery phrase if you are on a new device.' };
    }

    try {
      const skArray = await decryptKey(targetVault, pin);
      const { getPublicKey, nip19 } = await import('nostr-tools');
      const sk = Uint8Array.from(skArray);
      const pk = getPublicKey(sk);

      if (targetPk && pk !== targetPk) throw new Error('Invalid PIN');

      // Update multi-account store just in case it was legacy
      const newVaults = getVaults();
      newVaults[pk] = {
        vault: targetVault,
        handle: handle,
        displayName: newVaults[pk]?.displayName || handle,
        createdAt: newVaults[pk]?.createdAt || Date.now()
      };
      saveVaults(newVaults);

      setActivePubkey(pk);
      sessionStorage.setItem('cipher_session_sk', JSON.stringify(Array.from(sk)));
      localStorage.setItem('cipher_vault', JSON.stringify(targetVault));
      localStorage.setItem('cipher_handle', handle);
      
      setKeys({ sk, pk, npub: nip19.npubEncode(pk) });
      setHasVault(true);
      return { success: true };
    } catch (e) {
      return { success: false, error: 'Invalid PIN' };
    }
  }


  const restoreFromMnemonic = async (mnemonicInput, newPin) => {
    try {
      const normalizedMnemonic = mnemonicInput.trim().toLowerCase().replace(/\s+/g, ' ')
      if (!bip39.validateMnemonic(normalizedMnemonic, wordlist)) {
        throw new Error('Invalid recovery phrase')
      }
      const sk = deriveSkFromMnemonic(normalizedMnemonic)
      const { getPublicKey, nip19 } = await import('nostr-tools')
      const pk = getPublicKey(sk)
      const newLocalVault = await encryptKey(Array.from(sk), newPin)
      const vaults = getVaults()
      vaults[pk] = {
        vault: newLocalVault,
        handle: '',
        displayName: 'Restored',
        createdAt: Date.now(),
        mnemonicEnc: await encryptWithSk(sk, normalizedMnemonic)
      }
      saveVaults(vaults)
      setActivePubkey(pk)
      localStorage.setItem('cipher_vault', JSON.stringify(newLocalVault))
      localStorage.setItem('cipher_fails', '0')
      sessionStorage.setItem('cipher_session_sk', JSON.stringify(Array.from(sk)))
      setKeys({ sk, pk, npub: nip19.npubEncode(pk) })
      setHasVault(true)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }

  const getMnemonic = async () => {
    if (!keys.sk || !keys.pk) return null
    const vaults = getVaults()
    const vault = vaults[keys.pk]
    if (!vault?.mnemonicEnc) return null
    try { return await decryptWithSk(keys.sk, vault.mnemonicEnc) } catch (e) { return null }
  };

  const lockApp = async () => {
    sessionStorage.removeItem('cipher_session_sk')
    setKeys({ sk: null, pk: null, npub: null })
    
    // 1. Wipe sensitive chat data from memory
    try {
      const { useChatStore } = await import('./store/chatStore');
      useChatStore.setState({ 
        dms: {}, groups: [], groupMessages: {}, profiles: {}, 
        unreadCounts: {}, reactions: {}, activeDm: null, activeGroup: null, view: 'list' 
      });
    } catch(e) {}

    // 2. Close the Dexie DB connection
    try {
      const { closeDB } = await import('./db');
      closeDB();
    } catch(e) {}
  }

  const panicWipe = async () => {
    try {
      // 1. Delete ALL IndexedDB databases (messages, keys, addresses)
      if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
        const dbs = await indexedDB.databases();
        await Promise.allSettled(dbs.map(d => {
          if (d.name) return indexedDB.deleteDatabase(d.name);
        }));
      }
      // 2. Unregister service workers (PWA cache)
      if ('serviceWorker' in navigator) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.allSettled(regs.map(r => r.unregister()));
        } catch (e) {}
      }
      // 3. Clear caches API
      if ('caches' in window) {
        try {
          const keys = await caches.keys();
          await Promise.allSettled(keys.map(k => caches.delete(k)));
        } catch (e) {}
      }
      // 4. Clear storage
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error('[panicWipe]', e);
    } finally {
      window.location.reload();
    }
  }

  const getAccounts = () => {
    const vaults = getVaults();
    const activePk = getActivePubkey() || keys.pk;
    const result = Object.entries(vaults).map(([pk, data]) => ({
      pubkey: pk,
      handle: data.handle,
      displayName: data.displayName,
      isActive: pk === activePk,
      createdAt: data.createdAt
    }));

    // Legacy fallback: user created before multi-account support
    if (result.length === 0 && keys.pk) {
      result.push({
        pubkey: keys.pk,
        handle: localStorage.getItem('cipher_handle') || 'account',
        displayName: localStorage.getItem('cipher_handle') || 'Account',
        isActive: true,
        createdAt: Date.now()
      });
    }

    return result.sort((a, b) => b.createdAt - a.createdAt);
  };

  const switchAccount = async (targetPk, pin) => {
    try {
      const vaults = getVaults();
      if (!vaults[targetPk]) throw new Error('Account not found');
      
      const skArray = await decryptKey(vaults[targetPk].vault, pin);
      const { getPublicKey, nip19 } = await import('nostr-tools');
      const sk = Uint8Array.from(skArray);
      const pk = getPublicKey(sk);
      
      if (pk !== targetPk) throw new Error('Invalid PIN for this account');
      
      setActivePubkey(targetPk);
      sessionStorage.setItem('cipher_session_sk', JSON.stringify(Array.from(sk)));
      
      // Update legacy vault too
      localStorage.setItem('cipher_vault', JSON.stringify(vaults[targetPk].vault));
      localStorage.setItem('cipher_handle', vaults[targetPk].handle);
      
      // Reload to reset all state cleanly
      window.location.reload();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const addNewAccount = () => {
    // Migrate current vault to cipher_vaults before switching, so it's not lost
    const legacyVault = localStorage.getItem('cipher_vault');
    const sessionSk = sessionStorage.getItem('cipher_session_sk');
    if (legacyVault && sessionSk && keys.pk) {
      try {
        const vaults = getVaults();
        if (!vaults[keys.pk]) {
          vaults[keys.pk] = {
            vault: JSON.parse(legacyVault),
            handle: localStorage.getItem('cipher_handle') || 'account',
            displayName: localStorage.getItem('cipher_handle') || 'Account',
            createdAt: Date.now()
          };
          saveVaults(vaults);
        }
      } catch (e) {}
    }
    sessionStorage.removeItem('cipher_session_sk');
    localStorage.removeItem('cipher_active_pubkey');
    window.location.reload();
  };

  const removeAccount = (targetPk) => {
    const vaults = getVaults();
    delete vaults[targetPk];
    saveVaults(vaults);
    
    if (getActivePubkey() === targetPk) {
      sessionStorage.clear();
      localStorage.removeItem('cipher_active_pubkey');
      window.location.reload();
    }
  };

  return { 
    ...keys, hasVault, hasBiometric, loadingSession,
    getAccounts, switchAccount, addNewAccount, removeAccount, getMnemonic, 
    unlock, unlockWithBiometric, restoreFromRelays, restoreFromMnemonic, createVault, finalizeLogin, lockApp, panicWipe
  }
}
