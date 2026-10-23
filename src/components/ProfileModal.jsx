import { useChatStore } from '../store/chatStore';
import { CopyOnLongPress } from './CopyOnLongPress';
import React, { useEffect, useState } from 'react';
import { X, MessageSquare, Shield, Star, CheckCircle2, AlertTriangle, ChevronDown, Lock } from 'lucide-react';
import { useReputation } from '../hooks/useReputation';
import { useVendorStats } from '../hooks/useVendorStats';

export default function ProfileModal({ pubkey, profile, identity, onClose, onMessage, onReview, onViewStorefront }) {
  const { reputation, loading, fetchReputation, sendVouch } = useReputation({ identity });
  const { stats: vendorStats } = useVendorStats({ identity, targetPubkey: pubkey });
  const [vouching, setVouching] = useState(false);
  const [showFiltered, setShowFiltered] = useState(false);
  const blockedUsers = useChatStore(s => s.blockedUsers);
  const toggleBlockUser = useChatStore(s => s.toggleBlockUser);
  const [safetyNumber, setSafetyNumber] = useState(null);
  const isSelf = identity?.pk === pubkey;

  useEffect(() => {
    if (pubkey) fetchReputation(pubkey);
  }, [pubkey, fetchReputation]);

  useEffect(() => {
    if (pubkey && !isSelf && identity?.pk) {
      const keys = [identity.pk, pubkey].sort().join('');
      crypto.subtle.digest('SHA-256', new TextEncoder().encode(keys)).then(hash => {
        const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
        setSafetyNumber(hex.slice(0, 30).match(/.{1,5}/g).join(' ').toUpperCase());
      });
    }
  }, [pubkey, identity?.pk, isSelf]);

  if (!pubkey) return null;

  const p = profile || {};
  const displayName = p.displayName || p.name || `User ${pubkey.slice(0, 4)}`;
  const picture = p.picture;
  const about = p.about || 'No bio yet.';
  const nip05 = p.nip05 || p.name;

  // Trust badges only count vouches that passed the age gate
  const isTrusted = reputation?.vouchCount >= 3;
  const isSeller = reputation?.reviewCount >= 5;
  const rating = reputation?.avgRating || 0;

  const isBlocked = (blockedUsers || []).includes(pubkey);
  const isVouched = reputation?.hasVouched;

  const handleVouch = async () => {
    if (!identity?.pk || isSelf) return;
    setVouching(true);
    await sendVouch(pubkey);
    setVouching(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-white dark:bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-[#111] border border-gray-300 dark:border-gray-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative max-h-[90dvh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-white dark:bg-black/50 rounded-full text-black dark:text-white/70 hover:text-black dark:text-white transition-colors">
          <X size={20} />
        </button>

        <div className="w-full flex justify-center pt-3 pb-1 absolute top-0 z-20"><div className="w-12 h-1.5 bg-white/20 rounded-full"></div></div>
        <div className="h-32 bg-gradient-to-r from-blue-600/40 to-purple-600/40" />

        <div className="px-6 pb-6 relative">
          <div className="flex justify-between items-end -mt-12 mb-4">
            <div className="w-24 h-24 rounded-full border-4 border-[#111] bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center overflow-hidden shadow-lg">
              {picture ? (
                <img src={picture} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-black dark:text-white/50">{displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { onMessage(pubkey); onClose(); }}
                className="bg-blue-600 hover:bg-blue-500 text-black dark:text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition-colors shadow-lg"
              >
                <MessageSquare size={16} /> Message
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold text-black dark:text-white">{displayName}</h2>
            {isTrusted && <Shield size={20} className="text-green-400 fill-green-400/20" title="Trusted (3+ vouches)" />}
            {isSeller && <Star size={20} className="text-yellow-400 fill-yellow-400/20" title="Top Seller (5+ reviews)" />}
          </div>

          {/* Vendor Badges */}
          {vendorStats?.badges?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {vendorStats.badges.map(b => (
                <div key={b.id} className={`flex items-center gap-1.5 bg-white/5 border border-gray-300 dark:border-gray-800 px-2 py-0.5 rounded-full text-[10px] font-bold ${b.color}`}>
                  <span>{b.icon}</span> {b.name}
                </div>
              ))}
            </div>
          )}
          {nip05 && <p className="text-sm text-blue-400 mb-3">@{nip05}</p>}

          {reputation && (
            <div className="flex gap-4 mb-3">
              <div className="flex flex-col">
                <span className="text-xs text-black dark:text-white/40 uppercase">Trusted Vouches</span>
                <span className="text-lg font-bold text-black dark:text-white">{reputation.vouchCount}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-black dark:text-white/40 uppercase">Reviews</span>
                <span className="text-lg font-bold text-black dark:text-white">{reputation.reviewCount}</span>
              </div>
              {reputation.reviewCount > 0 && (
                <div className="flex flex-col">
                  <span className="text-xs text-black dark:text-white/40 uppercase">Rating</span>
                  <span className="text-lg font-bold text-yellow-400 flex items-center gap-1">
                    {rating} <Star size={14} className="fill-yellow-400" />
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Show who vouched */}
          {reputation?.vouchList?.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] text-black dark:text-white/40 uppercase tracking-wider mb-1">Vouched by</p>
              <div className="flex flex-wrap gap-1">
                {reputation.vouchList.slice(0, 5).map((v) => (
                  <span key={v.pubkey} className="text-[11px] bg-green-500/10 text-green-300 border border-green-500/20 px-2 py-0.5 rounded-full">
                    @{v.name}
                  </span>
                ))}
                {reputation.vouchList.length > 5 && (
                  <span className="text-[11px] text-black dark:text-white/40">+{reputation.vouchList.length - 5} more</span>
                )}
              </div>
            </div>
          )}

          {/* Show filtered vouches (transparency) */}
          {reputation?.filteredCount > 0 && (
            <div className="mb-3">
              <button
                onClick={() => setShowFiltered(!showFiltered)}
                className="text-[10px] text-yellow-500/70 hover:text-yellow-400 flex items-center gap-1"
              >
                <AlertTriangle size={10} />
                {reputation.filteredCount} low-trust vouch{reputation.filteredCount > 1 ? 'es' : ''} hidden
                <ChevronDown size={10} className={showFiltered ? 'rotate-180' : ''} />
              </button>
              {showFiltered && (
                <div className="mt-1 space-y-1 pl-3 border-l border-yellow-500/20">
                  {reputation.filteredList.map((v) => (
                    <p key={v.pubkey} className="text-[10px] text-black dark:text-white/40">
                      @{v.name} — {v.reason === 'too-new' ? `account only ${v.ageDays}d old` : v.reason}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="bg-white dark:bg-black/30 rounded-xl p-4 mt-2 border border-gray-300 dark:border-gray-800/50">
            <p className="text-sm text-black dark:text-white/80 whitespace-pre-wrap">{about}</p>
          </div>

          {!isSelf && safetyNumber && (
            <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
              <p className="text-[10px] text-green-400 font-bold uppercase tracking-wider mb-1 flex items-center justify-center gap-1"><Lock size={10}/> Safety Number</p>
              <p className="font-mono text-green-300 text-sm tracking-widest">{safetyNumber}</p>
              <p className="text-[9px] text-green-500/60 mt-1">Verify this matches in person to ensure no MITM.</p>
            </div>
          )}

          {!isSelf && onViewStorefront && (
            <button
              onClick={() => { onViewStorefront(pubkey); onClose(); }}
              className="w-full mt-2 bg-purple-500/10 text-purple-400 border border-purple-500/30 font-bold py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-purple-500/20 transition-colors"
            >
              🏪 View Storefront
            </button>
          )}

          {/* Vouch button — hidden on self-profile */}
          {!isSelf && (
            <div className="mt-4">
              <button
                onClick={handleVouch}
                disabled={isVouched || vouching}
                className={`w-full font-bold py-2 rounded-xl flex items-center justify-center gap-2 border ${
                  isVouched
                    ? 'bg-green-600/20 text-green-400 border-green-500/30'
                    : 'bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-600/30'
                } disabled:opacity-50`}
              >
                {isVouched ? (
                  <><CheckCircle2 size={16} /> Vouched</>
                ) : (
                  <><Shield size={16} /> {vouching ? 'Vouching...' : 'Vouch for Trust'}</>
                )}
              </button>
              <p className="text-[10px] text-black dark:text-white/30 text-center mt-1">
                Only counts if your account is 7+ days old
              </p>
            </div>
          )}

          {isSelf && (
            <div className="mt-4 p-3 bg-white/5 rounded-xl border border-gray-300 dark:border-gray-800 text-center">
              <p className="text-[11px] text-black dark:text-white/50">This is your profile</p>
            </div>
          )}

          {!isSelf && onReview && (
            <button
              onClick={() => { onReview(pubkey); onClose(); }}
              className="w-full mt-2 bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 font-bold py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-500/20 transition-colors"
            >
              <Star size={16} /> Leave a Review
            </button>
          )}

          {reputation?.recentReviews?.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-bold text-black dark:text-white mb-2">Recent Reviews</h3>
              <div className="space-y-2">
                {reputation.recentReviews.map((rev, i) => (
                  <div key={i} className="bg-white/5 p-3 rounded-lg">
                    <div className="flex gap-1 mb-1">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} size={12} className={j < rev.rating ? 'text-yellow-400 fill-yellow-400' : 'text-black dark:text-white/20'} />
                      ))}
                    </div>
                    <p className="text-xs text-black dark:text-white/70">{rev.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          
          {!isSelf && (
            <button
              onClick={() => {
                toggleBlockUser(pubkey);
                useChatStore.getState().setToast({ type: 'success', message: isBlocked ? 'User unblocked' : 'User blocked' });
              }}
              className={`w-full mt-2 font-bold py-2 rounded-xl flex items-center justify-center gap-2 border transition-colors ${
                isBlocked 
                  ? 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10' 
                  : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
              }`}
            >
              {isBlocked ? '✓ Unblock User' : '🚫 Block User'}
            </button>
          )}
        <div className="mt-4 flex items-center gap-2 bg-white dark:bg-black/30 p-3 rounded-xl border border-gray-300 dark:border-gray-800/50">
            <span className="text-[10px] text-black dark:text-white/40 uppercase tracking-wider font-bold">Pubkey</span>
            <span className="text-xs font-mono text-black dark:text-white/70 truncate flex-1"><CopyOnLongPress value={pubkey} displayValue={pubkey.slice(0, 32) + "..."} /></span>
          </div>
        </div>
      </div>
    </div>
  );
}
