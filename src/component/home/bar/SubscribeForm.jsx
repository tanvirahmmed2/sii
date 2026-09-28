'use client';

import { useState } from 'react';
import {
  BiEnvelope,
  BiCheckCircle,
  BiErrorCircle,
  BiLoaderAlt,
  BiRightArrowAlt,
  BiInfoCircle,
} from 'react-icons/bi';

export default function SubscribeForm({ source = 'HOME_FOOTER' }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setStatus({ type: 'error', message: 'Please enter your email address.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setStatus({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const res = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, source }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.alreadySubscribed) {
          setStatus({
            type: 'info',
            message: data.message || "You're already subscribed! Thanks for staying connected.",
          });
        } else {
          setStatus({
            type: 'success',
            message: data.message || '🎉 Thank you for subscribing! Check your inbox soon.',
          });
          setEmail('');
        }
      } else {
        setStatus({
          type: 'error',
          message: data.error || 'Something went wrong. Please try again.',
        });
      }
    } catch (err) {
      setStatus({
        type: 'error',
        message: 'Network connection error. Please try again later.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="space-y-2">
        <h4 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <BiEnvelope className="text-secondary text-xl shrink-0" />
          <span>Stay Updated</span>
        </h4>
        <p className="text-xs text-white/80 leading-relaxed">
          Get creator insights, new theme drops, and product release updates right to your inbox.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-3.5 space-y-2">
        <div className="relative flex items-center">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none text-base">
            <BiEnvelope />
          </div>

          <input
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status.type) setStatus({ type: '', message: '' });
            }}
            placeholder="Enter your work email..."
            aria-label="Email for newsletter subscription"
            className="w-full pl-10 pr-28 py-3 rounded-2xl bg-white/10 dark:bg-black/30 border border-white/20 dark:border-white/15 text-white placeholder-white/50 text-xs font-medium focus:outline-none focus:border-white focus:bg-white/15 dark:focus:bg-black/50 transition-all shadow-inner backdrop-blur-md"
          />

          <button
            type="submit"
            disabled={loading}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
          >
            {loading ? (
              <>
                <BiLoaderAlt className="animate-spin text-sm" />
                <span>Joining...</span>
              </>
            ) : (
              <>
                <span>Join Free</span>
                <BiRightArrowAlt className="text-sm" />
              </>
            )}
          </button>
        </div>

        {/* Feedback Alerts */}
        {status.message && (
          <div
            role="alert"
            className={`p-2.5 rounded-xl text-xs flex items-start gap-2 animate-fade-in transition-all ${
              status.type === 'success'
                ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-100'
                : status.type === 'info'
                ? 'bg-sky-500/20 border border-sky-400/40 text-sky-100'
                : 'bg-rose-500/20 border border-rose-400/40 text-rose-100'
            }`}
          >
            {status.type === 'success' ? (
              <BiCheckCircle className="text-emerald-300 text-base shrink-0 mt-0.5" />
            ) : status.type === 'info' ? (
              <BiInfoCircle className="text-sky-300 text-base shrink-0 mt-0.5" />
            ) : (
              <BiErrorCircle className="text-rose-300 text-base shrink-0 mt-0.5" />
            )}
            <span className="leading-snug">{status.message}</span>
          </div>
        )}

        <p className="text-[11px] text-white/60">
          No spam, ever. Unsubscribe anytime with a single click.
        </p>
      </form>
    </div>
  );
}
