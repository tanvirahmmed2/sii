'use client';

import { useState } from 'react';

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
      const res = await fetch('/api/marketing/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, source }),
      });

      const data = res.ok ? await res.json() : { success: false, message: 'Subscription request failed.' };

      if (data.success) {
        if (data.alreadySubscribed) {
          setStatus({
            type: 'info',
            message: data.message || "You're already subscribed! Thanks for staying connected.",
          });
        } else {
          setStatus({
            type: 'success',
            message: data.message || 'Thank you for subscribing! Check your inbox soon.',
          });
          setEmail('');
        }
      } else {
        setStatus({
          type: 'error',
          message: data.error || 'Something went wrong. Please try again.',
        });
      }
    } catch (_) {
      setStatus({
        type: 'error',
        message: 'Network connection error. Please try again later.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-1.5 py-0.5 rounded">
            Newsletter
          </span>
          <h4 className="text-sm sm:text-base font-semibold text-white tracking-tight">
            Stay Updated
          </h4>
        </div>
        <p className="text-xs text-slate-300 dark:text-slate-400 leading-relaxed font-normal">
          Get creator insights, new theme drops, and product release updates right to your inbox.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex flex-col sm:flex-row items-stretch gap-2">
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
            className="flex-1 px-3 py-2 rounded bg-slate-950/80 border border-slate-700 text-white placeholder-slate-400 text-xs font-normal focus:outline-none focus:border-slate-400 transition-colors"
          />

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded bg-white hover:bg-slate-100 text-slate-900 text-xs font-semibold transition-colors disabled:opacity-60 cursor-pointer shrink-0"
          >
            {loading ? 'Joining...' : 'Join Free →'}
          </button>
        </div>

        {/* Feedback Alerts */}
        {status.message && (
          <div
            role="alert"
            className={`p-2.5 rounded text-xs flex items-start gap-2 border font-medium ${
              status.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                : status.type === 'info'
                ? 'bg-sky-950/40 border-sky-800 text-sky-200'
                : 'bg-rose-950/40 border-rose-800 text-rose-200'
            }`}
          >
            <span className="text-[10px] uppercase font-semibold px-1 py-0.2 rounded bg-white/10 shrink-0">
              {status.type === 'success' ? 'Success' : status.type === 'info' ? 'Info' : 'Alert'}
            </span>
            <span className="leading-snug">{status.message}</span>
          </div>
        )}

        <p className="text-[11px] text-slate-400 font-normal">
          No spam, ever. Unsubscribe anytime with a single click.
        </p>
      </form>
    </div>
  );
}
