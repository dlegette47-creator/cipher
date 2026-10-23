import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReactQRCode } from '@lglab/react-qr-code';
import { X, Copy, CheckCircle2, ShieldCheck, DollarSign } from 'lucide-react';

const usePriceOracle = () => {
  const [prices, setPrices] = useState({ btc: 65000, xmr: 150 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,monero&vs_currencies=usd');
        const data = await res.json();
        setPrices({ btc: data.bitcoin.usd, xmr: data.monero.usd });
      } catch (err) {
        console.error("Price oracle failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPrices();
  }, []);

  return { prices, loading };
};

export default function OneTapCheckout({ isOpen, onClose, product, vendor, identity, onConfirmOrder }) {
  const { prices, loading } = usePriceOracle();
  const [selectedCurrency, setSelectedCurrency] = useState('btc');
  const [copied, setCopied] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');

  if (!isOpen || !product) return null;

  const usdPrice = product?.priceUsd || 29.99;
  const btcAmount = prices.btc > 0 ? (usdPrice / prices.btc).toFixed(8) : '0.00000000';
  const xmrAmount = prices.xmr > 0 ? (usdPrice / prices.xmr).toFixed(6) : '0.000000';

  const currentAddress = selectedCurrency === 'btc' ? (vendor?.btcAddress || 'bc1q...') : (vendor?.xmrAddress || '4...');
  const currentAmount = selectedCurrency === 'btc' ? btcAmount : xmrAmount;

  const paymentUri = selectedCurrency === 'btc'
    ? `bitcoin:${currentAddress}?amount=${currentAmount}&label=${encodeURIComponent(product.name)}&message=Order%20from%20Cipher`
    : `monero:${currentAddress}?tx_amount=${currentAmount}&tx_description=${encodeURIComponent(product.name)}`;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(currentAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // THIS IS THE FIX: We explicitly build the payload here before passing it up
  const handleConfirmPayment = () => {
    onConfirmOrder({
      productId: product?.id || 'unknown',
      productName: product?.name || 'Test Product',
      amountFiat: usdPrice,
      amountCrypto: currentAmount,
      currency: selectedCurrency,
      vendorPubkey: vendor?.pubkey || identity?.pk || '',
      shippingAddress: shippingAddress,
      paymentAddress: currentAddress,
      shippingAddress: shippingAddress,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]" />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-white/10 rounded-t-3xl z-[101] h-[90vh] max-h-[90vh] flex flex-col">
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-3 mb-2" />
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
              <div className="flex justify-between items-start mb-3 sm:mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{product.name}</h2>
                  <p className="text-white/60 text-sm flex items-center gap-1"><ShieldCheck size={14} className="text-green-400" /> Secure Checkout</p>
                </div>
                <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/60 hover:text-white"><X size={20} /></button>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white/60 text-sm">Total Price</span>
                  <span className="text-white font-bold text-lg flex items-center"><DollarSign size={16} className="text-white/60" /> {usdPrice.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/40">Crypto Equivalent</span>
                  <span className="text-white/80 font-mono">{loading ? "Calculating..." : selectedCurrency === 'btc' ? `${btcAmount} BTC` : `${xmrAmount} XMR`}</span>
                </div>
              </div>

              <div className="flex gap-2 mb-3 sm:mb-6">
                <button onClick={() => setSelectedCurrency('btc')} className={`flex-1 py-3 rounded-xl border font-semibold text-sm transition-all ${selectedCurrency === 'btc' ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-white/5 border-white/10 text-white/60'}`}>Pay with BTC</button>
                <button onClick={() => setSelectedCurrency('xmr')} className={`flex-1 py-3 rounded-xl border font-semibold text-sm transition-all ${selectedCurrency === 'xmr' ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-white/5 border-white/10 text-white/60'}`}>Pay with XMR</button>
              </div>

              <div className="flex flex-col items-center justify-center bg-white p-4 sm:p-6 rounded-2xl mb-3 sm:mb-6">
                {loading ? <div className="w-48 h-48 flex items-center justify-center text-black/50">Loading price...</div> : <ReactQRCode value={paymentUri} size={160} />}
                <p className="text-black/50 text-xs mt-4 text-center max-w-[200px] break-all">Scan with your wallet app</p>
              </div>

              <div className="flex items-center gap-2 mb-6">
                <div className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 overflow-hidden">
                  <p className="text-white/40 text-xs mb-1">Vendor Address</p>
                  <p className="text-white text-sm font-mono truncate">{currentAddress}</p>
                </div>
                <button onClick={handleCopyAddress} className="p-3 bg-white/10 rounded-xl text-white/80 hover:bg-white/20 transition-colors">{copied ? <CheckCircle2 size={20} className="text-green-400" /> : <Copy size={20} />}</button>
              </div>

              <div className="mb-4">
                <label className="block text-xs text-white/60 mb-1">Shipping Address / Delivery Details</label>
                <textarea 
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Enter your address or pickup details..."
                  rows={2}
                  style={{ width: '100%', minHeight: '60px' }}
                  className="bg-black border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-green-500 resize-none box-border"
                />
              </div>

              <button disabled={!shippingAddress.trim()} onClick={handleConfirmPayment} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2">
                I've Sent the Payment
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
