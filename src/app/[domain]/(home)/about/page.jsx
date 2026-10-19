/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
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
  const [boardMembers, setBoardMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const schoolName = website?.name || 'Institution Academic Office';
  const logoSrc = website?.logo;

  useEffect(() => {
    let ignore = false;
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

        if (!ignore) {
          setStatsData({
            totalStudents: studentsCount,
            totalTeachers: teachersCount,
            totalClubs: clubsCount,
          });
        }

        // Fetch official board members
        try {
          const boardRes = await fetch(getApiEndpoint('home/institutional?type=board_members'));
          if (boardRes.ok) {
            const bData = await boardRes.json();
            if (!ignore && bData.success && Array.isArray(bData.board_members)) {
              setBoardMembers(bData.board_members);
            }
          }
        } catch {
          // ignore
        }

        try {
          const chairmanRes = await fetch(getApiEndpoint('authorities/role/chairman'));
          if (chairmanRes.ok) {
            const cData = await chairmanRes.json();
            const payload = cData.payload || cData.paylod || {};
            const authList = payload.authorities || [];
            if (!ignore) {
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
          }
        } catch {
          // ignore
        }
      } catch (err) {
        console.error('Error fetching about page data:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchAboutData();
    return () => {
      ignore = true;
    };
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
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="w-full max-w-6xl mx-auto space-y-8">

        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-10 rounded-2xl shadow-xs space-y-5"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {logoSrc ? (
              <div className="w-16 h-16 rounded-xl border border-slate-200/80 dark:border-slate-800 relative overflow-hidden bg-slate-50 dark:bg-slate-800 shrink-0">
                <Image
                  src={logoSrc}
                  alt={`${schoolName} Emblem`}
                  fill
                  className="object-contain p-1"
                  sizes="64px"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl bg-primary text-white flex items-center justify-center font-semibold text-xl shrink-0">
                {schoolName.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="space-y-1.5">
              <span className="text-xs uppercase tracking-[0.25em] font-semibold text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20 inline-block">
                EIIN: {website?.eiin || 'Official Academic Center'}
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl font-normal text-slate-900 dark:text-white tracking-tight">
                {schoolName}
              </h1>
              {website?.motto && (
                <p className="text-xs sm:text-sm text-primary font-medium">
                  {website.motto}
                </p>
              )}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed pt-4 border-t border-slate-100 dark:border-slate-800/80">
            Dedicated to rigorous academic delivery, scientific enquiry, and comprehensive character building. We prepare future generations for leadership in technical industries, public administration, and global scholarship.
          </p>
        </motion.div>

        {/* Metrics Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-2 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-colors"
            >
              <span className="font-serif text-3xl font-semibold text-slate-900 dark:text-white block">
                {loading ? '—' : stat.value}
              </span>
              <span className="text-xs uppercase tracking-wider font-semibold text-primary block">
                {stat.label}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {stat.desc}
              </p>
            </motion.div>
          ))}
        </div>

        {/* History Preview */}
        {website?.history && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
            <h2 className="font-serif text-lg font-semibold text-slate-900 dark:text-white">
              Institutional Heritage & Founding
            </h2>
            <div
              className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: website.history }}
            />
          </div>
        )}

        {/* Core Pillars Nav Grid */}
        <div className="space-y-4">
          <div>
            <h2 className="font-serif text-xl sm:text-2xl font-normal text-slate-900 dark:text-white tracking-tight">
              Explore Academic Pillars
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              In-depth documentation covering curriculum principles, campus infrastructure, and founding goals.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {sections.map((sec, idx) => (
              <Link
                key={idx}
                href={sec.href}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-2xl shadow-xs hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 block space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-base font-semibold text-slate-900 dark:text-white">
                    {sec.title}
                  </h3>
                  <span className="text-xs text-primary font-medium">Read →</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {sec.desc}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Chairman & Governance */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-normal text-slate-900 dark:text-white tracking-tight">
                Institutional Governance & Board of Members
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Board leadership, trustees, and executive guidance.
              </p>
            </div>
            <Link
              href={tenantUrl('/about/board')}
              className="text-xs sm:text-sm text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              All Board Members →
            </Link>
          </div>

          {boardMembers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {boardMembers.slice(0, 6).map((member, idx) => (
                <div
                  key={member.id || idx}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center gap-4 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300"
                >
                  {member.image ? (
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-14 h-14 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 font-bold text-xs">
                      {member.name?.slice(0, 2)?.toUpperCase() || 'BM'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-primary block truncate">
                      {member.designation}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {member.title ? `${member.title} ` : ''}
                      {member.name}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          ) : chairman ? (
            <div className="flex justify-start">
              <div className="w-full max-w-sm">
                <AuthorityCard authority={chairman} />
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Institutional leadership profiles are listed in the Authorities Directory.
            </div>
          )}
        </div>

        {/* Charter Note */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 rounded-2xl space-y-2 shadow-xs">
          <span className="text-xs uppercase tracking-[0.2em] font-semibold text-primary block">
            Quality Assurance Charter
          </span>
          <h3 className="font-serif text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
            Adherence to Educational Rigor & Compliance
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {schoolName} maintains strict academic standards with periodic faculty peer reviews, syllabus modernization, continuous laboratory audits, and transparent examination recording.
          </p>
        </div>

      </div>
    </div>
  );
};

export default About;