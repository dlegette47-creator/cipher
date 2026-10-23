import { useState, useEffect } from 'react'
import {  
  User, Plus, AlertCircle, RefreshCw, 
  Lock, ChevronRight, ArrowLeft, Copy, CreditCard, Camera
, BarChart3 } from 'lucide-react'
import { uploadToBlossom } from '@nostr-wot/blossom'
import { useProfiles, updateProfileCache } from './useProfiles'

import { useChatStore } from './store/chatStore';

import VendorDashboard from './components/chat/VendorDashboard';

export default function Wallet({ identity }) {
  const { isVendor, setIsVendor } = useChatStore();
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);
  const panicWipeEnabled = useChatStore((s) => s.panicWipeEnabled);
  const setPanicWipeEnabled = useChatStore((s) => s.setPanicWipeEnabled);
  const profiles = useProfiles([identity.pk])
  const defaultName = identity.npub ? identity.npub.slice(0, 10) : 'User'
  
  const myProfile = profiles[identity.pk] || { name: defaultName, displayName: defaultName, picture: null, about: '' }

  const [view, setView] = useState('main') 

  // Profile state
  const [username, setUsername] = useState('') 
  const [displayName, setDisplayName] = useState('')
  const [picture, setPicture] = useState('')
  const [about, setAbout] = useState('')
  
  // Product state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [image, setImage] = useState('')

  const [btcAddress, setBtcAddress] = useState(localStorage.getItem('cipher_btc_address') || '')
  const [xmrAddress, setXmrAddress] = useState(localStorage.getItem('cipher_xmr_address') || '')

  const [status, setStatus] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (myProfile.name) setUsername(myProfile.name)
    if (myProfile.displayName) setDisplayName(myProfile.displayName)
    if (myProfile.picture) setPicture(myProfile.picture)
    if (myProfile.about) setAbout(myProfile.about)
  }, [myProfile.name, myProfile.displayName, myProfile.picture, myProfile.about])

  const handleImageUpload = async (e, type) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setStatus('Uploading via Blossom...')

    try {
      const blob = await uploadToBlossom(file, {
        signer: {
          getPublicKey: async () => identity.pk,
          signEvent: async (event) => {
            const { finalizeEvent } = await import('nostr-tools')
            return finalizeEvent(event, identity.sk)
          }
        },
      })

      if (type === 'profile') {
        setPicture(blob.url)
        // Auto-save profile if they just changed the picture from the main screen
        if (view === 'main') {
          await saveProfile(null, blob.url)
        }
      }
      if (type === 'product') setImage(blob.url)
      
      setStatus('Image uploaded!')
    } catch (err) {
      console.error(err)
      useChatStore.getState().setToast({ type: 'info', message: `Upload failed: ${err.message}` });
    } finally {
      setUploadingImage(false)
      setTimeout(() => setStatus(''), 3000)
    }
  }

  const copyNpub = () => {
    if (identity.npub) {
      navigator.clipboard.writeText(identity.npub)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    }
  }

  const saveProfile = async (e, overridePicture = null) => {
    if (e) e.preventDefault()
    
    // Save crypto addresses locally
    localStorage.setItem('cipher_btc_address', btcAddress);
    localStorage.setItem('cipher_xmr_address', xmrAddress);
    if (!displayName) return useChatStore.getState().setToast({ type: 'info', message: "Display Name is required" });
    
    setIsPublishing(true); setStatus('Saving Profile...')
    const picToSave = overridePicture || picture
    
    try {
      const { SimplePool, finalizeEvent } = await import('nostr-tools')
      const pool = new SimplePool()
      const relays = ['wss://relay.primal.net', ]

      const ev = finalizeEvent({
        kind: 0, created_at: Math.floor(Date.now() / 1000), tags: [],
        content: JSON.stringify({ 
          name: username, 
          display_name: displayName, 
          about, 
          picture: picToSave 
        })
      }, identity.sk)

      const publishPromises = pool.publish(relays, ev)
      const timeout = new Promise((resolve) => setTimeout(resolve, 3000))
      await Promise.race([Promise.allSettled(publishPromises), timeout])
      
      // ✅ NEW: Publish Kind 10003 (Unique Username Registry)
      if (username) {
        try {
          const usernameEv = finalizeEvent({
            kind: 10003, 
            created_at: Math.floor(Date.now() / 1000),
            tags: [
              ['d', 'username'],
              ['t', 'cipher_username_' + username],
              ['t', 'cipher_username'],
              ['username', username]
            ],
            content: ''
          }, identity.sk)
          
          const usernameRelays = ['wss://relay.primal.net', 'wss://groups.aegispayhq.com']
          const usernamePublish = pool.publish(usernameRelays, usernameEv)
          await Promise.race([Promise.allSettled(usernamePublish), timeout])
          console.log('[Username] Successfully published kind 10003 for @' + username)
        } catch (e) {
          console.error('[Username] Failed to publish username:', e)
        }
      }
      
      
      // ✅ Publish Kind 10003 (Unique Username Registry)
      if (username) {
        try {
          const usernameEv = finalizeEvent({
            kind: 10003, 
            created_at: Math.floor(Date.now() / 1000),
            tags: [
              ['d', 'username'],
              ['t', 'cipher_username_' + username],
              ['t', 'cipher_username'],
              ['username', username]
            ],
            content: ''
          }, identity.sk)
          
          const usernameRelays = ['wss://relay.primal.net', 'wss://groups.aegispayhq.com']
          const usernamePublish = pool.publish(usernameRelays, usernameEv)
          await Promise.race([Promise.allSettled(usernamePublish), timeout])
          console.log('[Username] Successfully published kind 10003 for @' + username)
        } catch (e) {
          console.error('[Username] Failed to publish username:', e)
        }
      }

      updateProfileCache(identity.pk, { name: username, displayName, picture: picToSave, about })
      
      setStatus('Profile Saved!')
      setView('main')
    } catch (err) { setStatus('Error: ' + err.message) } 
    finally { setIsPublishing(false); setTimeout(() => setStatus(''), 3000) }
  }

  const publishProduct = async () => {
    if (!title || !price) return useChatStore.getState().setToast({ type: 'info', message: "Title and Price required" });
    setIsPublishing(true); setStatus('Publishing...')
    try {
      const { SimplePool, finalizeEvent } = await import('nostr-tools')
      const pool = new SimplePool()
      const relays = ['wss://relay.primal.net', ]
      const dTag = Date.now().toString()
      
      const tags = [
        ['d', dTag], ['title', title], ['price', price, currency], 
        ['image', image || 'https://via.placeholder.com/400'], ['stock', '1'],
        ['status', 'active'], ['published_at', Math.floor(Date.now() / 1000).toString()],
        ['t', 'cipher_marketplace'] // <--- FIX: Added the tag Explore looks for
      ]
      if (btcAddress) tags.push(['payment', `btc:${btcAddress}`])
      if (xmrAddress) tags.push(['payment', `xmr:${xmrAddress}`])
      
      const content = JSON.stringify({ name: title, description, price, currency, image })
      const ev = finalizeEvent({ kind: 30402, created_at: Math.floor(Date.now() / 1000), tags, content }, identity.sk)
      
      const publishPromises = pool.publish(relays, ev)
      const timeout = new Promise((resolve) => setTimeout(resolve, 3000))
      await Promise.race([Promise.allSettled(publishPromises), timeout])
      
      const newProduct = {
        id: ev.id, name: title, description, price, currency,
        image: image || 'https://via.placeholder.com/400', stock: '1',
        vendorPubkey: identity.pk, created_at: ev.created_at,
        vendorSettings: { btcAddress: btcAddress || null, xmrAddress: xmrAddress || null }
      }
        
      const cached = JSON.parse(localStorage.getItem('cipher_cached_products') || '[]')
      localStorage.setItem('cipher_cached_products', JSON.stringify([newProduct, ...cached.filter(p => p.id !== ev.id)]))

      setStatus('Product Published!')
      setTitle(''); setDescription(''); setPrice(''); setImage('')
      setView('main')
    } catch (err) { setStatus('Error: ' + err.message) } 
    finally { setIsPublishing(false); setTimeout(() => setStatus(''), 3000) }
  }

  const savePayments = () => {
    localStorage.setItem('cipher_btc', btcAddress)
    localStorage.setItem('cipher_xmr', xmrAddress)
    setStatus('Addresses saved!'); setTimeout(() => setStatus(''), 2000)
    setView('main')
  }

    if (view === 'vendor') {
    return <VendorDashboard identity={identity} products={JSON.parse(localStorage.getItem('cipher_my_products') || '[]')} onBack={() => setView('main')} />;
  }

  // --- SUB-SCREEN: EDIT PROFILE ---
  if (view === 'edit_profile') {
    return (
      <div className="p-4 animate-slide-up pb-24 overflow-y-auto h-full">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => setView('main')} className="p-2 -ml-2 text-white/50 hover:text-white transition-colors">
            <ArrowLeft size={20}/>
          </button>
          <h2 className="text-xl font-bold">Edit Profile</h2>
        </div>
        
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            {picture ? (
              <img src={picture} alt="avatar" className="w-24 h-24 rounded-full object-cover border-2 border-white/10 shadow-lg" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-surfaceLight flex items-center justify-center border-2 border-white/10 shadow-lg">
                <User size={32} className="text-white/30" />
              </div>
            )}
            
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => handleImageUpload(e, 'profile')} 
              className="hidden" 
              id="profile-upload" 
            />
            
            <label htmlFor="profile-upload" className="absolute bottom-0 right-0 p-2 bg-white text-black rounded-full border-4 border-base cursor-pointer hover:bg-gray-200 transition-transform active:scale-95">
              {uploadingImage ? <RefreshCw size={14} className="animate-spin"/> : <Camera size={14} />}
            </label>
          </div>
        </div>

        <form onSubmit={saveProfile} className="space-y-5">
          
          <div className="bg-surfaceLight border border-white/10 rounded-xl p-4">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Payment Addresses</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white/60 mb-1">Bitcoin (BTC) Address</label>
                <input 
                  type="text" 
                  placeholder="bc1q..."
                  value={btcAddress}
                  onChange={(e) => setBtcAddress(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg p-2 text-sm text-white placeholder-white/20 focus:border-white/30 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Monero (XMR) Address</label>
                <input 
                  type="text" 
                  placeholder="4..."
                  value={xmrAddress}
                  onChange={(e) => setXmrAddress(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg p-2 text-sm text-white placeholder-white/20 focus:border-white/30 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Locked Username Field - Clean Flexbox */}
          <div>
            <div className="w-full bg-base border border-white/5 rounded-xl p-4 flex items-center gap-3">
              <span className="text-white/30 text-lg">@</span>
              <span className="text-sm text-white/50 font-mono tracking-wide">{username}</span>
            </div>
            <p className="text-[10px] text-white/30 mt-1.5 ml-1">Usernames are permanent and cannot be changed.</p>
          </div>

          <div>
            <label className="text-xs text-white/50 ml-1 mb-1.5 block">Display Name</label>
            <input 
              placeholder="e.g. Alice's Shop" 
              value={displayName} 
              onChange={e => setDisplayName(e.target.value)} 
              className="w-full bg-surfaceLight border border-white/10 rounded-xl p-4 text-sm text-white placeholder-white/20 focus:border-white/30 outline-none transition-colors" 
            />
          </div>
          
          <div>
            <label className="text-xs text-white/50 ml-1 mb-1.5 block">Bio</label>
            <textarea 
              placeholder="Tell buyers about your shop..." 
              value={about} 
              onChange={e => setAbout(e.target.value)} 
              className="w-full bg-surfaceLight border border-white/10 rounded-xl p-4 text-sm text-white placeholder-white/20 focus:border-white/30 outline-none resize-none h-24 transition-colors" 
            />
          </div>
          
          <button type="submit" disabled={isPublishing || uploadingImage} className="w-full py-4 bg-white text-black rounded-xl font-bold text-sm mt-2 flex justify-center items-center gap-2 transition-transform active:scale-95 disabled:opacity-50">
            {isPublishing ? <RefreshCw size={16} className="animate-spin"/> : 'Save Profile'}
          </button>
        </form>
        <div className="mt-8 border-t border-white/10 pt-6">
          <h3 className="text-sm font-bold text-red-400 mb-2">Danger Zone</h3>
          <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-red-400">Panic Wipe (Shake)</p>
              <p className="text-xs text-red-400/60">Violently shake phone to wipe all data instantly.</p>
            </div>
            <input 
              type="checkbox" 
              checked={panicWipeEnabled}
              onChange={(e) => setPanicWipeEnabled(e.target.checked)}
              className="w-6 h-6 rounded accent-red-500 cursor-pointer"
            />
          </div>
        </div>


        </div>
    )
  }

  // --- SUB-SCREEN: ADD PRODUCT ---
  if (view === 'product') {
    return (
      <div className="p-4 animate-slide-up overflow-y-auto h-full">
        <button onClick={() => setView('main')} className="flex items-center gap-1 text-white/50 text-sm mb-6 hover:text-white"><ArrowLeft size={16}/> Back</button>
        <h2 className="text-xl font-bold mb-6">List New Product</h2>
        
        <div className="space-y-4">
          <input placeholder="Product Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-surfaceLight border border-white/10 rounded-xl p-4 text-sm focus:border-white/30 outline-none" />
          <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-surfaceLight border border-white/10 rounded-xl p-4 text-sm focus:border-white/30 outline-none resize-none h-24" />
          
          <div className="flex items-center gap-4 p-4 bg-surfaceLight border border-white/10 rounded-xl">
            {image ? (
              <img src={image} alt="product" className="w-16 h-16 rounded-lg object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-base flex items-center justify-center">
                <Camera size={24} className="text-white/20" />
              </div>
            )}
            <div className="flex-1">
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'product')} className="hidden" id="product-upload" />
              <label htmlFor="product-upload" className="py-2 px-4 bg-white/10 rounded-lg text-sm font-semibold cursor-pointer hover:bg-white/20 transition-colors inline-block">
                {uploadingImage ? 'Uploading...' : 'Choose Photo'}
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <input placeholder="Price" type="number" value={price} onChange={e => setPrice(e.target.value)} className="flex-1 bg-surfaceLight border border-white/10 rounded-xl p-4 text-sm focus:border-white/30 outline-none" />
            <select value={currency} onChange={e => setCurrency(e.target.value)} className="bg-surfaceLight border border-white/10 rounded-xl px-4 text-sm focus:border-white/30 outline-none">
              <option value="USD">USD</option><option value="BTC">BTC</option><option value="XMR">XMR</option>
            </select>
          </div>
          
          <button onClick={publishProduct} disabled={isPublishing || uploadingImage} className="w-full py-4 bg-white text-black rounded-xl font-bold text-sm mt-4 flex justify-center items-center gap-2">
            {isPublishing ? <RefreshCw size={16} className="animate-spin"/> : 'Publish to Store'}
          </button>
        </div>
      </div>
    )
  }

  // --- SUB-SCREEN: PAYMENTS ---
  if (view === 'payments') {
    return (
      <div className="p-4 animate-slide-up overflow-y-auto h-full">
        <button onClick={() => setView('main')} className="flex items-center gap-1 text-white/50 text-sm mb-6 hover:text-white"><ArrowLeft size={16}/> Back</button>
        <h2 className="text-xl font-bold mb-6">Payment Addresses</h2>
        <div className="space-y-4">
          <input placeholder="Bitcoin (BTC)" value={btcAddress} onChange={e => setBtcAddress(e.target.value)} className="w-full bg-surfaceLight border border-white/10 rounded-xl p-4 text-sm focus:border-white/30 outline-none" />
          <input placeholder="Monero (XMR)" value={xmrAddress} onChange={e => setXmrAddress(e.target.value)} className="w-full bg-surfaceLight border border-white/10 rounded-xl p-4 text-sm focus:border-white/30 outline-none" />
          <button onClick={savePayments} className="w-full py-4 bg-white text-black rounded-xl font-bold text-sm mt-4">Save Addresses</button>
        </div>
      </div>
    )
  }

  // --- MAIN PROFILE TAB ---
  return (
    <div className="p-4 animate-fade-in overflow-y-auto h-full">
      {status && <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-white text-black px-4 py-2 rounded-full text-xs font-bold shadow-lg z-50 animate-bounce">{status}</div>}

      <div className="flex flex-col items-center justify-center py-6 bg-surface rounded-3xl border border-white/5 mb-6">
        <div className="relative mb-4">
          {/* MAKE AVATAR CLICKABLE TO CHANGE PFP */}
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => handleImageUpload(e, 'profile')} 
            className="hidden" 
            id="main-avatar-upload" 
          />
          <label htmlFor="main-avatar-upload" className="cursor-pointer group relative block">
            {myProfile.picture ? (
              <img src={myProfile.picture} alt="avatar" className="w-24 h-24 rounded-full object-cover border-2 border-white/10 group-hover:opacity-80 transition-opacity" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-surfaceLight flex items-center justify-center border-2 border-white/10 group-hover:opacity-80 transition-opacity">
                <span className="text-3xl font-bold text-white/50">{myProfile.displayName.charAt(0).toUpperCase()}</span>
              </div>
            )}
            
            {/* Camera Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingImage ? <RefreshCw size={24} className="text-white animate-spin" /> : <Camera size={24} className="text-white" />}
            </div>
          </label>
        </div>
        
        <h2 className="text-xl font-bold">{myProfile.displayName}</h2>
        <p className="text-xs text-white/40 mb-2">@{myProfile.name}</p>
        
        {myProfile.about && <p className="text-xs text-white/50 mt-1 px-8 text-center">{myProfile.about}</p>}
        
        <button onClick={copyNpub} className="mt-4 flex items-center gap-2 px-3 py-1.5 bg-base border border-white/10 rounded-full text-[10px] text-white/60 hover:text-white transition-colors">
          {copied ? 'Copied!' : `${identity.npub?.slice(0, 12)}...${identity.npub?.slice(-4)}`}
          <Copy size={12} />
        </button>
      </div>

      <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden">
        
        {/* EDIT PROFILE MENU ITEM */}
        <button onClick={() => setView('edit_profile')} className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5">
          <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg"><User size={20}/></div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold">Edit Profile</p>
            <p className="text-[10px] text-white/40">Change your display name and bio</p>
          </div>
          <ChevronRight size={18} className="text-white/20" />
        </button>

        <button onClick={() => setView('product')} className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5">
          <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><Plus size={20}/></div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold">My Store</p>
            <p className="text-[10px] text-white/40">Publish a new product listing</p>
          </div>
          <ChevronRight size={18} className="text-white/20" />
        </button>
          <button onClick={() => setView('vendor')} className="w-full flex items-center gap-4 p-4 bg-[#111] border border-white/10 rounded-2xl hover:bg-white/5 transition-colors mt-2">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
              <BarChart3 size={20} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-white">Vendor Dashboard</p>
              <p className="text-xs text-white/50">View stats, sales, and badges</p>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/30"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        

        <button onClick={() => setView('payments')} className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5">
          <div className="p-2 bg-green-500/20 text-green-400 rounded-lg"><CreditCard size={20}/></div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold">Payment Addresses</p>
            <p className="text-[10px] text-white/40">Configure your BTC and XMR wallets</p>
          </div>
          <ChevronRight size={18} className="text-white/20" />
        </button>

        <button onClick={identity.lockApp} className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5">
          <div className="p-2 bg-orange-500/20 text-orange-400 rounded-lg"><Lock size={20}/></div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold">Lock App</p>
            <p className="text-[10px] text-white/40">Securely lock Cipher</p>
          </div>
        </button>

        <button onClick={() => { if (window.confirm("This will wipe local data. Make sure you saved your 12-word phrase! Proceed?")) identity.panicWipe() }} className="w-full flex items-center gap-4 p-4 hover:bg-red-500/10 transition-colors">
          <div className="p-2 bg-red-500/20 text-red-500 rounded-lg"><AlertCircle size={20}/></div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-red-500">Panic Wipe</p>
            <p className="text-[10px] text-red-500/60">Destroy all local data instantly</p>
          </div>
        </button>
      </div>
    
      
      <button 
        onClick={() => {
          setIsVendor(!isVendor);
          useChatStore.getState().setToast({ 
            type: 'success', 
            message: !isVendor ? 'Vendor tools unlocked!' : 'Switched to Buyer mode.' 
          });
        }}
        className="w-full flex items-center justify-between bg-[#111] border border-blue-500/30 p-4 rounded-2xl hover:bg-blue-500/10 transition-colors mt-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          </div>
          <div className="text-left">
            <p className="text-white font-bold">{isVendor ? 'Switch to Buyer Mode' : 'Become a Vendor'}</p>
            <p className="text-xs text-white/50">{isVendor ? 'Hide store and dashboard' : 'Unlock store, dashboard & payments'}</p>
          </div>
        </div>
      </button>

      {showPanicConfirm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#111] border border-red-500/30 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-red-500 mb-2">Panic Wipe</h2>
            <p className="text-sm text-white/70 mb-6">This will instantly destroy all local data on this device. Make sure you have saved your 12-word recovery phrase!</p>
            <div className="flex gap-3">
              <button onClick={() => setShowPanicConfirm(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-colors">Cancel</button>
              <button onClick={async () => {
                setShowPanicConfirm(false);
                // Execute the actual wipe logic here
                localStorage.clear();
                indexedDB.databases().then(dbs => dbs.forEach(db => indexedDB.deleteDatabase(db.name)));
                window.location.reload();
              }} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors">Wipe It</button>
            </div>
          </div>
        </div>
      )}
</div>
  )
}
