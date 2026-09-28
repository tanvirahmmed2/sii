'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  BiBriefcase,
  BiMapPin,
  BiTime,
  BiSearch,
  BiDollarCircle,
  BiRightArrowAlt,
  BiGlobe,
  BiHeart,
  BiRocket,
  BiLaptop,
  BiTrendingUp,
  BiSpeaker,
} from 'react-icons/bi';
import { SITE_NAME } from '@/lib/db/secret';

export default function CareersPage() {
  const [careers, setCareers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedWorkplace, setSelectedWorkplace] = useState('All');

  useEffect(() => {
    async function loadCareers() {
      try {
        setLoading(true);
        const res = await fetch('/api/careers');
        const data = await res.json();
        if (data.success) {
          setCareers(data.careers || []);
          setDepartments(data.departments || []);
        }
      } catch (err) {
        console.error('Failed to load careers:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCareers();
  }, []);

  const filteredCareers = useMemo(() => {
    return careers.filter((job) => {
      const matchDept = selectedDept === 'All' || job.department === selectedDept;
      const matchType = selectedType === 'All' || job.job_type === selectedType;
      const matchWorkplace = selectedWorkplace === 'All' || job.workplace_type === selectedWorkplace;
      const matchSearch =
        !search.trim() ||
        job.title.toLowerCase().includes(search.toLowerCase()) ||
        job.department.toLowerCase().includes(search.toLowerCase()) ||
        job.location.toLowerCase().includes(search.toLowerCase()) ||
        job.description.toLowerCase().includes(search.toLowerCase());

      return matchDept && matchType && matchWorkplace && matchSearch;
    });
  }, [careers, selectedDept, selectedType, selectedWorkplace, search]);

  const culturePerks = [
    {
      icon: BiGlobe,
      title: 'Work From Anywhere',
      desc: 'Our team is distributed across the globe. Work from wherever you do your most impactful thinking.',
    },
    {
      icon: BiRocket,
      title: 'Accelerated Ownership',
      desc: 'No bureaucracy. Ship products directly to hundreds of thousands of creators and see immediate impact.',
    },
    {
      icon: BiTrendingUp,
      title: 'Competitive Compensation',
      desc: 'Top-tier global salaries, equity incentives, and performance bonuses that reward your dedication.',
    },
    {
      icon: BiLaptop,
      title: 'Home Office & Tech Stipend',
      desc: 'Get your dream setup equipped with latest hardware, ergonomic accessories, and high-speed internet reimbursement.',
    },
    {
      icon: BiHeart,
      title: 'Wellness & Health First',
      desc: 'Comprehensive health coverage, mental wellness memberships, and generous parental leave.',
    },
    {
      icon: BiSpeaker,
      title: 'Unlimited Paid Time Off',
      desc: 'Take the time you need to recharge, explore new hobbies, and spend quality moments with loved ones.',
    },
  ];

  return (
    <div className="w-full min-h-screen bg-slate-50/50 dark:bg-slate-950 py-12 md:py-16 px-4 sm:px-6 lg:px-8 space-y-16">
      
      <div className="max-w-6xl mx-auto text-center space-y-5">
       
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold text-slate-900 dark:text-white tracking-tight leading-tight">
          Build The Next Generation of {SITE_NAME}
          Web & Portfolio Creation
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          We empower creators, developers, and brands worldwide to launch breathtaking digital portfolios in minutes. Come build high-impact products with our mission-driven team.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <a
            href="#openings"
            className="px-6 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold shadow-md hover:opacity-95 transition-all"
          >
            Explore Open Positions ({careers.length})
          </a>
          <a
            href="#culture"
            className="px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          >
            Our Culture & Perks
          </a>
        </div>
      </div>

      {/* Culture & Perks Grid */}
      <div id="culture" className="max-w-6xl mx-auto space-y-8 scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white">
            Why You’ll Love Working With Us
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            We foster an empathetic, high-trust environment where ambitious people do their life’s best work.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {culturePerks.map((perk, i) => {
            const Icon = perk.icon;
            return (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all space-y-3"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-2xl">
                  <Icon />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {perk.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {perk.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Job Openings Section */}
      <div id="openings" className="max-w-6xl mx-auto space-y-6 scroll-mt-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Careers & Opportunities
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white mt-1">
              Current Open Roles
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Showing {filteredCareers.length} of {careers.length} openings
          </span>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          {/* Search Input */}
          <div className="relative">
            <BiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
            <input
              type="text"
              placeholder="Search by job title, skill, or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {/* Department Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">
              Department:
            </span>
            <button
              type="button"
              onClick={() => setSelectedDept('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedDept === 'All'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Departments
            </button>
            {departments.map((dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => setSelectedDept(dept)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedDept === dept
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          {/* Type & Workplace filters */}
          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Workplace:
              </span>
              <select
                value={selectedWorkplace}
                onChange={(e) => setSelectedWorkplace(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="All">All Types</option>
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
                <option value="ON_SITE">On-Site</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Type:
              </span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="All">All Employment</option>
                <option value="FULL_TIME">Full-Time</option>
                <option value="PART_TIME">Part-Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERNSHIP">Internship</option>
              </select>
            </div>

            {(selectedDept !== 'All' || selectedType !== 'All' || selectedWorkplace !== 'All' || search) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDept('All');
                  setSelectedType('All');
                  setSelectedWorkplace('All');
                  setSearch('');
                }}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer ml-auto"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-slate-200 border-t-indigo-600 mb-3" />
            <p className="text-sm font-semibold text-slate-500">Loading open positions...</p>
          </div>
        ) : filteredCareers.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 flex items-center justify-center text-indigo-500 text-3xl">
              <BiBriefcase />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              No matching positions found
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              We couldn't find any job posts matching your criteria. Try resetting your search or filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredCareers.map((job) => (
              <div
                key={job.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-xs hover:shadow-md transition-all p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 group"
              >
                {/* Details */}
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                      {job.department}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {job.job_type.replace('_', ' ')}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <BiMapPin className="text-slate-400" />
                      {job.location} ({job.workplace_type})
                    </span>
                    {job.is_featured && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                        ★ Featured
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {job.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                      {job.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                    {job.salary_range && (
                      <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                        <BiDollarCircle className="text-slate-400 text-sm" />
                        {job.salary_range}
                      </span>
                    )}
                    {job.deadline && (
                      <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                        <BiTime />
                        Closes: {new Date(job.deadline).toLocaleDateString()}
                      </span>
                    )}
                    <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* CTA */}
                <div className="shrink-0 pt-2 md:pt-0">
                  <Link
                    href={`/careers/${job.slug}`}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-xs shadow-indigo-200 dark:shadow-none transition-all w-full md:w-auto"
                  >
                    <span>View Role & Apply</span>
                    <BiRightArrowAlt className="text-lg group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
