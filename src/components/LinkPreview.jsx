import React, { useState } from 'react';
import { ExternalLink, Globe } from 'lucide-react';

export default function LinkPreview({ url }) {
  const [loaded, setLoaded] = useState(false);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch only when user explicitly taps
  const fetchMeta = async () => {
    setLoading(true);
    try {
      const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data.status === 'success' && data.data.title) {
        setMeta(data.data);
      }
    } catch (err) {}
    setLoading(false);
    setLoaded(true);
  };

  // Not loaded yet → show tappable placeholder
  if (!loaded) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); fetchMeta(); }}
        className="flex items-center gap-2 mt-1 mb-1 bg-black/30 hover:bg-black/40 transition-colors rounded-lg px-3 py-2 border border-white/10 max-w-[280px]"
      >
        <Globe size={14} className="text-white/50 shrink-0" />
        <span className="text-xs text-white/60 truncate">Tap to load preview</span>
      </button>
    );
  }

  if (loading) {
    return (
      <div className="animate-pulse bg-black/20 rounded-lg p-2 mt-1 mb-1 w-full max-w-[280px]">
        <div className="h-20 bg-white/5 rounded-md mb-2"></div>
        <div className="h-3 bg-white/5 rounded w-3/4"></div>
      </div>
    );
  }

  if (!meta) return null;

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noreferrer"
      onClick={e => e.stopPropagation()}
      className="block mt-1 mb-1 bg-black/30 hover:bg-black/40 transition-colors rounded-lg overflow-hidden border border-white/10 w-full max-w-[280px]"
    >
      {meta.image?.url && (
        <img src={meta.image.url} alt="preview" className="w-full h-32 object-cover" />
      )}
      <div className="p-2">
        <p className="text-xs font-semibold text-white/90 truncate">{meta.title}</p>
        {meta.description && (
          <p className="text-[10px] text-white/50 line-clamp-2 mt-0.5">{meta.description}</p>
        )}
        <p className="text-[9px] text-blue-400 mt-1 flex items-center gap-1">
          <ExternalLink size={8} /> {new URL(url).hostname}
        </p>
      </div>
    </a>
  );
}
