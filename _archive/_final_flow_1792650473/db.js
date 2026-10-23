// src/db.js
import Dexie from 'dexie';

let _current = null;
let _currentOwner = null;
let _warnedOnce = false;

function makeDB(name) {
  const d = new Dexie(name);
  d.version(6).stores({
    messages: '++id, chatId, pubkey, timestamp, clientId, type',
    profiles: 'pubkey, name, displayName',
    groups: 'id, name',
    chatReads: 'chatId'
  });
  return d;
}

export function openDBFor(pubkey) {
  if (!pubkey) return null;
  if (_currentOwner === pubkey && _current) return _current;
  if (_current) { try { _current.close(); } catch (_) {} }
  const name = 'CipherDB_v4_' + pubkey.slice(0, 16);
  _current = makeDB(name);
  _currentOwner = pubkey;
  return _current;
}

export function closeDB() {
  if (_current) { try { _current.close(); } catch (_) {} }
  _current = null;
  _currentOwner = null;
}

export function currentOwner() { return _currentOwner; }

// Safe stub returned when accessed before openDBFor().
// Reads return empty, writes no-op. Prevents pre-login crashes.
const stubTable = () => ({
  toArray: () => Promise.resolve([]),
  get: () => Promise.resolve(undefined),
  put: () => Promise.resolve(),
  add: () => Promise.resolve(),
  clear: () => Promise.resolve(),
  delete: () => Promise.resolve(),
  count: () => Promise.resolve(0),
  where: () => ({
    equals: () => ({
      sortBy: () => Promise.resolve([]),
      toArray: () => Promise.resolve([]),
    }),
    sortBy: () => Promise.resolve([]),
    toArray: () => Promise.resolve([]),
  }),
  filter: () => ({ toArray: () => Promise.resolve([]) }),
});

export const db = new Proxy({}, {
  get(_t, prop) {
    if (!_current) {
      if (!_warnedOnce) {
        _warnedOnce = true;
        console.warn('[db] accessed before openDBFor — returning empty stubs');
      }
      if (['messages', 'chatReads', 'profiles', 'groups'].includes(prop)) {
        return stubTable();
      }
      return () => Promise.resolve();
    }
    const v = _current[prop];
    return typeof v === 'function' ? v.bind(_current) : v;
  },
});

export const saveMessage = async (chatId, msg) => {
  try { await db.messages.put({ ...msg, chatId }); } catch (e) { console.error(e); }
};

export const getMessages = async (chatId) => {
  return await db.messages.where('chatId').equals(chatId).sortBy('timestamp');
};

export const saveProfile = async (profile) => {
  try { await db.profiles.put(profile); } catch (e) { console.error(e); }
};

export const getProfile = async (pubkey) => {
  return await db.profiles.get(pubkey);
};

export const searchProfilesLocal = async (query) => {
  const lowerQuery = query.toLowerCase();
  return await db.profiles.filter(p =>
    (p.name && p.name.toLowerCase().includes(lowerQuery)) ||
    (p.displayName && p.displayName.toLowerCase().includes(lowerQuery))
  ).toArray();
};
