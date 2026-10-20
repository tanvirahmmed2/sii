'use client';

import React, { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import { FiExternalLink } from 'react-icons/fi';

const FacilitiesPage = () => {
  const { tenantUrl, website, getApiEndpoint } = useContext(TenantWebsiteContext);
  const schoolName = website?.name || 'Institution';

  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const fetchFacilities = async () => {
      try {
        const res = await fetch(getApiEndpoint('facilities'));
        if (res.ok) {
          const data = await res.json();
          const list = data.facilities || data.payload?.facilities || [];
          if (!ignore && Array.isArray(list)) {
            setFacilities(list);
          }
        }
      } catch (err) {
        console.error('Error fetching facilities:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchFacilities();
    return () => {
      ignore = true;
    };
  }, [getApiEndpoint]);

  const cards = [
    {
      title: 'Residential Hostels & Housing',
      desc: 'On-campus dormitories, student living halls, gender-segregated allocations, and provost governance.',
      href: tenantUrl('/facilities/hostels')
    },
    {
      title: 'Modern Classrooms & Studios',
      desc: 'Multimedia interactive projectors, acoustic treatment, ergonomic seating, and digital writing pads.',
      href: tenantUrl('/facilities/classrooms')
    },
    {
      title: 'Laboratories & Research Grounds',
      desc: 'Applied physics, computing servers, chemistry testing stations, and campus athletics tracks.',
      href: tenantUrl('/about/campus')
    }
  ];

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 transition-colors overflow-hidden">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="border-b border-slate-200/80 dark:border-slate-800 pb-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase font-bold text-primary tracking-widest block">
              Campus Facilities
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-normal text-slate-900 dark:text-slate-100 tracking-tight">
            Institutional Infrastructure &amp; Services
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
            Modern facilities built to support study, research innovation, and safe campus accommodations at {schoolName}.
          </p>
        </motion.div>

        {/* Dynamic Facilities from Database */}
        {!loading && facilities.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-serif font-normal text-slate-900 dark:text-slate-100 tracking-tight">
                Published Institutional Facilities
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                {facilities.length} {facilities.length === 1 ? 'Sector' : 'Sectors'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {facilities.map((facility, idx) => (
                <motion.div
                  key={facility.id || idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(idx * 0.08, 0.4) }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 transition-colors flex flex-col justify-between"
                >
                  {facility.image && (
                    <div className="w-full h-44 bg-slate-100 dark:bg-slate-800 overflow-hidden relative group">
                      <img
                        src={facility.image}
                        alt={facility.title}
                        className="w-full h-full object-cover group-hover:scale-103 transition duration-300"
                      />
                      <a
                        href={facility.image}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-xs gap-1.5"
                      >
                        <FiExternalLink className="w-3.5 h-3.5" />
                        <span>View Photo</span>
                      </a>
                    </div>
                  )}

                  <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block">
                        {facility.facility_type || 'Facility Sector'}
                      </span>
                      <h3 className="font-serif font-medium text-slate-900 dark:text-slate-100 text-lg">
                        {facility.title}
                      </h3>
                      {facility.description && (
                        <div
                          className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed prose dark:prose-invert max-w-none pt-1"
                          dangerouslySetInnerHTML={{ __html: facility.description }}
                        />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Hub Section Navigation Cards */}
        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-serif font-normal text-slate-900 dark:text-slate-100 tracking-tight">
            Campus Sectors &amp; Housing Portals
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards.map((card, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 p-6 rounded-2xl shadow-xs hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 transition-colors flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block">
                    Facility Hub
                  </span>
                  <h3 className="font-serif font-medium text-slate-900 dark:text-slate-100 text-lg">
                    {card.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                    {card.desc}
                  </p>
                </div>
                <Link
                  href={card.href}
                  className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors inline-flex items-center gap-1 group pt-2"
                >
                  Inspect Facility <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Standard notice */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-2"
        >
          <h3 className="font-serif font-medium text-slate-900 dark:text-slate-100 text-base">Environmental &amp; Safety Standards</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {schoolName} updates study blocks in alignment with building safety benchmarks. All laboratories feature fire suppression stations, emergency eye-wash faucets, and stable backup energy generators.
          </p>
        </motion.div>

      </div>
    </div>
  );
};

export default FacilitiesPage;