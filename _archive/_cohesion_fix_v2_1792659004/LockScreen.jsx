import { useChatStore } from './store/chatStore';
import { useState, useEffect } from 'react'
import { Lock, Fingerprint, ChevronLeft, DownloadCloud, AtSign, Camera, RefreshCw, KeyRound } from 'lucide-react'
import { uploadToBlossom } from '@nostr-wot/blossom'

export default function LockScreen({ identity }) {
  const [mode, setMode] = useState(identity.hasVault ? 'unlock' : 'create')
  const [pin, setPin] = useState('')
  const [handle, setHandle] = useState('')
  const [mnemonic, setMnemonic] = useState('')
  const [error, setError] = useState('')
  const [enableBio, setEnableBio] = useState(false)
  const [loading, setLoading] = useState(false)

  const [tempIdentity, setTempIdentity] = useState(null)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [avatar, setAvatar] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  useEffect(() => {
    if (identity.hasBiometric && mode === 'unlock') handleBiometric()
  }, [identity.hasBiometric, mode])

  const handleBiometric = async () => {
    setLoading(true)
    const res = await identity.unlockWithBiometric()
    if (!res.success) setError('Biometrics failed. Use your PIN.')
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')

    // Only validate handle when the handle field is actually shown
    const cleanHandle = handle.toLowerCase().trim().replace(/[^a-z0-9_]/g, '')
    if (mode === 'create' || mode === 'restore') {
      if (cleanHandle.length < 3) { setError('Handle must be at least 3 letters/numbers'); setLoading(false); return }
    }
    if (pin.length !== 4) { setError('PIN must be 4 digits'); setLoading(false); return }

    try {
      if (mode === 'create') {
        const res = await identity.createVault(cleanHandle, pin, enableBio)
        setTempIdentity(res)
        setUsername(cleanHandle)
        setDisplayName(cleanHandle)
        setMode('setup_profile')
      } else if (mode === 'unlock') {
        const res = await identity.unlock(pin)
        if (!res.success) {
          setPin('')
          setError(`Incorrect PIN. ${res.remaining} attempts left.`)
        }
      } else if (mode === 'restore') {
        const res = await identity.restoreFromRelays(cleanHandle, pin)
        if (!res.success) {
          const msg = String(res.error || '')
          if (msg.toLowerCase().includes('operation') || msg.toLowerCase().includes('specific')) {
            setError('This account was created with the old recovery system. Tap "Use 12-word phrase" below.')
          } else {
            setError(msg)
          }
        }
      } else if (mode === 'restore_mnemonic') {
        if (!mnemonic.trim() || mnemonic.trim().split(/\s+/).length < 12) {
          setError('Please enter your full 12-word phrase')
        } else {
          const res = await identity.restoreFromMnemonic(mnemonic, pin)
          if (!res.success) setError(res.error)
        }
      }
    } catch (err) {
      setError(err?.message || 'Something went wrong')
    }
    setLoading(false)
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !tempIdentity) return
    setUploadingAvatar(true)
    try {
      const blob = await uploadToBlossom(file, {
        signer: {
          getPublicKey: async () => tempIdentity.pk,
          signEvent: async (event) => {
            const { finalizeEvent } = await import('nostr-tools')
            return finalizeEvent(event, tempIdentity.sk)
          }
        },
      })
      setAvatar(blob.url)
    } catch (err) { useChatStore.getState().setToast({ type: 'info', message: 'Upload failed: ' + err.message }); }
    finally { setUploadingAvatar(false) }
  }

  const handleFinishSetup = async (e) => {
    e.preventDefault()
    const clean = username.replace('@', '').trim().toLowerCase()
    if (clean.length < 3) return setError('Username must be 3+ characters')
    if (!/^[a-z0-9_]+$/.test(clean)) return setError('Only letters, numbers, underscores')
    setLoading(true)
    localStorage.setItem('cipher_new_account', 'true'); // 🚀 Triggers the tutorial
    await identity.finalizeLogin(tempIdentity.sk, tempIdentity.pk, tempIdentity.npub, {
      username: clean,
      displayName: displayName.trim() || clean,
      picture: avatar
    })
    setLoading(false)
  }

  if (mode === 'setup_profile') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-full overflow-y-auto bg-[#111] dark:bg-black px-6 py-10">
        <h1 className="text-2xl font-semibold mb-2">Setup Profile</h1>
        <p className="text-white/60 text-sm mb-8 text-center max-w-[280px]">Almost done. Pick a display name and photo.</p>
        <form onSubmit={handleFinishSetup} className="w-full max-w-xs flex flex-col items-center">
          <div className="relative mb-6">
            {avatar ? (
              <img src={avatar} className="w-24 h-24 rounded-full object-cover border-2 border-gray-300 dark:border-gray-800" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-[#171717] flex items-center justify-center border-2 border-gray-300 dark:border-gray-800">
                <Camera size={32} className="text-white/30" />
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" id="av" />
            <label htmlFor="av" className="absolute bottom-0 right-0 p-2 bg-[#111] text-black rounded-full border-4 border-base cursor-pointer">
              {uploadingAvatar ? <RefreshCw size={14} className="animate-spin"/> : <Camera size={14} />}
            </label>
          </div>
          <div className="w-full relative mb-4">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">@</span>
            <input type="text" placeholder="username" value={username} onChange={(e) => { setUsername(e.target.value.replace(/[@\s]/g, '').toLowerCase()); setError('') }} className="w-full bg-gray-200 dark:bg-[#171717] border border-gray-300 dark:border-gray-800 rounded-xl p-4 pl-10 text-sm text-white focus:outline-none focus:border-white/30" autoCapitalize="none" />
          </div>
          <input type="text" placeholder="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full bg-gray-200 dark:bg-[#171717] border border-gray-300 dark:border-gray-800 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-white/30 mb-4" />
          {error && <p className="text-red-500 text-xs text-center mb-4">{error}</p>}
          <button type="submit" disabled={loading || username.length < 3 || uploadingAvatar} className="w-full py-4 bg-[#111] text-black rounded-2xl font-semibold text-sm disabled:opacity-50">
            {loading ? 'Creating...' : 'Enter Cipher'}
          </button>
        </form>
      </div>
    )
  }

  const isMnemonicMode = mode === 'restore_mnemonic'

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-full overflow-y-auto bg-[#111] dark:bg-black px-6 py-10">
      <div className="w-16 h-16 bg-gray-200 dark:bg-[#171717] rounded-2xl flex items-center justify-center mb-8 border border-gray-300 dark:border-gray-800 shadow-2xl">
        {isMnemonicMode ? <KeyRound size={32} className="text-white" /> : mode === 'restore' ? <DownloadCloud size={32} className="text-white" /> : <Lock size={32} className="text-white" />}
      </div>

      <h1 className="text-2xl font-semibold mb-2">
        {mode === 'create' ? 'Welcome to Cipher' : mode === 'unlock' ? 'Enter PIN' : mode === 'restore' ? 'Restore Account' : 'Recovery Phrase'}
      </h1>
      <p className="text-white/50 text-sm mb-8 text-center max-w-[280px]">
        {mode === 'create' ? 'Pick a handle and a 4-digit PIN.' 
         : mode === 'unlock' ? 'Enter your 4-digit PIN to unlock.' 
         : mode === 'restore' ? 'Enter your handle and PIN.'
         : 'Enter your 12-word phrase and a new PIN.'}
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col items-center">
        {isMnemonicMode && (
          <textarea
            placeholder="apple banana cherry ..."
            value={mnemonic}
            onChange={(e) => { setMnemonic(e.target.value); setError('') }}
            className="w-full bg-gray-200 dark:bg-[#171717] border border-gray-300 dark:border-gray-800 rounded-xl p-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 mb-4 h-24 resize-none"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
          />
        )}

        {(mode === 'create' || mode === 'restore') && (
          <div className="w-full relative mb-4">
            <AtSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="yourhandle"
              value={handle}
              onChange={(e) => { setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')); setError('') }}
              className="w-full bg-gray-200 dark:bg-[#171717] border border-gray-300 dark:border-gray-800 rounded-xl p-4 pl-10 text-sm text-white focus:outline-none focus:border-white/30"
              autoCapitalize="none"
              autoFocus
            />
          </div>
        )}

        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError('') }}
          placeholder={isMnemonicMode ? 'New 4-digit PIN' : '4-digit PIN'}
          className="w-full bg-gray-200 dark:bg-[#171717] border border-gray-300 dark:border-gray-800 rounded-xl p-4 text-center tracking-[1em] text-lg text-white placeholder-white/30 placeholder:tracking-normal placeholder:text-sm focus:outline-none focus:border-white/30 mb-4 font-mono"
        />

        {error && <p className="text-red-500 text-xs text-center mb-4 px-4">{error}</p>}

        <button type="submit" disabled={loading || pin.length !== 4 || ((mode === 'create' || mode === 'restore') && handle.length < 3) || (isMnemonicMode && mnemonic.trim().split(/\s+/).length < 12)} className="w-full py-4 bg-[#111] text-black rounded-2xl font-semibold text-sm disabled:opacity-50 mt-2">
          {loading ? 'Processing...' : mode === 'create' ? 'Create Account' : mode === 'unlock' ? 'Unlock' : mode === 'restore' ? 'Restore' : 'Restore with Phrase'}
        </button>
      </form>

      <div className="mt-8 flex flex-col items-center gap-4">
        {mode === 'unlock' && identity.hasBiometric && (
          <button onClick={handleBiometric} disabled={loading} className="w-full max-w-xs py-3 bg-[#111]/10 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2">
            <Fingerprint size={18} /> Use Biometrics
          </button>
        )}

        {mode === 'restore' && (
          <button type="button" onClick={() => { setMode('restore_mnemonic'); setError(''); setPin('') }} className="text-white/50 text-xs hover:text-white underline">
            Using an old account? Use 12-word phrase →
          </button>
        )}

        {isMnemonicMode && (
          <button type="button" onClick={() => { setMode('restore'); setError(''); setPin(''); setMnemonic('') }} className="text-white/50 text-xs hover:text-white underline flex items-center gap-1">
            <ChevronLeft size={14} /> Back to handle
          </button>
        )}

        {mode === 'create' && (
          <>
            <label className="flex items-center gap-2 text-white/60 text-sm cursor-pointer">
              <input type="checkbox" checked={enableBio} onChange={(e) => setEnableBio(e.target.checked)} className="accent-white" />
              Enable Biometric Unlock
            </label>
            <button type="button" onClick={() => { setMode('restore'); setError(''); setPin('') }} className="text-white/50 text-xs hover:text-white underline">
              Already have an account? Restore it.
            </button>
          </>
        )}

        {mode === 'restore' && (
          <button type="button" onClick={() => { setMode('create'); setError(''); setPin('') }} className="text-white/50 text-xs hover:text-white underline">
            Create a new account instead
          </button>
        )}
      </div>
    </div>
  )
}
