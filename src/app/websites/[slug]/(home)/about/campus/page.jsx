'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FiBookOpen, 
  FiActivity, 
  FiMap, 
  FiArrowLeft, 
  FiArrowRight, 
  FiHeart, 
  FiShield, 
  FiSun,
  FiMapPin
} from 'react-icons/fi';

const CampusPage = () => {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/website-settings');
        if (res.ok) {
          const data = await res.json();
          const loaded = data.payload?.settings || data.paylod?.settings || data.settings;
          if (loaded) setSettings(loaded);
        }
      } catch (err) {
        console.error('Failed to fetch settings in CampusPage:', err);
      }
    };
    fetchSettings();
  }, []);

  const facilities = [
    {
      title: 'Central Library',
      desc: 'An expansive academic repository featuring over 50,000 reference volumes, international journal catalog databases, and 20 quiet digital terminals for research.',
      icon: FiBookOpen,
      color: 'text-primary bg-primary-light border-primary-light'
    },
    {
      title: 'High-Tech Labs & Innovation Hub',
      desc: 'Equipped with clean workbench modules, digital oscilloscopes, microcontroller boards, and high-performance server workstations for engineering practice.',
      icon: FiActivity,
      color: 'text-rose-600 bg-rose-50 border-rose-100'
    },
    {
      title: 'Residential Hostels',
      desc: 'Twin-sharing student rooms featuring dining halls, stable fiber Wi-Fi networks, laundry facilities, and 24/7 security watch systems.',
      icon: FiMap,
      color: 'text-primary bg-primary-light border-primary-light'
    }
  ];

  const highlights = [
    {
      title: 'Campus Medical Clinic',
      desc: 'Our health wing provides daily diagnostic checkups, primary medicines, and recovery care for sports physical activities.',
      icon: FiHeart,
      color: 'text-amber-500 bg-amber-50'
    },
    {
      title: 'Eco-Friendly Setup',
      desc: 'Incorporating clean energy structures including 80kW rooftop solar grid arrays, green study gardens, and rainwater conservation basins.',
      icon: FiSun,
      color: 'text-primary bg-primary-light'
    },
    {
      title: 'Secure Access & Network',
      desc: 'Entire campus is secured with RFID card check-gates, complete CCTV coverage, and secure student credentials access across portals.',
      icon: FiShield,
      color: 'text-primary bg-primary-light'
    }
  ];

  const mapUrl = settings?.map_url;

  return (
    <div className="w-full min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="w-full flex flex-col gap-10">
        
        
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight leading-tight">
            Our Campus & Infrastructure
          </h1>
          <p className="text-slate-500 mt-3 max-w-xl mx-auto text-xs sm:text-sm md:text-base leading-relaxed">
            FIT is spread across a modern campus layout designed to stimulate intellectual conversations, collaborative engineering projects, and a healthy lifestyle.
          </p>
        </div>

        {/* Dynamic Campus Map Section */}
        {mapUrl && (
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <FiMapPin className="text-primary text-xl" />
              <span>Campus Map & Location</span>
            </div>
            {mapUrl.includes('<iframe') ? (
              <div 
                className="w-full h-80 rounded-2xl overflow-hidden shadow-inner border border-slate-100"
                dangerouslySetInnerHTML={{ __html: mapUrl }}
              />
            ) : (
              <div className="w-full bg-slate-900 text-white rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-sm">Interactive Campus Directions</span>
                  <p className="text-xs text-slate-400">View our exact campus location and navigational markers on Google Maps.</p>
                </div>
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-primary text-secondary font-bold text-xs rounded-xl hover:bg-primary-dark transition-colors shrink-0 flex items-center gap-1.5"
                >
                  <FiMapPin /> Open Google Maps
                </a>
              </div>
            )}
          </div>
        )}

        {/* Core Facilities Grid */}
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Key Academic Facilities
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {facilities.map((fac, idx) => {
              const Icon = fac.icon;
              return (
                <div 
                  key={idx} 
                  className="bg-white border border-slate-100 p-6 rounded-2xl flex flex-col gap-3 shadow-xs hover:shadow-sm transition-shadow"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${fac.color}`}>
                    <Icon className="text-base" />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm sm:text-base">
                    {fac.title}
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    {fac.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Campus services highlights */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col gap-6">
          <h3 className="font-bold text-slate-900 text-base sm:text-lg border-b border-slate-100 pb-4">
            Services & Infrastructure Standards
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {highlights.map((h, idx) => {
              const Icon = h.icon;
              return (
                <div key={idx} className="flex gap-4 items-start">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-slate-100 ${h.color}`}>
                    <Icon className="text-sm" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="font-semibold text-slate-900 text-xs sm:text-sm">
                      {h.title}
                    </h4>
                    <p className="text-slate-500 text-[11px] sm:text-xs leading-relaxed">
                      {h.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-r from-sky-950/40 via-slate-900 to-indigo-950/40 z-0" />
          
          <div className="relative z-10 flex flex-col gap-1.5 max-w-xl">
            <h4 className="font-semibold text-white text-base sm:text-lg">
              Looking for detailed measurements & parameters?
            </h4>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Read technical specs about our lab apparatus, hostel rules, clinic facilities, and library open-hours.
            </p>
          </div>

          <Link
            href="/contact"
            className="relative z-10 bg-white hover:bg-slate-50 text-slate-900 font-semibold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-xs hover:shadow-md cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            <span>Contact</span>
            <FiArrowRight />
          </Link>
        </div>

      </div>
    </div>
  );
};

export default CampusPage;
