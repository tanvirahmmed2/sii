'use client';

import React, { useContext } from 'react';
import Link from 'next/link';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const VisionPage = () => {
  const { website, tenantUrl } = useContext(TenantWebsiteContext);
  const schoolName = website?.name || 'Our Institution';

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
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={tenantUrl('/about')}
              className="text-xs text-primary font-medium hover:underline"
            >
              ← Back to About
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Institutional Vision & Core Values
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Strategic direction and non-negotiable principles that shape the operations of {schoolName}.
          </p>
        </div>

        {/* Vision Statement */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 sm:p-6 shadow-xs space-y-2">
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
            Institutional Vision
          </span>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
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

        {/* Core Values Grid */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Four Foundational Values
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {values.map((val, idx) => (
              <div 
                key={idx} 
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded shadow-xs space-y-1.5"
              >
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                  Value {idx + 1}
                </span>
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {val.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {val.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Assurance Note */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs space-y-1.5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Commitment to Continuous Improvement
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            The governing council and faculty annually review school performance data, student outcomes, and infrastructure quality to ensure adherence to our vision and national education guidelines.
          </p>
        </div>

      </div>
    </div>
  );
};

export default VisionPage;
