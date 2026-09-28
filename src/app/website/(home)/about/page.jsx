'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FiClock, 
  FiTarget, 
  FiMap, 
  FiArrowRight, 
  FiBookOpen, 
  FiMail,
  FiPhone,
  FiShield,
  FiUserCheck,
  FiAward
} from 'react-icons/fi';
import AuthorityCard from '@/component/cards/AuthorityCard';
import { SCHOOL_NAME, LOGO_URL } from '@/lib/secret';
import Image from 'next/image';

const About = () => {
  const [statsData, setStatsData] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClubs: 0,
  });
  const [chairman, setChairman] = useState(null);
  const [loading, setLoading] = useState(true);
  const [websiteSettings, setWebsiteSettings] = useState(null);
  const [schoolName, setSchoolName] = useState(SCHOOL_NAME || 'Fontana Institute of Technology');

  useEffect(() => {
    const fetchAboutData = async () => {
      setLoading(true);
      try {
        // Fetch Website Settings
        try {
          const settingsRes = await fetch('/api/website-settings');
          if (settingsRes.ok) {
            const sData = await settingsRes.json();
            const setObj = sData.payload?.settings || sData.paylod?.settings || sData.settings;
            if (setObj) {
              setWebsiteSettings(setObj);
              if (setObj.school_name) setSchoolName(setObj.school_name);
            }
          }
        } catch (e) {
          console.error('Failed to load settings:', e);
        }

        // Fetch Public Stats
        let studentsCount = 0;
        let teachersCount = 0;
        try {
          const statsRes = await fetch('/api/public/stats');
          if (statsRes.ok) {
            const stData = await statsRes.json();
            const payload = stData.payload || stData.paylod || {};
            studentsCount = payload.totalStudents || 0;
            teachersCount = payload.totalTeachers || 0;
          }
        } catch (e) {
          console.error('Failed to load stats:', e);
        }

        // Fetch Clubs Count
        let clubsCount = 0;
        try {
          const clubsRes = await fetch('/api/clubs');
          if (clubsRes.ok) {
            const clData = await clubsRes.json();
            const payload = clData.payload || clData.paylod || {};
            const clubsList = payload.clubs || [];
            clubsCount = clubsList.length;
          }
        } catch (e) {
          console.error('Failed to load clubs:', e);
        }

        setStatsData({
          totalStudents: studentsCount,
          totalTeachers: teachersCount,
          totalClubs: clubsCount,
        });

        // Fetch Chairman info from Authorities API
        try {
          const chairmanRes = await fetch('/api/authorities/role/chairman');
          if (chairmanRes.ok) {
            const cData = await chairmanRes.json();
            const payload = cData.payload || cData.paylod || {};
            const authList = payload.authorities || [];
            if (authList.length > 0) {
              setChairman(authList[0]);
            } else {
              const allAuthRes = await fetch('/api/authorities');
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
        } catch (e) {
          console.error('Failed to load chairman authority:', e);
        }
      } catch (err) {
        console.error('Error fetching about page data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAboutData();
  }, []);

  const logoSrc = websiteSettings?.logo_url || LOGO_URL;

  const stats = [
    { 
      value: `${statsData.totalStudents.toLocaleString()}+`, 
      label: 'Enrolled Students', 
      desc: 'Active learners pursuing academic programs across primary, secondary, and higher secondary tracks.', 
      color: 'from-sky-600 to-indigo-600' 
    },
    { 
      value: `${statsData.totalTeachers.toLocaleString()}+`, 
      label: 'Expert Faculty', 
      desc: 'Qualified educators, PhD holders, and dedicated academic mentors.', 
      color: 'from-amber-600 to-orange-500' 
    },
    { 
      value: `${statsData.totalClubs.toLocaleString()}+`, 
      label: 'Active Clubs', 
      desc: 'Extracurricular clubs cultivating technical skills, leadership, and community engagement.', 
      color: 'from-rose-600 to-pink-500' 
    },
  ];

  const sections = [
    {
      title: 'Our Historic Journey',
      desc: `Explore the major milestones, founding chronicles, and institutional growth of ${schoolName}.`,
      href: '/about/history',
      icon: FiClock,
      color: 'text-primary bg-primary-light border-primary-light'
    },
    {
      title: 'Vision & Core Values',
      desc: 'Learn about our long-term academic objectives, ethical guidelines, code of conduct, and dedication to research.',
      href: '/about/vision',
      icon: FiTarget,
      color: 'text-amber-600 bg-amber-50 border-amber-100'
    },
    {
      title: 'Mission Statement',
      desc: 'Read our institutional mission detailing progressive teaching frameworks and student development criteria.',
      href: '/about/mission',
      icon: FiBookOpen,
      color: 'text-primary bg-primary-light border-primary-light'
    },
    {
      title: 'Campus & Infrastructure',
      desc: 'Take a virtual tour of our state-of-the-art libraries, high-tech engineering labs, design studios, and hostels.',
      href: '/about/campus',
      icon: FiMap,
      color: 'text-rose-600 bg-rose-50 border-rose-100'
    }
  ];

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'CH';
  };

  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="w-full flex flex-col gap-16 max-w-7xl mx-auto">
        
        <div className="relative bg-slate-900 text-white rounded-3xl p-8 md:p-14 overflow-hidden shadow-xl border border-slate-800">
         
          <div className="relative z-10 text-center flex flex-col items-center gap-5">
            {logoSrc && (
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white backdrop-blur-md rounded-2xl p-2 border border-white/20 shadow-lg flex items-center justify-center">
                <Image
                  src={logoSrc}
                  alt={`${schoolName} Logo`}
                  width={96}
                  height={96}
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              {schoolName}
            </h1>
            {websiteSettings?.motto && (
              <div 
                className="text-xs sm:text-sm font-semibold text-sky-400 bg-sky-950/80 border border-sky-800/60 px-4 py-1.5 rounded-full tracking-wide prose prose-invert max-w-none [&>p]:m-0 [&>p]:inline-block"
                dangerouslySetInnerHTML={{ __html: websiteSettings.motto }}
              />
            )}
            <p className="text-slate-300 max-w-2xl mx-auto text-xs sm:text-sm md:text-base leading-relaxed mt-1">
              Dedicated to academic excellence, innovative education, and holistic student development.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex flex-col gap-2 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r bg-primary text-secondary" />
              <span className={`text-3xl md:text-4xl font-semibold `}>
                {loading ? '...' : stat.value}
              </span>
              <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                {stat.label}
              </span>
              <p className="text-slate-500 text-[11px] sm:text-xs leading-relaxed mt-1">
                {stat.desc}
              </p>
            </div>
          ))}
        </div>

        {/* History Section */}
        {websiteSettings?.history && (
          <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-10 shadow-xs flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FiClock className="text-primary text-xl" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Institutional History & Heritage
              </h2>
            </div>
            <div 
              className="prose prose-slate max-w-none text-slate-700 text-sm md:text-base leading-relaxed"
              dangerouslySetInnerHTML={{ __html: websiteSettings.history }}
            />
          </div>
        )}

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
              Explore Our Core Pillars
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm">
              Select a section below to read more about our historic milestones, academic beliefs, and campus settings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sections.map((sec, idx) => {
              const Icon = sec.icon;
              return (
                <Link
                  key={idx}
                  href={sec.href}
                  className="bg-white border border-slate-100 p-6 rounded-2xl flex flex-col gap-4 hover:shadow-sm hover:border-slate-200 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${sec.color}`}>
                      <Icon className="text-sm sm:text-base" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm sm:text-base group-hover:text-sky-650 transition-colors">
                      {sec.title}
                    </h3>
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    {sec.desc}
                  </p>
                  <div className="mt-auto pt-2 text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1 group-hover:text-primary">
                    <span>Explore</span>
                    <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                Chairman
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm">
                Executive message and governance leadership from the Chairman of the Governing Board.
              </p>
            </div>
            <Link 
              href="/administration" 
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 shrink-0"
            >
              <span>View All Administration</span>
              <FiArrowRight className="text-xs" />
            </Link>
          </div>

          {loading ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-xs animate-pulse flex flex-col md:flex-row gap-6 items-center">
              <div className="w-24 h-24 rounded-2xl bg-slate-200 shrink-0"></div>
              <div className="flex flex-col gap-3 w-full">
                <div className="w-48 h-5 bg-slate-200 rounded"></div>
                <div className="w-32 h-4 bg-slate-200 rounded"></div>
                <div className="w-full h-12 bg-slate-200 rounded"></div>
              </div>
            </div>
          ) : chairman ? (
            <div className="w-full flex justify-center items-center flex-wrap">
              <AuthorityCard authority={chairman} className="w-full max-w-sm" />
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-xs flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-primary-light text-primary flex items-center justify-center">
                <FiUserCheck className="text-2xl" />
              </div>
              <h3 className="font-semibold text-slate-800 text-base">Chairman Profile</h3>
              <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                Chairman details can be updated via the Authority Management module in the admin portal.
              </p>
              <Link 
                href="/administration" 
                className="mt-2 text-xs font-bold text-primary bg-primary-light px-4 py-2 rounded-xl hover:bg-primary-light transition-colors"
              >
                View Governance & Administration Directory
              </Link>
            </div>
          )}
        </div>

        {/* Quality Charter */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-xs flex flex-col md:flex-row gap-6 items-start relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-primary" />
          <div className="w-12 h-12 rounded-2xl bg-primary-light text-primary flex items-center justify-center shrink-0 border border-primary-light mt-1">
            <FiShield className="text-lg" />
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-slate-900 text-base sm:text-lg">
              Charter of Academic Quality
            </h3>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
              We are committed to delivering global standard technical and business administration courses. {schoolName} recruits seasoned faculty members, hosts regular career placement seminars, and maintains modern lab setups. By utilizing clean digital registry workflows, we ensure maximum transparency for students and parents alike.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default About;