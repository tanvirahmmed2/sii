'use client';

import React, { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AuthorityCard from 'src/component/website/cards/AuthorityCard';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const About = () => {
  const { website, getApiEndpoint, tenantUrl } = useContext(TenantWebsiteContext);
  const [statsData, setStatsData] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClubs: 0,
  });
  const [chairman, setChairman] = useState(null);
  const [loading, setLoading] = useState(true);

  const schoolName = website?.name || 'Institution Academic Office';
  const logoSrc = website?.logo;

  useEffect(() => {
    const fetchAboutData = async () => {
      setLoading(true);
      try {
        let studentsCount = 0;
        let teachersCount = 0;
        try {
          const statsRes = await fetch(getApiEndpoint('public/stats'));
          if (statsRes.ok) {
            const stData = await statsRes.json();
            const payload = stData.payload || stData.paylod || {};
            studentsCount = payload.totalStudents || 0;
            teachersCount = payload.totalTeachers || 0;
          }
        } catch {
          // ignore
        }

        let clubsCount = 0;
        try {
          const clubsRes = await fetch(getApiEndpoint('clubs'));
          if (clubsRes.ok) {
            const clData = await clubsRes.json();
            const payload = clData.payload || clData.paylod || {};
            const clubsList = payload.clubs || [];
            clubsCount = clubsList.length;
          }
        } catch {
          // ignore
        }

        setStatsData({
          totalStudents: studentsCount,
          totalTeachers: teachersCount,
          totalClubs: clubsCount,
        });

        try {
          const chairmanRes = await fetch(getApiEndpoint('authorities/role/chairman'));
          if (chairmanRes.ok) {
            const cData = await chairmanRes.json();
            const payload = cData.payload || cData.paylod || {};
            const authList = payload.authorities || [];
            if (authList.length > 0) {
              setChairman(authList[0]);
            } else {
              const allAuthRes = await fetch(getApiEndpoint('authorities'));
              if (allAuthRes.ok) {
                const allData = await allAuthRes.json();
                const allPayload = allData.payload || allData.paylod || {};
                const allAuths = allPayload.authorities || [];
                const foundChairman = allAuths.find((a) =>
                  a.title?.toLowerCase().includes('chairman') ||
                  a.designation?.toLowerCase().includes('chairman') ||
                  a.designation_title?.toLowerCase().includes('chairman')
                );
                if (foundChairman) setChairman(foundChairman);
              }
            }
          }
        } catch {
          // ignore
        }
      } catch (err) {
        console.error('Error fetching about page data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAboutData();
  }, [getApiEndpoint]);

  const stats = [
    { 
      value: `${statsData.totalStudents.toLocaleString()}+`, 
      label: 'Enrolled Students', 
      desc: 'Active scholars pursuing academic curricula across primary, secondary, and college tracks.' 
    },
    { 
      value: `${statsData.totalTeachers.toLocaleString()}+`, 
      label: 'Academic Faculty', 
      desc: 'Certified educators, subject specialists, and dedicated student mentors.' 
    },
    { 
      value: `${statsData.totalClubs.toLocaleString()}+`, 
      label: 'Registered Clubs', 
      desc: 'Extracurricular student associations fostering technological skills and leadership.' 
    },
  ];

  const sections = [
    {
      title: 'Our Historic Journey',
      desc: `Explore institutional milestones, founding heritage, and academic growth of ${schoolName}.`,
      href: tenantUrl('/about/history')
    },
    {
      title: 'Vision & Core Values',
      desc: 'Long-term strategic roadmap, ethical foundations, and institutional code of conduct.',
      href: tenantUrl('/about/vision')
    },
    {
      title: 'Mission Statement',
      desc: 'Pedagogical objectives detailing progressive learning frameworks and assessment standards.',
      href: tenantUrl('/about/mission')
    },
    {
      title: 'Campus & Infrastructure',
      desc: 'Laboratories, digital libraries, seminar halls, hostels, and sports grounds.',
      href: tenantUrl('/about/campus')
    }
  ];

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl mx-auto space-y-8">
        
        {/* Hero Banner */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-10 rounded shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {logoSrc ? (
              <div className="w-16 h-16 rounded border border-slate-200 dark:border-slate-800 relative overflow-hidden bg-slate-50 dark:bg-slate-800 shrink-0">
                <Image
                  src={logoSrc}
                  alt={`${schoolName} Emblem`}
                  fill
                  className="object-contain p-1"
                  sizes="64px"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded bg-primary text-white flex items-center justify-center font-semibold text-xl shrink-0">
                {schoolName.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="space-y-1">
              <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                EIIN: {website?.eiin || 'Official Academic Center'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                {schoolName}
              </h1>
              {website?.motto && (
                <p className="text-xs text-primary font-medium">
                  {website.motto}
                </p>
              )}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed pt-2 border-t border-slate-100 dark:border-slate-800">
            Dedicated to rigorous academic delivery, scientific enquiry, and comprehensive character building. We prepare future generations for leadership in technical industries, public administration, and global scholarship.
          </p>
        </div>

        {/* Metrics Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
              <span className="text-2xl font-semibold text-slate-900 dark:text-slate-100 block">
                {loading ? '—' : stat.value}
              </span>
              <span className="text-xs font-medium text-primary block">
                {stat.label}
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {stat.desc}
              </p>
            </div>
          ))}
        </div>

        {/* History Preview */}
        {website?.history && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 sm:p-6 shadow-xs space-y-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Institutional Heritage & Founding
            </h2>
            <div 
              className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: website.history }}
            />
          </div>
        )}

        {/* Core Pillars Nav Grid */}
        <div className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Explore Academic Pillars
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              In-depth documentation covering curriculum principles, campus infrastructure, and founding goals.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sections.map((sec, idx) => (
              <Link
                key={idx}
                href={sec.href}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded shadow-xs hover:border-primary transition-colors block space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {sec.title}
                  </h3>
                  <span className="text-xs text-primary font-medium">Read →</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {sec.desc}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Chairman & Governance */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Institutional Governance
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Board leadership and executive guidance.
              </p>
            </div>
            <Link 
              href={tenantUrl('/authorities')} 
              className="text-xs text-primary font-medium hover:underline"
            >
              All Board Members →
            </Link>
          </div>

          {chairman ? (
            <div className="flex justify-start">
              <div className="w-full max-w-sm">
                <AuthorityCard authority={chairman} />
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 text-center text-xs text-slate-500 dark:text-slate-400">
              Institutional leadership profiles are listed in the Authorities Directory.
            </div>
          )}
        </div>

        {/* Charter Note */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded space-y-1.5 shadow-xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            Quality Assurance Charter
          </span>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Adherence to Educational Rigor & Compliance
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {schoolName} maintains strict academic standards with periodic faculty peer reviews, syllabus modernization, continuous laboratory audits, and transparent examination recording.
          </p>
        </div>

      </div>
    </div>
  );
};

export default About;