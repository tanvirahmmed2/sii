'use client';

import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-hot-toast';
import { FiSave, FiSettings, FiMail, FiPhone, FiMapPin, FiGlobe, FiImage } from 'react-icons/fi';
import { Context } from '@/component/helper/Context';
import TiptapEditor from '@/component/helper/TiptapEditor';

const SettingsPage = () => {
  const context = useContext(Context);
  const [settings, setSettings] = useState({
    school_name: '',
    motto: '',
    map_url: '',
    mission: '',
    vission: '',
    history: '',
    contact_phone: '',
    contact_email: '',
    address: '',
    facebook_url: '',
    twitter_url: '',
    instagram_url: '',
    youtube_url: '',
    meta_title: '',
    meta_description: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/website-settings');
        const data = await res.json();
        const loadedSettings = data.payload?.settings || data.paylod?.settings || data.settings;
        if (data.success && loadedSettings) {
          setSettings(loadedSettings);
        }
      } catch (err) {
        toast.error('Failed to load website settings.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/admin/website-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Website configurations saved successfully!');
        const savedSettings = data.payload?.settings || data.paylod?.settings || data.settings;
        if (savedSettings) {
          setSettings(savedSettings);
        }
      } else {
        throw new Error(data.error || 'Failed to save settings.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-semibold text-slate-400">Loading configurations...</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FiSettings className="text-primary animate-spin-slow" /> Website Settings & About Content
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure institutional identity, motto, mission, vision, map URL, contact info, and social handles using rich text formatting.
        </p>
      </div>

      <form onSubmit={handleSave} className="w-full flex flex-col lg:flex-row gap-6">
        {/* Main Settings Card */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.01)] flex flex-col gap-6">
            
            {/* School / Organization Information */}
            <div className="flex flex-col gap-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                <FiGlobe className="text-primary" /> General Identity & Motto
              </h2>
              
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Institutional Motto</label>
                  <TiptapEditor
                    value={settings.motto || ''}
                    onChange={(val) => setSettings((prev) => ({ ...prev, motto: val }))}
                    placeholder="Enter institutional motto statement..."
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Google Map URL / Embed Link</label>
                  <div className="relative flex items-center">
                    <FiMapPin className="absolute left-3.5 text-slate-400 text-base" />
                    <input
                      type="text"
                      name="map_url"
                      placeholder="https://maps.google.com/..."
                      value={settings.map_url || ''}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* History Section */}
            <div className="flex flex-col gap-4 pt-2">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                <FiGlobe className="text-primary" /> Institutional History & Background (Rich Text)
              </h2>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">History & Heritage</label>
                <TiptapEditor
                  value={settings.history || ''}
                  onChange={(val) => setSettings((prev) => ({ ...prev, history: val }))}
                  placeholder="Enter full institutional history and founding background..."
                />
              </div>
            </div>

            {/* Mission & Vision Section */}
            <div className="flex flex-col gap-4 pt-2">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                <FiGlobe className="text-primary" /> Mission & Vision Content (Rich Text)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Institutional Mission</label>
                  <TiptapEditor
                    value={settings.mission || ''}
                    onChange={(val) => setSettings((prev) => ({ ...prev, mission: val }))}
                    placeholder="Enter institutional mission statement..."
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Institutional Vision</label>
                  <TiptapEditor
                    value={settings.vission || ''}
                    onChange={(val) => setSettings((prev) => ({ ...prev, vission: val }))}
                    placeholder="Enter institutional vision statement..."
                  />
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="flex flex-col gap-4 pt-2">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                <FiPhone className="text-primary" /> Official Contact Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Contact Phone Number</label>
                  <div className="relative flex items-center">
                    <FiPhone className="absolute left-3.5 text-slate-400 text-base" />
                    <input
                      type="text"
                      name="contact_phone"
                      value={settings.contact_phone || ''}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Official Contact Email</label>
                  <div className="relative flex items-center">
                    <FiMail className="absolute left-3.5 text-slate-400 text-base" />
                    <input
                      type="email"
                      name="contact_email"
                      value={settings.contact_email || ''}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Campus Physical Address</label>
                <div className="relative flex items-start">
                  <FiMapPin className="absolute left-3.5 top-3 text-slate-400 text-base" />
                  <textarea
                    name="address"
                    rows={3}
                    value={settings.address || ''}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="flex flex-col gap-4 pt-2">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                <FiGlobe className="text-primary" /> Social Media Links
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Facebook URL</label>
                  <input
                    type="url"
                    name="facebook_url"
                    value={settings.facebook_url || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Twitter URL</label>
                  <input
                    type="url"
                    name="twitter_url"
                    value={settings.twitter_url || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Instagram URL</label>
                  <input
                    type="url"
                    name="instagram_url"
                    value={settings.instagram_url || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">YouTube Channel URL</label>
                  <input
                    type="url"
                    name="youtube_url"
                    value={settings.youtube_url || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
            </div>

          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Saving...
              </>
            ) : (
              <>
                <FiSave className="text-lg" /> Save Configurations
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
