import React, { useState } from 'react';
import { X, Star } from 'lucide-react';

export default function ReviewModal({ targetName, onSubmit, onClose }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating < 1) return;
    setSubmitting(true);
    const ok = await onSubmit(rating, text.trim());
    setSubmitting(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white dark:bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#111] border border-gray-300 dark:border-gray-800 rounded-3xl w-full max-w-sm p-6 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-black dark:text-white/50 hover:text-black dark:text-white"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-black dark:text-white mb-1">Rate {targetName}</h2>
        <p className="text-sm text-black dark:text-white/50 mb-4">
          Your review is published to the Nostr network. Vendors can't delete it.
        </p>

        {/* Star picker */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="transition-transform hover:scale-110 active:scale-95"
            >
              <Star
                size={36}
                className={
                  n <= (hover || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-black dark:text-white/20'
                }
              />
            </button>
          ))}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="How was your experience? (optional)"
          maxLength={500}
          rows={4}
          className="w-full bg-white dark:bg-black border border-gray-300 dark:border-gray-800 rounded-xl p-3 text-sm text-black dark:text-white placeholder-white/30 focus:border-white/30 outline-none resize-none mb-2"
        />
        <p className="text-[10px] text-black dark:text-white/30 text-right mb-4">
          {text.length}/500
        </p>

        <button
          onClick={handleSubmit}
          disabled={rating < 1 || submitting}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-black dark:text-white font-bold py-3 rounded-xl transition-colors"
        >
          {submitting ? 'Publishing...' : rating < 1 ? 'Select a rating' : 'Publish Review'}
        </button>
      </div>
    </div>
  );
}
