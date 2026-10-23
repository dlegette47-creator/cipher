import { useCallback, useState } from 'react';
import { getAuthenticatedPool } from '../lib/pool';
import { generalRelays, queryWithTimeout } from '../lib/relays';

export function useVendorStats({ identity, targetPubkey = null }) {
  const [stats, setStats] = useState({ sales: 0, revenueFiat: 0, btc: 0, xmr: 0, badges: [] });
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    const pkToFetch = targetPubkey || identity?.pk;
    if (!pkToFetch) return;
    setLoading(true);
    try {
      const pool = await getAuthenticatedPool(identity);
      // Fetch all signed "Order Complete" events targeting this vendor
      const events = await queryWithTimeout(pool, generalRelays, { kinds: [10006], '#p': [pkToFetch] }, 5000);
      
      let sales = 0;
      let revenueFiat = 0;
      let btc = 0;
      let xmr = 0;

      events.forEach(ev => {
        sales++;
        const amountStr = ev.tags.find(t => t[0] === 'amount')?.[1] || '0';
        const currency = ev.tags.find(t => t[0] === 'currency')?.[1] || 'USD';
        const cryptoAmt = parseFloat(ev.tags.find(t => t[0] === 'crypto_amount')?.[1] || '0');
        
        revenueFiat += parseFloat(amountStr);
        if (currency === 'BTC') btc += cryptoAmt;
        if (currency === 'XMR') xmr += cryptoAmt;
      });

      // Calculate Badges
      const badges = [];
      if (sales >= 1) badges.push({ id: 'first_sale', name: 'First Sale', icon: '🏆', color: 'text-yellow-400' });
      if (sales >= 100) badges.push({ id: 'diamond_hands', name: 'Diamond Hands', icon: '💎', color: 'text-blue-400' });
      if (revenueFiat >= 1000) badges.push({ id: 'high_roller', name: '$1K Volume', icon: '💰', color: 'text-green-400' });
      if (revenueFiat >= 10000) badges.push({ id: 'whale', name: '$10K Volume', icon: '🐋', color: 'text-purple-400' });

      setStats({ sales, revenueFiat, btc, xmr, badges });
    } catch (e) {
      console.error('Failed to fetch vendor stats', e);
    } finally {
      setLoading(false);
    }
  }, [identity, targetPubkey]);

  return { stats, loading, fetchStats };
}
