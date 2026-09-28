'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FiTarget, 
  FiHeart, 
  FiCpu, 
  FiAward, 
  FiArrowLeft, 
  FiCheckCircle, 
  FiBookOpen,
  FiGlobe
} from 'react-icons/fi';

const VisionPage = () => {
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
        console.error('Failed to fetch settings in VisionPage:', err);
      }
    };
    fetchSettings();
  }, []);

  const values = [
    {
      title: 'Academic Excellence',
      desc: 'We enforce high curriculum standards, invite leading tech executives to audit courses, and structure grading registers to encourage pure technical mastery.',
      icon: FiBookOpen,
      color: 'text-primary bg-primary-light border-primary-light'
    },
    {
      title: 'Ethical Responsibility',
      desc: 'Nurturing a culture of transparency, digital fairness, and academic integrity. We prepare graduates to be socially responsible leaders.',
      icon: FiHeart,
      color: 'text-rose-600 bg-rose-50 border-rose-100'
    },
    {
      title: 'Sustainable Innovation',
      desc: 'Fostering practical solutions. Our students build microgrid software, solar charging models, and clean tech architectures in our hardware engineering labs.',
      icon: FiCpu,
      color: 'text-primary bg-primary-light border-primary-light'
    },
    {
      title: 'Global Inclusivity',
      desc: 'Fostering a campus open to diverse ideas and backgrounds, supported by active clubs, scholarship schemes, and mental health counseling.',
      icon: FiGlobe,
      color: 'text-amber-600 bg-amber-50 border-amber-100'
    }
  ];

  const vissionText = settings?.vission || '';

  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="w-full flex flex-col gap-10">
        
       
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight leading-tight">
            Our Vision & Core Values
          </h1>
          <p className="text-slate-500 mt-3 max-w-xl mx-auto text-xs sm:text-sm md:text-base leading-relaxed">
            Explore our foundational roadmap and core principles for academic development.
          </p>
        </div>

        {vissionText && (
          <div className="relative bg-slate-900 text-white rounded-3xl p-8 overflow-hidden shadow-md border border-slate-800 flex flex-col gap-4">
            <div className="absolute inset-0 bg-linear-to-br from-indigo-950 via-slate-900 to-sky-950/80 z-0" />
            <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-start">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-sky-400/20 text-sky-400 flex items-center justify-center shrink-0">
                <FiTarget className="text-xl" />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                  The Long-Term Aim
                </span>
                <h3 className="font-semibold text-white text-base sm:text-lg">
                  To stand at the global forefront of technical and administrative education.
                </h3>
                <div 
                  className="text-slate-300 text-xs sm:text-sm leading-relaxed mt-1 prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: vissionText }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Core Values Section */}
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight text-center sm:text-left">
            Our 4 Core Values
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((val, idx) => {
              const Icon = val.icon;
              return (
                <div 
                  key={idx} 
                  className="bg-white border border-slate-100 p-6 rounded-2xl flex flex-col gap-3 shadow-xs hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${val.color}`}>
                      <Icon className="text-sm sm:text-base" />
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm sm:text-base">
                      {val.title}
                    </h4>
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed mt-1">
                    {val.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quality Charter Banner */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row gap-6 items-start relative">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <FiAward className="text-xl" />
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-slate-900 text-sm sm:text-base">
              Academic Quality Framework
            </h3>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
              We continually audit our study paths using evaluation reports from tech industry leaders. Each term, the registrar evaluates class pass rates, teacher logs, and hardware lab safety benchmarks. This data-driven feedback loop allows us to dynamically refine courses while staying true to our foundational values.
            </p>
          </div>
        </div>

        

      </div>
    </div>
  );
};

export default VisionPage;
