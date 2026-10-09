'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { toast } from 'react-hot-toast';

export default function WebsiteSettingsPage() {
  const { website, getApiEndpoint, fetchWebsiteSettings } = useTenantWebsite();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'contact' | 'mission' | 'social' | 'branding' | 'system'

  // General Fields
  const [name, setName] = useState('');
  const [institutionType, setInstitutionType] = useState('School');
  const [eiinNumber, setEiinNumber] = useState('');
  const [logo, setLogo] = useState('');
  const [favicon, setFavicon] = useState('');

  // Contact Fields
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [address, setAddress] = useState('');
  const [mapUrl, setMapUrl] = useState('');

  // Mission / Identity Fields
  const [motto, setMotto] = useState('');
  const [mission, setMission] = useState('');
  const [vision, setVision] = useState('');
  const [history, setHistory] = useState('');

  // Social Links
  const [facebookUrl, setFacebookUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');

  // Branding / Theme
  const [theme, setTheme] = useState('default');
  const [primaryColor, setPrimaryColor] = useState('#1e40af');
  const [secondaryColor, setSecondaryColor] = useState('#0ea5e9');

  // System
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  // Fetch website settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch(getApiEndpoint('staff/settings'));
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load website settings.');
      }

      const s = data.payload?.settings || data.paylod?.settings || data.settings || {};

      setName(s.name || website?.name || '');
      setInstitutionType(s.institution_type || website?.institution_type || 'School');
      setEiinNumber(s.eiin_number || website?.eiin_number || '');
      setLogo(s.logo || website?.logo || '');
      setFavicon(s.favicon || website?.favicon || '');

      setContactPhone(s.contact_phone || '');
      setContactEmail(s.contact_email || '');
      setAddress(s.address || '');
      setMapUrl(s.map_url || '');

      setMotto(s.motto || '');
      setMission(s.mission || '');
      setVision(s.vision || '');
      setHistory(s.history || '');

      setFacebookUrl(s.facebook_url || '');
      setTwitterUrl(s.twitter_url || '');
      setInstagramUrl(s.instagram_url || '');
      setYoutubeUrl(s.youtube_url || '');

      setTheme(s.theme || 'default');
      setPrimaryColor(s.primary_color || '#1e40af');
      setSecondaryColor(s.secondary_color || '#0ea5e9');

      setIsMaintenanceMode(Boolean(s.is_maintenance_mode));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();

    if (!name.trim()) {
      toast.error('Institution name is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        institution_type: institutionType.trim(),
        eiin_number: eiinNumber.trim() || null,
        logo: logo.trim() || null,
        favicon: favicon.trim() || null,
        contact_phone: contactPhone.trim() || null,
        contact_email: contactEmail.trim() || null,
        address: address.trim() || null,
        map_url: mapUrl.trim() || null,
        motto: motto.trim() || null,
        mission: mission.trim() || null,
        vision: vision.trim() || null,
        history: history.trim() || null,
        facebook_url: facebookUrl.trim() || null,
        twitter_url: twitterUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        youtube_url: youtubeUrl.trim() || null,
        theme: theme.trim() || 'default',
        primary_color: primaryColor.trim() || '#1e40af',
        secondary_color: secondaryColor.trim() || '#0ea5e9',
        is_maintenance_mode: Boolean(isMaintenanceMode),
      };

      const res = await fetch(getApiEndpoint('staff/settings'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update website settings.');
      }

      toast.success(data.message || 'Website settings updated successfully!');
      if (typeof fetchWebsiteSettings === 'function') {
        fetchWebsiteSettings();
      }
      fetchSettings();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-6 h-6 border-2 border-slate-300 dark:border-slate-700 border-t-primary rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 dark:text-slate-400">Loading campus website settings...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Website Information &amp; Campus Settings
            </h1>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              Institutional Master Control
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure all public institutional metadata, branding, campus contact information, philosophy, and system modes.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={submitting}
            className="px-5 py-2 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition cursor-pointer disabled:opacity-60 shadow-xs"
          >
            {submitting ? 'Updating Website...' : 'Save All Settings'}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-0 overflow-x-auto text-xs font-medium">
        {[
          { key: 'general', label: 'General & Identity' },
          { key: 'contact', label: 'Contact & Location' },
          { key: 'mission', label: 'Mission, Vision & History' },
          { key: 'social', label: 'Social Channels' },
          { key: 'branding', label: 'Appearance & Branding' },
          { key: 'system', label: 'System & Maintenance' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-3.5 py-2.5 rounded-t text-xs font-medium transition cursor-pointer border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-semibold bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 sm:p-6 shadow-2xs space-y-6">

        {/* TAB 1: General & Identity */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                General Institution Identification
              </h2>
              <p className="text-[11px] text-slate-500">Core organizational names, accreditation codes, and primary insignia.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Institution Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Oxford Academy of Sciences"
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Institution Type *
                </label>
                <select
                  value={institutionType}
                  onChange={(e) => setInstitutionType(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer"
                >
                  <option value="School">School</option>
                  <option value="High School">High School</option>
                  <option value="College">College</option>
                  <option value="Madrasah">Madrasah</option>
                  <option value="Academy">Academy</option>
                  <option value="University">University</option>
                  <option value="Polytechnic Institute">Polytechnic Institute</option>
                  <option value="Training Center">Training Center</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  EIIN / Registration Code
                </label>
                <input
                  type="text"
                  value={eiinNumber}
                  onChange={(e) => setEiinNumber(e.target.value)}
                  placeholder="e.g. 132456"
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Logo Image URL
                </label>
                <input
                  type="url"
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
                  placeholder="https://.../logo.png"
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Favicon Image URL
                </label>
                <input
                  type="url"
                  value={favicon}
                  onChange={(e) => setFavicon(e.target.value)}
                  placeholder="https://.../favicon.ico"
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Contact & Location */}
        {activeTab === 'contact' && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Contact &amp; Physical Location Details
              </h2>
              <p className="text-[11px] text-slate-500">Official campus channels accessible to students, guardians, and visitors.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Primary Contact Phone
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+1 (800) 555-0199"
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Primary Contact Email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="info@institution.edu"
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Physical Campus Address
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Plot 42, Academic Boulevard, University Town, City, Country"
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary text-xs resize-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Google Maps Embed URL
                </label>
                <input
                  type="url"
                  value={mapUrl}
                  onChange={(e) => setMapUrl(e.target.value)}
                  placeholder="https://maps.google.com/maps?q=..."
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Mission, Vision & History */}
        {activeTab === 'mission' && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Institutional Mission, Vision &amp; History
              </h2>
              <p className="text-[11px] text-slate-500">Core philosophical values, institutional aspirations, and heritage chronicles.</p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Motto / Tagline
                </label>
                <input
                  type="text"
                  value={motto}
                  onChange={(e) => setMotto(e.target.value)}
                  placeholder="e.g. Illuminating Minds, Shaping Leaders"
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Mission Statement
                </label>
                <textarea
                  rows={3}
                  value={mission}
                  onChange={(e) => setMission(e.target.value)}
                  placeholder="Our mission is to foster intellectual curiosity, character, and scholastic excellence..."
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Vision Statement
                </label>
                <textarea
                  rows={3}
                  value={vision}
                  onChange={(e) => setVision(e.target.value)}
                  placeholder="To be a globally recognized center of learning that transforms youth into ethical global citizens..."
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Institutional Heritage &amp; History
                </label>
                <textarea
                  rows={4}
                  value={history}
                  onChange={(e) => setHistory(e.target.value)}
                  placeholder="Founded in 1985 by visionary educators, our institution started with 50 students and has grown into..."
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Social Channels */}
        {activeTab === 'social' && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Social Media Channels
              </h2>
              <p className="text-[11px] text-slate-500">Public profile links shown in footer and header navigation.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Facebook Page URL
                </label>
                <input
                  type="url"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/..."
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Twitter / X Profile URL
                </label>
                <input
                  type="url"
                  value={twitterUrl}
                  onChange={(e) => setTwitterUrl(e.target.value)}
                  placeholder="https://x.com/..."
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Instagram Profile URL
                </label>
                <input
                  type="url"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  YouTube Channel URL
                </label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/@..."
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Appearance & Branding */}
        {activeTab === 'branding' && (
          <div className="space-y-5">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Brand Appearance &amp; Color Scheme
              </h2>
              <p className="text-[11px] text-slate-500">Configure visual themes and brand color accents used throughout the site.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Theme Preset
                </label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary cursor-pointer"
                >
                  <option value="default">Default Academic</option>
                  <option value="modern">Modern Sleek</option>
                  <option value="classic">Classic Ivy</option>
                  <option value="minimal">Minimal Slate</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Primary Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-9 h-9 p-0.5 rounded border border-slate-200 dark:border-slate-800 cursor-pointer bg-white dark:bg-slate-900"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#1e40af"
                    className="flex-1 px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Secondary Highlight Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-9 h-9 p-0.5 rounded border border-slate-200 dark:border-slate-800 cursor-pointer bg-white dark:bg-slate-900"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    placeholder="#0ea5e9"
                    className="flex-1 px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Color Presets */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-semibold uppercase text-slate-400 block">Recommended Palette Presets</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'Royal Navy', pri: '#1e40af', sec: '#0ea5e9' },
                  { name: 'Emerald Scholar', pri: '#047857', sec: '#10b981' },
                  { name: 'Crimson Heritage', pri: '#b91c1c', sec: '#f87171' },
                  { name: 'Indigo Modern', pri: '#4338ca', sec: '#818cf8' },
                  { name: 'Deep Amethyst', pri: '#6d28d9', sec: '#a78bfa' },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setPrimaryColor(preset.pri);
                      setSecondaryColor(preset.sec);
                    }}
                    className="px-2.5 py-1 rounded text-[11px] border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.pri }}></span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: System & Maintenance */}
        {activeTab === 'system' && (
          <div className="space-y-5">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Operations &amp; Maintenance Mode
              </h2>
              <p className="text-[11px] text-slate-500">Control system availability and maintenance screens for visitors.</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                  Campus Maintenance Mode
                </span>
                <p className="text-[11px] text-slate-500 max-w-lg leading-relaxed">
                  When enabled, all public web pages display a temporary maintenance notice. Staff and administrator panels remain accessible.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={isMaintenanceMode}
                  onChange={(e) => setIsMaintenanceMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>

            {isMaintenanceMode && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded text-xs text-amber-800 dark:text-amber-300">
                Notice: Maintenance mode is currently active. Public visitors will not be able to browse admissions, news, or courses.
              </div>
            )}
          </div>
        )}

        {/* Bottom Save Bar */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <Link
            href="/staff-panel"
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            ← Return to Dashboard
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition cursor-pointer disabled:opacity-60 shadow-xs"
          >
            {submitting ? 'Updating Website...' : 'Save All Settings Changes →'}
          </button>
        </div>

      </form>

    </div>
  );
}
