'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FiEye, 
  FiActivity, 
  FiGlobe, 
  FiArrowLeft, 
  FiTarget,
  FiTrendingUp,
  FiMap,
  FiBookOpen
} from 'react-icons/fi';

import { SCHOOL_NAME } from '@/lib/secret';

const MissionPage = () => {
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
        console.error('Failed to fetch settings in MissionPage:', err);
      }
    };
    fetchSettings();
  }, []);

  const schoolName = settings?.school_name || SCHOOL_NAME || 'Fontana Institute of Technology';

  const strategies = [
    {
      title: 'Practical Curriculum Integration',
      desc: 'Merging classroom theories with immediate laboratory projects. Students learn algorithms by writing real-world systems, and analyze market management through simulations.',
      icon: FiBookOpen,
      color: 'text-primary bg-primary-light border-primary-light'
    },
    {
      title: 'Holistic Extracurricular Activities',
      desc: `${schoolName} coordinates active tech clubs, sports tournaments, and cultural events. These activities cultivate leadership, team coordination, and emotional resilience.`,
      icon: FiActivity,
      color: 'text-primary bg-primary-light border-primary-light'
    },
    {
      title: 'Digital Registrar Efficiency',
      desc: 'All processes, including admissions, class schedules, term marks registry, and fee payments, are managed digitally, ensuring zero data loss and absolute transparency.',
      icon: FiTrendingUp,
      color: 'text-primary bg-primary-light border-primary-light'
    }
  ];

  const goals = [
    { target: '100% Green Energy', detail: 'Aiming to offset all campus electricity usage via rooftop solar microgrids by 2028.' },
    { target: '50+ Corporate Partners', detail: 'Fostering direct recruitment paths with multinational software and consulting firms.' },
    { target: '100+ Annual Research Papers', detail: 'Encouraging faculty and postgraduates to write in peer-reviewed technical journals.' },
    { target: 'Comprehensive Scholarships', detail: 'Ensuring that 25% of eligible students receive fully-funded financial assistance.' },
  ];

  const missionText = settings?.mission || '';
  const vissionText = settings?.vission || '';

  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="w-full flex flex-col gap-10">
        
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight leading-tight">
            Our Mission & Objectives
          </h1>
          <p className="text-slate-500 mt-3 max-w-xl mx-auto text-xs sm:text-sm md:text-base leading-relaxed">
            {schoolName ? `Establishing ${schoolName} as a hub of academic rigor, character, technical research, and student career placement.` : 'Institutional mission and strategic objectives.'}
          </p>
        </div>

        {(missionText || vissionText) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {missionText && (
              <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col gap-4 relative">
                <div className="w-12 h-12 rounded-2xl bg-primary-light text-primary flex items-center justify-center shrink-0 border border-primary-light">
                  <FiGlobe className="text-xl" />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="font-semibold text-slate-900 text-base sm:text-lg">
                    Institutional Mission
                  </h3>
                  <div 
                    className="text-slate-600 text-xs sm:text-sm leading-relaxed prose prose-slate max-w-none"
                    dangerouslySetInnerHTML={{ __html: missionText }}
                  />
                </div>
              </div>
            )}

            {vissionText && (
              <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col gap-4 relative">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                  <FiEye className="text-xl" />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="font-semibold text-slate-900 text-base sm:text-lg">
                    Institutional Vision
                  </h3>
                  <div 
                    className="text-slate-600 text-xs sm:text-sm leading-relaxed prose prose-slate max-w-none"
                    dangerouslySetInnerHTML={{ __html: vissionText }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            How We Achieve Our Mission
          </h2>
          <div className="flex flex-col gap-4">
            {strategies.map((strat, idx) => {
              const Icon = strat.icon;
              return (
                <div 
                  key={idx} 
                  className="bg-white border border-slate-100 p-6 rounded-2xl flex flex-col sm:flex-row gap-4 items-start shadow-xs hover:shadow-sm transition-shadow"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${strat.color}`}>
                    <Icon className="text-base" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="font-semibold text-slate-900 text-sm sm:text-base">
                      {strat.title}
                    </h4>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      {strat.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-md border border-slate-800 flex flex-col gap-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-tr from-sky-950/40 via-slate-900 to-indigo-950/40 z-0" />
          <div className="relative z-10 flex flex-col gap-2">
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
              Vision 2030
            </span>
            <h3 className="font-semibold text-white text-lg sm:text-xl">
              Strategic Growth Benchmarks
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm">
              Our specific targets designed to guide institutional investments, research focus, and partnership expansion.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-6 mt-2">
            {goals.map((g, idx) => (
              <div key={idx} className="flex flex-col gap-1.5 p-4 bg-white/5 rounded-2xl border border-white/10">
                <span className="font-semibold text-sky-400 text-xs sm:text-sm">
                  {g.target}
                </span>
                <p className="text-slate-300 text-[11px] sm:text-xs leading-relaxed">
                  {g.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

      

      </div>
    </div>
  );
};

export default MissionPage;