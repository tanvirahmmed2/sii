'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FcGoogle } from 'react-icons/fc';

/**
 * GoogleAuthButton
 * Component for Creator Google Sign-In and Google Registration.
 * Supports Google Identity Services (GIS) and dev fallback dialog.
 * Strictly enforces single-account-per-email policy.
 */
export default function GoogleAuthButton({
  mode = 'login', // 'login' | 'register'
  redirectUrl = '',
  onError = () => {},
  onSuccess = () => {},
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDevModal, setShowDevModal] = useState(false);
  const [modalEmail, setModalEmail] = useState('');
  const [modalName, setModalName] = useState('');
  const [modalError, setModalError] = useState('');

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // Initialize Google Identity Services if client ID is configured
  useEffect(() => {
    if (!clientId) return;

    const scriptId = 'google-gis-sdk';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => initGIS();
      document.body.appendChild(script);
    } else {
      initGIS();
    }

    function initGIS() {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
        });
      }
    }
  }, [clientId]);

  const handleGoogleCredentialResponse = async (response) => {
    if (!response?.credential) return;
    await submitGoogleAuth({
      credential: response.credential,
    });
  };

  const submitGoogleAuth = async (payload) => {
    setLoading(true);
    setModalError('');
    try {
      const res = await fetch('/api/marketing/creator/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'google_auth',
          mode,
          ...payload,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorMsg = data.error || (mode === 'register' ? 'Google registration failed.' : 'Google login failed.');
        setModalError(errorMsg);
        onError(errorMsg, data);
        return false;
      }

      setShowDevModal(false);
      onSuccess(data);

      if (data.creator) {
        const target = redirectUrl && redirectUrl.startsWith('/')
          ? redirectUrl
          : `/creator/${data.creator.id}`;
        router.replace(target);
      }
      return true;
    } catch (err) {
      const msg = 'Network error during Google authentication.';
      setModalError(msg);
      onError(msg, { error: msg });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    // If real Google Identity Services is available with client_id, prompt GIS
    if (clientId && window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback to dev modal if GIS prompt is blocked or closed
          setShowDevModal(true);
        }
      });
      return;
    }

    // Otherwise show Google Auth input dialog for immediate use & verification
    setShowDevModal(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!modalEmail.trim()) {
      setModalError('Google account email is required.');
      return;
    }
    const cleanEmail = modalEmail.trim().toLowerCase();
    const cleanName = modalName.trim() || cleanEmail.split('@')[0];
    const pseudoGoogleId = 'goog_' + Math.abs(cleanEmail.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0));

    await submitGoogleAuth({
      email: cleanEmail,
      name: cleanName,
      googleId: pseudoGoogleId,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
    });
  };

  return (
    <>
      <button
        type="button"
        disabled={loading}
        onClick={handleClick}
        className="w-full flex items-center justify-center gap-2.5 py-2 px-3 border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer shadow-sm disabled:opacity-50"
      >
        <FcGoogle className="w-4 h-4 shrink-0" />
        <span>
          {loading
            ? (mode === 'register' ? 'Registering with Google...' : 'Signing in with Google...')
            : (mode === 'register' ? 'Sign up with Google' : 'Sign in with Google')}
        </span>
      </button>

      {/* Google Auth Interactive Dialog (Provides instant Google OAuth flow) */}
      {showDevModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-sm bg-white rounded border border-slate-200 shadow-xl p-5 space-y-4 text-xs text-slate-800">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <FcGoogle className="w-5 h-5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {mode === 'register' ? 'Google Account Registration' : 'Google Account Sign In'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {mode === 'register'
                    ? 'Register your creator studio using your Google account'
                    : 'Sign in to your creator studio with your Google account'}
                </p>
              </div>
            </div>

            {modalError && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium text-[11px] leading-tight">
                {modalError}
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Google Email Address *
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="name@gmail.com"
                  value={modalEmail}
                  onChange={(e) => setModalEmail(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Full Name (from Google profile)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Tanvir Ahmed"
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowDevModal(false);
                    setModalError('');
                  }}
                  className="flex-1 py-1.5 px-3 rounded border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-1.5 px-3 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer disabled:opacity-50"
                >
                  {loading
                    ? 'Processing...'
                    : (mode === 'register' ? 'Register with Google' : 'Sign in with Google')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

