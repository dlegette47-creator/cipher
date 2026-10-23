import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AudioPlayer({ url }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration || 1;
      setProgress((current / total) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 bg-black/20 rounded-xl p-2 min-w-[200px] mb-1">
      <audio 
        ref={audioRef} 
        src={url} 
        onTimeUpdate={handleTimeUpdate} 
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => { setIsPlaying(false); setProgress(0); }}
        className="hidden"
      />
      <button 
        onClick={togglePlay} 
        className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0 active:scale-95 transition-transform"
      >
        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
      </button>
      
      <div className="flex-1 flex flex-col justify-center">
        {/* Waveform */}
        <div className="flex items-center gap-0.5 h-6 mb-1">
          {Array.from({ length: 24 }).map((_, i) => {
            // Generate a pseudo-random but stable height based on index
            const height = 20 + (Math.sin(i * 1.7) * 30) + 30;
            const isPlayed = (i / 24) * 100 <= progress;
            return (
              <div 
                key={i}
                className={`w-1 rounded-full transition-colors ${isPlayed ? 'bg-blue-400' : 'bg-white/20'}`}
                style={{ height: `${Math.max(10, height)}%` }}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-white/60 font-mono">
          <span>{formatTime(audioRef.current?.currentTime || 0)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}