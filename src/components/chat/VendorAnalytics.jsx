import React, { useState, useEffect } from 'react';
import { ChevronLeft, TrendingUp, DollarSign, Package, Shield, ShieldAlert, Star, Trophy, Clock, CheckCircle2 } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useVouchCount } from '../../hooks/useVouchCount';
import { useScamReports } from '../../hooks/useScamReports';
import { db } from '../../db';

export default function VendorAnalytics({ identity, setView }) {
  const dms = useChatStore(s => s.dms);
  const profiles = useChatStore(s => s.profiles);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    btcVolume: 0,
    xmrVolume: 0,
    recentOrders: [],
    topProducts: {}
  });
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('all');
  
  const { vouchCount, tier } = useVouchCount({ identity, targetPubkey: identity?.pk });
  const { reportCount } = useScamReports({ identity, targetPubkey: identity?.pk });

  useEffect(() => {
    const computeStats = async () => {
      try {
        const allMsgs = await db.messages.toArray();
        
        // Filter completed orders where I was the vendor (peer is not me in the message)
        const now = Math.floor(Date.now() / 1000);
        const filterCutoff = timeFilter === 'today' ? now - 86400
                          : timeFilter === 'week' ? now - 604800
                          : timeFilter === 'month' ? now - 2592000
                          : 0;

        const completedOrders = allMsgs.filter(m => 
          m.data?.type === 'cipher_order' && 
          m.data?.status === 'completed' &&
          m.timestamp >= filterCutoff
        );

        // Total sales
        const totalSales = completedOrders.length;
        
        // Total revenue
        let totalRevenue = 0, btcVolume = 0, xmrVolume = 0;
        completedOrders.forEach(o => {
          totalRevenue += parseFloat(o.data.amountFiat || 0);
          const cryptoAmt = parseFloat(o.data.amountCrypto || 0);
          if (o.data.currency === 'btc') btcVolume += cryptoAmt;
          if (o.data.currency === 'xmr') xmrVolume += cryptoAmt;
        });

        // Recent orders (last 10)
        const recentOrders = completedOrders
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 10);

        // Top products
        const topProducts = {};
        completedOrders.forEach(o => {
          const name = o.data.productName || 'Unknown';
          topProducts[name] = (topProducts[name] || 0) + 1;
        });

        setStats({ totalSales, totalRevenue, btcVolume, xmrVolume, recentOrders, topProducts });
      } catch (e) {
        console.error('Failed to compute vendor stats:', e);
      } finally {
        setLoading(false);
      }
    };
    computeStats();
  }, [dms, timeFilter]);

  const tierData = {
    elite: { label: 'Elite Vendor', icon: <Trophy size={20} />, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
    trusted: { label: 'Trusted Vendor', icon: <Shield size={20} />, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
    new: { label: 'New Vendor', icon: <Star size={20} />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' }
  }[tier];

  const topProductsList = Object.entries(stats.topProducts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] pb-8">
      {/* Header */}
      <div className="p-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => setView('main')} className="p-2 -ml-2 text-white/60 hover:text-white">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-xl font-bold text-white">Vendor Dashboard</h2>
        </div>
        <div className="flex gap-1 bg-[#0a0a0a] p-1 rounded-xl">
          {[
            { key: 'today', label: 'Today' },
            { key: 'week', label: '7 Days' },
            { key: 'month', label: '30 Days' },
            { key: 'all', label: 'All Time' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setTimeFilter(f.key)}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${timeFilter === f.key ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Tier Banner */}
        <div className={`p-4 rounded-2xl border ${tierData.bg} flex items-center gap-3`}>
          <div className={`${tierData.color}`}>{tierData.icon}</div>
          <div className="flex-1">
            <p className={`text-sm font-bold ${tierData.color}`}>{tierData.label}</p>
            <p className="text-[11px] text-white/50">{vouchCount} vouch{vouchCount !== 1 ? 'es' : ''} • {reportCount} report{reportCount !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Stat Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#111] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-green-400 mb-2"><DollarSign size={14} /><p className="text-[10px] font-bold uppercase tracking-wider">Revenue</p></div>
            <p className="text-2xl font-bold text-white">${stats.totalRevenue.toFixed(0)}</p>
            <p className="text-[10px] text-white/40 mt-1">All-time USD</p>
          </div>
          <div className="bg-[#111] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-blue-400 mb-2"><Package size={14} /><p className="text-[10px] font-bold uppercase tracking-wider">Sales</p></div>
            <p className="text-2xl font-bold text-white">{stats.totalSales}</p>
            <p className="text-[10px] text-white/40 mt-1">Completed orders</p>
          </div>
        </div>

        {/* Crypto Volume */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-3">Crypto Volume</p>
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-white/50 mb-1">Bitcoin</p>
              <p className="text-sm font-mono text-orange-400">{stats.btcVolume.toFixed(6)} BTC</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/50 mb-1">Monero</p>
              <p className="text-sm font-mono text-orange-400">{stats.xmrVolume.toFixed(4)} XMR</p>
            </div>
          </div>
        </div>

        {/* Trust Breakdown */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-3">Reputation</p>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-green-400"><Shield size={14} /><span className="text-xs">Vouches</span></div>
            <span className="text-sm font-bold text-white">{vouchCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-400"><ShieldAlert size={14} /><span className="text-xs">Scam Reports</span></div>
            <span className="text-sm font-bold text-white">{reportCount}</span>
          </div>
        </div>

        {/* Top Products */}
        {topProductsList.length > 0 && (
          <div className="bg-[#111] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-white/40 mb-3">
              <TrendingUp size={14} />
              <p className="text-[10px] font-bold uppercase tracking-wider">Top Products</p>
            </div>
            <div className="space-y-2">
              {topProductsList.map(([name, count], i) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-white/30 w-4">#{i + 1}</span>
                    <p className="text-xs text-white/80 truncate">{name}</p>
                  </div>
                  <span className="text-xs font-bold text-white/60 shrink-0">{count} sold</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Orders */}
        {stats.recentOrders.length > 0 && (
          <div className="bg-[#111] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-white/40 mb-3">
              <Clock size={14} />
              <p className="text-[10px] font-bold uppercase tracking-wider">Recent Orders</p>
            </div>
            <div className="space-y-2">
              {stats.recentOrders.map(o => (
                <div key={o.id} className="flex items-center gap-3 p-2 bg-[#0a0a0a] rounded-lg">
                  <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{o.data.productName || 'Product'}</p>
                    <p className="text-[10px] text-white/40">{new Date(o.timestamp * 1000).toLocaleDateString()}</p>
                  </div>
                  <p className="text-xs text-green-400 font-mono shrink-0">${o.data.amountFiat}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {stats.totalSales === 0 && !loading && (
          <div className="text-center text-white/40 py-12">
            <TrendingUp size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm mb-1">No sales yet.</p>
            <p className="text-xs text-white/30">Post product cards in groups to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}