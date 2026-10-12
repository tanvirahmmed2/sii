'use client';

import React, { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { FiCheckCircle } from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const MissionPage = () => {
  const { website, tenantUrl, getApiEndpoint } = useContext(TenantWebsiteContext);
  const schoolName = website?.name || 'Our Institution';

  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const fetchMissions = async () => {
      try {
        const endpoint = getApiEndpoint('home/institutional?type=missions');
        const res = await fetch(endpoint);
        if (!ignore && res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.missions)) {
            setMissions(data.missions);
          }
        }
      } catch (err) {
        console.error('Error fetching institutional missions:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchMissions();
    return () => {
      ignore = true;
    };
  }, [getApiEndpoint]);

  const strategies = [
    {
      title: 'Applied Knowledge & Laboratory Integration',
      desc: 'Coupling theory with immediate laboratory experiments so students grasp principles through hands-on practice.'
    },
    {
      title: 'Co-Curricular & Leadership Development',
      desc: 'Maintaining active student clubs, literary societies, athletics, and community service projects to cultivate character.'
    },
    {
      title: 'Digital Academic Transparency',
      desc: 'Providing students and parents with instant access to attendance records, term marks, syllabi, and fee schedules online.'
    }
  ];

  const goals = [
    { target: 'Curricular Modernization', detail: 'Regular review of educational pathways alongside national educational standards.' },
    { target: 'Faculty Professional Development', detail: 'Workshops for teachers on modern pedagogies and digital evaluation tools.' },
    { target: 'Inclusive Student Support', detail: 'Financial stipends and merit awards for meritorious students needing support.' },
    { target: 'Clean Energy & Sustainability', detail: 'Promoting energy conservation and waste-reduction habits across student life.' },
  ];

  const missionText = website?.mission || '';
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
            Institutional Mission & Objectives
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Defining the educational principles, community goals, and pedagogical vision of {schoolName}.
          </p>
        </div>

        {/* Dynamic Mission & Vision from Website Context */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs space-y-2">
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
              Official Mission
            </span>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Our Core Educational Mission
            </h2>
            {missionText ? (
              <div 
                className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: missionText }}
              />
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                To educate and equip scholars through comprehensive intellectual inquiry, ethical leadership training, and practical skill development.
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs space-y-2">
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
              Official Vision
            </span>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Future Educational Vision
            </h2>
            {visionText ? (
              <div 
                className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: visionText }}
              />
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                To stand as an exemplary center of academic achievement, producing self-reliant graduates who positively transform society.
              </p>
            )}
          </div>
        </div>

        {/* Curated Institutional Missions from Database */}
        {!loading && missions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FiCheckCircle className="text-primary w-4 h-4" />
              <span>Core Institutional Missions & Commitments</span>
            </h2>

            <div className="grid grid-cols-1 gap-3.5">
              {missions.map((m, idx) => (
                <div
                  key={m.id || idx}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {m.title}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      Mission #{m.order_no ?? idx + 1}
                    </span>
                  </div>
                  {m.description && (
                    <div
                      className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed prose dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: m.description }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strategic Pillars */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Implementation Framework
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {strategies.map((strat, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded shadow-xs space-y-1.5"
              >
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">
                  Pillar {idx + 1}
                </span>
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {strat.title}
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {strat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Goals */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Institutional Growth Targets
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {goals.map((g, idx) => (
              <div key={idx} className="p-3 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-0.5">
                <span className="text-xs font-semibold text-primary block">
                  {g.target}
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
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