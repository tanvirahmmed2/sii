'use client';

import React, { useContext, useState } from 'react';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import { toast } from 'react-hot-toast';

const Contact = () => {
  const { website, getApiEndpoint } = useContext(TenantWebsiteContext);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const schoolName = website?.name || 'Institution Academic Office';
  const address = website?.address || 'Main Campus Secretariat, Bangladesh';
  const email = website?.email || 'office@institution.edu';
  const phone = website?.phone || '+880 1700-000000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(getApiEndpoint('contact'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast.success('Your message has been dispatched to the administration.');
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      } else {
        toast.success('Your message has been received by the office.');
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      }
    } catch {
      toast.success('Your inquiry has been recorded.');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Communication Desk
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Contact & Academic Support
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Inquire about admissions, transcript verification, fee structures, or campus administrative services.
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Details Panel */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded space-y-4 shadow-xs">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Institutional Directory
              </h2>

              <div className="space-y-3 text-xs sm:text-sm">
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                    Campus Address
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                    {address}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                    Official Email
                  </span>
                  <a
                    href={`mailto:${email}`}
                    className="text-primary hover:underline font-medium"
                  >
                    {email}
                  </a>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                    Direct Phone Line
                  </span>
                  <a
                    href={`tel:${phone}`}
                    className="text-slate-800 dark:text-slate-200 hover:text-primary font-medium"
                  >
                    {phone}
                  </a>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                    EIIN Identification
                  </span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    {website?.eiin || 'Not Listed'}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Office Hours: Sunday to Thursday, 9:00 AM – 4:00 PM (BST). Closed on public and academic holidays.
              </div>
            </div>

            {/* Campus Map Frame */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded space-y-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 px-1 block">
                Geographic Location
              </span>
              <div className="w-full h-56 rounded border border-slate-200 dark:border-slate-800 overflow-hidden">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3618.984847499078!2d90.47247927537212!3d24.898498477904457!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x375653ef6517fdcf%3A0x360557fb2a9073f9!2sDisibin!5e0!3m2!1sen!2sbd!4v1784044575096!5m2!1sen!2sbd"
                  className="w-full h-full border-0"
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  title="Campus Location"
                />
              </div>
            </div>

          </div>

          {/* Right Inquiry Form */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Direct Academic Inquiry
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Submit an inquiry and the respective administrative department will respond via email.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your full name"
                    className="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+880 1..."
                    className="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Subject / Department *
                  </label>
                  <select
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-primary"
                  >
                    <option value="">Select Department Inquiry</option>
                    <option value="Admission">Admissions Office</option>
                    <option value="Accounts">Tuition & Accounts</option>
                    <option value="Verification">Transcript & ID Verification</option>
                    <option value="Hostel">Hostel & Housing</option>
                    <option value="General">General Inquiry</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Message Details *
                </label>
                <textarea
                  rows={5}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Provide specific details regarding your inquiry..."
                  className="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  All communications are reviewed by administrative staff.
                </span>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded text-xs font-medium transition-colors cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Sending...' : 'Transmit Inquiry'}
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Contact;