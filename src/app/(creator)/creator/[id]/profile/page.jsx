'use client';

import { useState, useEffect } from 'react';
import { useCreator } from '../layout';

export default function CreatorProfilePage() {
  const { creator, creatorId, refetch } = useCreator();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');

  const [otpRequired, setOtpRequired] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (creator) {
      setName(creator.name || '');
      setEmail(creator.email || '');
      setPhone(creator.phone || '');
      setCountry(creator.country || '');
      setCity(creator.city || '');
      setAddress(creator.address || '');
    }
  }, [creator]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setErr('');

    try {
      const res = await fetch('/api/marketing/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'update_profile',
          creatorId: Number(creatorId),
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          country: country.trim(),
          city: city.trim(),
          address: address.trim(),
          otpCode: otpRequired ? otpCode.trim() : undefined,
        }),
      });

      const json = await res.json();
      if (json.otpRequired) {
        setOtpRequired(true);
        setMsg(json.message || 'Verification code sent to your email to confirm contact update.');
      } else if (json.success) {
        setOtpRequired(false);
        setOtpCode('');
        setMsg(json.message || 'Profile updated successfully.');
        if (refetch) await refetch();
      } else {
        setErr(json.error || json.message || 'Failed to update profile.');
      }
    } catch {
      setErr('Network error while saving profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-4 text-xs text-slate-800">
      <div className="bg-white border border-slate-200 rounded p-4">
        <h1 className="text-base font-semibold text-slate-900">Creator Profile</h1>
        <p className="text-slate-500 text-xs mt-0.5">
          Manage your account contact information and creator details.
        </p>
      </div>

      {msg && (
        <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
          {msg}
        </div>
      )}
      {err && (
        <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
          {err}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded p-4">
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Modifying email requires OTP verification.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-800"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Modifying phone number requires OTP verification.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Address
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
            />
          </div>

          {otpRequired ? (
            <div className="p-3.5 rounded border border-indigo-200 bg-indigo-50/70 text-indigo-900 space-y-2">
              <p className="font-semibold text-xs">Security Verification Code Required</p>
              <p className="text-[11px] text-slate-600">
                A 6-digit verification code has been dispatched to your email address to confirm updating your contact email or phone number.
              </p>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Enter 6-Digit OTP Code *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-center text-base tracking-widest font-mono font-medium text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving || otpCode.length < 6}
                  className="px-3.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Verifying...' : 'Verify OTP & Save Profile'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpRequired(false);
                    setOtpCode('');
                  }}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-2 flex items-center justify-end border-t border-slate-100">
              <button
                type="submit"
                disabled={saving}
                className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}