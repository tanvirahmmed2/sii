/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { FiLayers, FiExternalLink } from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const CampusPage = () => {
  const { website, tenantUrl, getApiEndpoint } = useContext(TenantWebsiteContext);
  const schoolName = website?.name || 'Institution';

  const [infrastructure, setInfrastructure] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const fetchInfrastructure = async () => {
      try {
        const res = await fetch(getApiEndpoint('home/institutional?type=infrastructure'));
        if (!ignore && res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.infrastructure)) {
            setInfrastructure(data.infrastructure);
          }
        }
      } catch (err) {
        console.error('Error fetching campus infrastructure:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchInfrastructure();
    return () => {
      ignore = true;
    };
  }, [getApiEndpoint]);

  const defaultFacilities = [
    {
      title: 'Central Library & Reading Terminal',
      desc: 'Extensive academic archive housing reference volumes, national curriculum texts, and high-speed digital research terminals for students and faculty.'
    },
    {
      title: 'Engineering & Computing Laboratories',
      desc: 'Modern workbenches equipped for physics, chemistry, biology experiments, computer networking, and robotics design.'
    },
    {
      title: 'Hostels & Residential Halls',
      desc: 'Supervised student living quarters featuring dining rooms, round-the-clock water and electricity back-up, and monitored entry gates.'
    },
    {
      title: 'Athletics & Recreation Grounds',
      desc: 'Spacious outdoor playgrounds for football, cricket, and athletics, alongside indoor table tennis and badminton setups.'
    },
    {
      title: 'Healthcare & First-Aid Post',
      desc: 'On-site health post stocked with fundamental emergency supplies and staffed for primary illness evaluations.'
    },
    {
      title: 'Auditorium & Multi-Purpose Hall',
      desc: 'Acoustically treated event space facilitating national celebrations, prize-giving ceremonies, seminars, and debates.'
    }
  ];

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="border-b border-slate-200/80 dark:border-slate-800 pb-6">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href={tenantUrl('/about')}
              className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              ← Back to About
            </Link>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-slate-900 dark:text-white tracking-tight">
            Campus Infrastructure & Facilities
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
            {schoolName} provides a purpose-built campus environment optimized for intellectual pursuit, technical training, and safe student living.
          </p>
        </div>

        {/* Dynamic Infrastructure Facilities from Database */}
        {!loading && infrastructure.length > 0 ? (
          <div className="space-y-4">
            <h2 className="font-serif text-xl sm:text-2xl font-normal text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <FiLayers className="text-primary w-5 h-5" />
              <span>Campus Facilities & Centers</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {infrastructure.map((fac, idx) => (
                <div
                  key={fac.id || idx}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300"
                >
                  {/* Cloudinary Image Banner */}
                  {fac.image && (
                    <div className="w-full h-48 bg-slate-100 dark:bg-slate-800 overflow-hidden relative group">
                      <img
                        src={fac.image}
                        alt={fac.title}
                        className="w-full h-full object-cover group-hover:scale-103 transition duration-300"
                      />
                      <a
                        href={fac.image}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-xs gap-1.5"
                      >
                        <FiExternalLink className="w-3.5 h-3.5" />
                        <span>View Photo</span>
                      </a>
                    </div>
                  )}

                  <div className="p-6 space-y-2.5 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold text-primary uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                        {fac.facility_type || 'Facility'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        #{fac.order_no ?? idx + 1}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-serif text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                        {fac.title}
                      </h3>
                      {fac.subtitle && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          {fac.subtitle}
                        </p>
                      )}
                    </div>

                    {fac.description && (
                      <div
                        className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed prose dark:prose-invert max-w-none pt-1"
                        dangerouslySetInnerHTML={{ __html: fac.description }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Default Static Facilities fallback */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {defaultFacilities.map((fac, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-2xl shadow-xs space-y-2 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300"
              >
                <span className="text-xs font-semibold text-primary uppercase tracking-wider block">
                  Facility {idx + 1}
                </span>
                <h2 className="font-serif text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                  {fac.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {fac.desc}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Map Location Section */}
        {website?.map_url && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <h3 className="font-serif text-lg font-semibold text-slate-900 dark:text-white">
              Campus Geographic Location
            </h3>
            {website.map_url.includes('<iframe') ? (
              <div 
                className="w-full h-72 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden"
                dangerouslySetInnerHTML={{ __html: website.map_url }}
              />
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                  Campus Navigation Coordinates: {website.address || 'Main Campus'}
                </span>
                <a
                  href={website.map_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-medium hover:bg-primary-dark transition-all shadow-xs hover:shadow-md hover:shadow-primary/20 hover:-translate-y-0.5 shrink-0"
                >
                  Open in Maps
                </a>
              </div>
            )}
          </div>
        )}

        {/* Inquiries */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div>
            <h3 className="font-serif text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
              Campus Visits & Security Regulations
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Parents and visitors must log at the security desk upon arrival with valid national ID.
            </p>
          </div>
          <Link
            href={tenantUrl('/contact')}
            className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs sm:text-sm font-medium hover:bg-primary-dark transition-all shadow-xs hover:shadow-md hover:shadow-primary/20 hover:-translate-y-0.5 shrink-0"
          >
            Contact Administrative Desk
          </Link>
        </div>

      </div>
    </div>
  );
};

export default CampusPage;
