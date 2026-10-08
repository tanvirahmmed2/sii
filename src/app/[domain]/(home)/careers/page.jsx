'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function CareersPage() {
  const { website, tenantUrl } = useTenantWebsite();
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
        const res = await fetch('/api/marketing/careers');
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
        (job.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (job.department || '').toLowerCase().includes(search.toLowerCase()) ||
        (job.location || '').toLowerCase().includes(search.toLowerCase()) ||
        (job.description || '').toLowerCase().includes(search.toLowerCase());

      return matchDept && matchType && matchWorkplace && matchSearch;
    });
  }, [careers, selectedDept, selectedType, selectedWorkplace, search]);

  const culturePoints = [
    {
      title: 'Academic Autonomy & Rigor',
      desc: 'Our faculty members are empowered with modern curricula, digital classroom systems, and pedagogical freedom.',
    },
    {
      title: 'Continuous Professional Growth',
      desc: 'Annual workshops, certification sponsorships, and career advancement paths for both teaching and non-teaching personnel.',
    },
    {
      title: 'Competitive Compensation & Benefits',
      desc: 'Competitive salary frameworks according to educational standards, provident funds, and health allowances.',
    },
    {
      title: 'Supportive Campus Culture',
      desc: 'A collaborative academic environment built on mutual respect, student mentorship, and community service.',
    },
  ];

  return (
    <div className="w-full min-h-screen py-8 md:py-12 px-4 sm:px-6 lg:px-8 space-y-10">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-8 max-w-4xl mx-auto text-center space-y-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block">
          Faculty &amp; Staff Recruitment
        </span>
        <h1 className="text-2xl sm:text-4xl font-semibold text-slate-900 dark:text-white tracking-tight">
          Join the {website?.name || 'Academic'} Team
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Explore faculty positions, administrative appointments, and student-affairs careers dedicated to shaping the next generation of scholars and leaders.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <a
            href="#openings"
            className="px-4 py-2 rounded bg-primary hover:bg-primary-dark text-white text-xs font-medium transition-colors"
          >
            View Open Positions ({careers.length})
          </a>
          <a
            href="#culture"
            className="px-4 py-2 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
          >
            Working at {website?.name || 'Our Institution'}
          </a>
        </div>
      </div>

      {/* Institutional Culture Highlights */}
      <div id="culture" className="max-w-5xl mx-auto space-y-4 scroll-mt-20">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Why Build Your Career Here
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            A purposeful workplace that prioritizes educational impact and professional dignity.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {culturePoints.map((item, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 p-4 rounded-md border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5"
            >
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block">
                [Pillar 0{idx + 1}]
              </span>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
                {item.title}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Job Openings Section */}
      <div id="openings" className="max-w-5xl mx-auto space-y-5 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Open Positions
            </h2>
            <p className="text-xs text-slate-400">
              Showing {filteredCareers.length} of {careers.length} current opportunities
            </p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-md border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div>
            <input
              type="text"
              placeholder="Search by position title, department, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mr-1">
              Department:
            </span>
            <button
              type="button"
              onClick={() => setSelectedDept('All')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                selectedDept === 'All'
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              All
            </button>
            {departments.map((dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => setSelectedDept(dept)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  selectedDept === dept
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-400 uppercase">Workplace:</span>
              <select
                value={selectedWorkplace}
                onChange={(e) => setSelectedWorkplace(e.target.value)}
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="All">All Types</option>
                <option value="ON_SITE">On-Site</option>
                <option value="HYBRID">Hybrid</option>
                <option value="REMOTE">Remote</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-400 uppercase">Employment:</span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="All">All Forms</option>
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
                className="text-xs text-rose-600 hover:underline cursor-pointer ml-auto"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Positions List */}
        {loading ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-400">Loading open positions...</span>
          </div>
        ) : filteredCareers.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 space-y-2 p-6">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
              [No Vacancies Found]
            </span>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              No matching positions currently posted
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              We currently have no published openings matching your filter selection. You may submit a general inquiry to the registrar office.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCareers.map((job) => (
              <div
                key={job.id}
                className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-primary/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                      {job.department}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {(job.job_type || '').replace('_', ' ')}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {job.location} ({job.workplace_type})
                    </span>
                    {job.is_featured && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        [Priority Hire]
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      <Link href={tenantUrl(`/careers/${job.slug}`)} className="hover:text-primary transition-colors">
                        {job.title}
                      </Link>
                    </h3>
                    {job.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
                        {job.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                    {job.salary_range && (
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        Scale: {job.salary_range}
                      </span>
                    )}
                    {job.deadline && (
                      <span className="text-rose-600 dark:text-rose-400 font-medium">
                        Deadline: {new Date(job.deadline).toLocaleDateString()}
                      </span>
                    )}
                    <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="shrink-0 pt-2 md:pt-0">
                  <Link
                    href={tenantUrl(`/careers/${job.slug}`)}
                    className="inline-block px-4 py-2 rounded bg-primary hover:bg-primary-dark text-white text-xs font-medium transition-colors text-center w-full md:w-auto"
                  >
                    View Role &amp; Apply →
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
