'use client';

import React, { useEffect, useState } from 'react';
import { FiMail, FiPhone, FiMapPin } from 'react-icons/fi';
import { SCHOOL_NAME } from '@/lib/secret';

const Contact = () => {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    fetch('/api/website-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data?.paylod?.settings) {
          setSettings(data.paylod.settings);
        } else if (data?.settings) {
          setSettings(data.settings);
        }
      })
      .catch((err) => console.error('Error loading website settings for contact page:', err));
  }, []);

  const schoolName = settings?.school_name || SCHOOL_NAME || 'School Academic Office';
  const address = settings?.address || 'West Campus Road, Section 4, Dhaka, Bangladesh';
  const email = settings?.contact_email || 'support@fontana-edu.org';
  const phone = settings?.contact_phone || '+880 1234 56789';

  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 mt-3 tracking-tight">
            Contact Academic Office
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl mx-auto text-sm md:text-base">
            Reach out for admission questions, transcript verification queries, and general campus support details.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          <div className="md:col-span-5 bg-white border border-slate-100 p-6 rounded-3xl shadow-xs flex flex-col gap-6">
            <h3 className="font-semibold text-slate-900 text-base">{schoolName} Campus Address</h3>
            
            <div className="flex flex-col gap-4">
              <div className="flex gap-3 items-start">
                <FiMapPin className="text-theme text-base shrink-0 mt-0.5" />
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                  {address}
                </p>
              </div>

              {email && (
                <div className="flex gap-3 items-center">
                  <FiMail className="text-theme text-base shrink-0" />
                  <a href={`mailto:${email}`} className="text-slate-600 hover:text-theme text-xs sm:text-sm transition-colors">
                    {email}
                  </a>
                </div>
              )}

              {phone && (
                <div className="flex gap-3 items-center">
                  <FiPhone className="text-theme text-base shrink-0" />
                  <a href={`tel:${phone}`} className="text-slate-600 hover:text-theme text-xs sm:text-sm transition-colors">
                    {phone}
                  </a>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
              Office Hours: <br />
              Sunday - Thursday (9:00 AM - 5:00 PM)
            </div>
          </div>

          {/* Map Side */}
          <div className="md:col-span-7 bg-white border border-slate-100 p-6 rounded-3xl shadow-xs flex flex-col gap-4">
            <h3 className="font-semibold text-slate-900 text-base mb-2">Our Location</h3>
            <div className="w-full overflow-hidden rounded-2xl border border-slate-100">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3618.984847499078!2d90.47247927537212!3d24.898498477904457!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x375653ef6517fdcf%3A0x360557fb2a9073f9!2sDisibin!5e0!3m2!1sen!2sbd!4v1784044575096!5m2!1sen!2sbd"
                className="w-full h-90 md:h-100 border-0"
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                title="Campus Location Map"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;