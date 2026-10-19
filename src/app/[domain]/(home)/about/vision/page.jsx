'use client';

import React, { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { FiCompass } from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const VisionPage = () => {
  const { website, tenantUrl, getApiEndpoint } = useContext(TenantWebsiteContext);
  const schoolName = website?.name || 'Our Institution';

  const [visions, setVisions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const fetchVisions = async () => {
      try {
        const endpoint = getApiEndpoint('home/institutional?type=visions');
        const res = await fetch(endpoint);
        if (!ignore && res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.visions)) {
            setVisions(data.visions);
          }
        }
      } catch (err) {
        console.error('Error fetching institutional visions:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchVisions();
    return () => {
      ignore = true;
    };
  }, [getApiEndpoint]);

  const values = [
    {
      title: 'Academic Integrity & Rigor',
      desc: 'Transparent examination grading, comprehensive coursework, and zero tolerance for academic dishonesty.'
    },
    {
      title: 'Ethical Leadership',
      desc: 'Instilling accountability, social concern, and civic responsibility among all enrolled scholars.'
    },
    {
      title: 'Scientific & Technological Enquiry',
      desc: 'Encouraging experimentation, hands-on laboratory discovery, and creative problem solving.'
    },
    {
      title: 'Equality & Mutual Respect',
      desc: 'Maintaining an inclusive academic environment celebrating student diversity and providing equitable support.'
    }
  ];

  const visionText = website?.vision || website?.vission || '';

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl mx-auto space-y-8">
        
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
            Institutional Vision & Core Values
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
            Strategic direction and non-negotiable principles that shape the operations of {schoolName}.
          </p>
        </div>

        {/* Vision Statement */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-3 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider block">
            Institutional Vision
          </span>
          <h2 className="font-serif text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
            Aspiration for Long-Term Educational Excellence
          </h2>
          {visionText ? (
            <div 
              className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: visionText }}
            />
          ) : (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              To stand recognized as a premier educational establishment noted for scholarly discipline, character formation, and technological readiness of its graduates.
            </p>
          )}
        </div>

        {/* Dynamic Visions from Database */}
        {!loading && visions.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-serif text-xl sm:text-2xl font-normal text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <FiCompass className="text-primary w-5 h-5" />
              <span>Institutional Pillars of Vision</span>
            </h2>

            <div className="grid grid-cols-1 gap-4">
              {visions.map((v, idx) => (
                <div
                  key={v.id || idx}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-3 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-base font-bold text-slate-900 dark:text-white">
                      {v.title}
                    </h3>
                    <span className="text-xs font-mono px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                      Vision #{v.order_no ?? idx + 1}
                    </span>
                  </div>
                  {v.description && (
                    <div
                      className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed prose dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: v.description }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Core Values Grid */}
        <div className="space-y-4">
          <h2 className="font-serif text-xl sm:text-2xl font-normal text-slate-900 dark:text-white tracking-tight">
            Four Foundational Values
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {values.map((val, idx) => (
              <div 
                key={idx} 
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-2xl shadow-xs space-y-2 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300"
              >
                <span className="text-xs font-semibold text-primary uppercase tracking-wider block">
                  Value {idx + 1}
                </span>
                <h3 className="font-serif text-base font-semibold text-slate-900 dark:text-white">
                  {val.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {val.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Assurance Note */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-2">
          <h3 className="font-serif text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
            Commitment to Continuous Improvement
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            The governing council and faculty annually review school performance data, student outcomes, and infrastructure quality to ensure adherence to our vision and national education guidelines.
          </p>
        </div>

      </div>
    </div>
  );
};

export default VisionPage;
