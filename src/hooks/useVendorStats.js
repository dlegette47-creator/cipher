import { useCallback, useState } from 'react';
import { db } from '../db';

export function useVendorStats({ identity, targetPubkey = null }) {
  const [stats, setStats] = useState({ sales: 0, revenueFiat: 0, btc: 0, xmr: 0, badges: [] });
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    const pkToFetch = targetPubkey || identity?.pk;
    if (!pkToFetch) return;
    setLoading(true);
    try {
      const allMsgs = await db.messages.toArray();
      
      const completedIds = new Set();
      allMsgs.forEach(m => {
        if (m.data?.type === 'order_update' && m.data?.status === 'completed') {
          completedIds.add(m.data.orderId);
        }
      });

      const orders = allMsgs.filter(m => m.data?.type === 'cipher_order');
      
      let sales = 0;
      let revenueFiat = 0;
      let btc = 0;
      let xmr = 0;

      orders.forEach(o => {
        const isCompleted = completedIds.has(o.id) || o.data.status === 'completed';
        if (isCompleted) {
          sales++;
          revenueFiat += parseFloat(o.data.amountFiat || '0');
          const cryptoAmt = parseFloat(o.data.amountCrypto || '0');
          const currency = (o.data.currency || 'USD').toUpperCase();
          if (currency === 'BTC') btc += cryptoAmt;
          if (currency === 'XMR') xmr += cryptoAmt;
        }
      });

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