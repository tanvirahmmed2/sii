'use client';

import React, { useContext, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import { toast } from 'react-hot-toast';

const Contact = () => {
  const params = useParams();
  const { website, getApiEndpoint } = useContext(TenantWebsiteContext);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const schoolName = website?.name || 'Institution Academic Office';
  const address = website?.address || 'Main Campus Secretariat, Bangladesh';
  const email = website?.email || 'office@institution.edu';
  const phone = website?.phone || '+880 1700-000000';

  const domain = params?.domain || website?.slug || website?.subdomain || '';
  const apiEndpoint = domain ? `/api/${domain}/contact` : getApiEndpoint('contact');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    const cleanName = formData.name.trim();
    const cleanEmail = formData.email.trim();
    const cleanMessage = formData.message.trim();

    if (!cleanName || !cleanEmail || !cleanMessage) {
      const msg = 'Name, email, and message are required.';
      toast.error(msg);
      setFeedback({ type: 'error', message: msg });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      const msg = 'Please enter a valid email address.';
      toast.error(msg);
      setFeedback({ type: 'error', message: msg });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          phone: formData.phone.trim(),
          subject: formData.subject.trim() || 'General Inquiry',
          message: cleanMessage,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        const successMsg = data.message || 'Thank you! Your message has been received by the administration.';
        toast.success(successMsg);
        setFeedback({ type: 'success', message: successMsg });
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      } else {
        const errorMsg = data.message || data.error || 'Failed to submit your inquiry. Please try again.';
        toast.error(errorMsg);
        setFeedback({ type: 'error', message: errorMsg });
      }
    } catch (err) {
      console.error('Contact form submission error:', err);
      const errMsg = 'Network connection issue. Please check your connection and try again.';
      toast.error(errMsg);
      setFeedback({ type: 'error', message: errMsg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="w-full max-w-6xl mx-auto space-y-8">
        
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="border-b border-slate-200/80 dark:border-slate-800 pb-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              Communication Desk
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-slate-900 dark:text-white tracking-tight">
            Contact & Academic Support
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
            Inquire about admissions, transcript verification, fee structures, or campus administrative services.
          </p>
        </motion.div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Details Panel */}
          <motion.div
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="lg:col-span-5 space-y-6"
          >
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-2xl space-y-5 shadow-xs">
              <h2 className="font-serif text-lg font-semibold text-slate-900 dark:text-white">
                Institutional Directory
              </h2>

              <div className="space-y-4 text-xs sm:text-sm">
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                    Campus Address
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                    {address}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                    Official Email
                  </span>
                  <a
                    href={`mailto:${email}`}
                    className="text-primary hover:text-primary-dark hover:underline font-medium"
                  >
                    {email}
                  </a>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                    Direct Phone Line
                  </span>
                  <a
                    href={`tel:${phone}`}
                    className="text-slate-800 dark:text-slate-200 hover:text-primary font-medium"
                  >
                    {phone}
                  </a>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                    EIIN Identification
                  </span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    {website?.eiin || 'Not Listed'}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Office Hours: Sunday to Thursday, 9:00 AM – 4:00 PM (BST). Closed on public and academic holidays.
              </div>
            </div>

            {/* Campus Map Frame */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl space-y-3 shadow-xs">
              <span className="text-xs font-semibold text-slate-900 dark:text-white px-1 block">
                Geographic Location
              </span>
              <div className="w-full h-56 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
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

          </motion.div>

          {/* Right Inquiry Form */}
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
            className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xs space-y-6"
          >
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">
                Direct Academic Inquiry
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Submit an inquiry and the respective administrative department will respond via email.
              </p>
            </div>

            {feedback && (
              <div
                className={`p-4 text-xs rounded-xl border transition-all ${
                  feedback.type === 'success'
                    ? 'bg-primary/10 border-primary/20 text-slate-800 dark:text-slate-200'
                    : 'bg-secondary/10 border-secondary/20 text-secondary-dark dark:text-secondary-light'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {feedback.type === 'success' ? '✓ Success:' : '⚠ Notice:'}
                    </span>
                    <span>{feedback.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFeedback(null)}
                    className="font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 leading-none cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your full name"
                    className="input-style w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@example.com"
                    className="input-style w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+880 1..."
                    className="input-style w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Subject / Department *
                  </label>
                  <select
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="input-style w-full text-xs"
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
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Message Details *
                </label>
                <textarea
                  rows={5}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Provide specific details regarding your inquiry..."
                  className="input-style w-full text-xs leading-relaxed"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  All communications are reviewed by administrative staff.
                </span>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs sm:text-sm font-medium transition-all shadow-xs hover:shadow-md hover:shadow-primary/20 cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Sending...' : 'Transmit Inquiry'}
                </motion.button>
              </div>
            </form>
          </motion.div>

        </div>

      </div>
    </div>
  );
};

export default Contact;