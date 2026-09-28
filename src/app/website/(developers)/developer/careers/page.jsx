'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  BiBriefcase,
  BiPlus,
  BiTrash,
  BiEdit,
  BiRefresh,
  BiUser,
  BiCalendar,
  BiMapPin,
  BiDollarCircle,
  BiCheckCircle,
  BiXCircle,
  BiSearch,
  BiX,
  BiChevronRight,
  BiLinkExternal,
  BiFile,
  BiEnvelope,
  BiPhone,
  BiFilter,
  BiTime,
  BiTrendingUp,
  BiBadgeCheck,
  BiSave,
  BiCommentDetail,
} from 'react-icons/bi';

const DEPARTMENTS = [
  'Engineering',
  'Design & UX',
  'Product',
  'Marketing & Growth',
  'Customer Support',
  'Sales & BD',
  'Operations & HR',
];

const JOB_TYPES = [
  { value: 'FULL_TIME', label: 'Full-Time' },
  { value: 'PART_TIME', label: 'Part-Time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'REMOTE', label: 'Remote' },
];

const WORKPLACE_TYPES = [
  { value: 'REMOTE', label: 'Remote' },
  { value: 'HYBRID', label: 'Hybrid' },
  { value: 'ON_SITE', label: 'On-Site' },
];

const EXP_LEVELS = [
  { value: 'ENTRY_LEVEL', label: 'Entry Level' },
  { value: 'MID_LEVEL', label: 'Mid Level' },
  { value: 'SENIOR', label: 'Senior' },
  { value: 'LEAD', label: 'Lead / Principal' },
  { value: 'EXECUTIVE', label: 'Executive' },
];

const APPLICATION_STATUSES = [
  { value: 'PENDING', label: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'REVIEWING', label: 'Reviewing', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'SHORTLISTED', label: 'Shortlisted', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'INTERVIEW', label: 'Interview', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'HIRED', label: 'Hired', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'REJECTED', label: 'Rejected', color: 'bg-rose-50 text-rose-700 border-rose-200' },
];

export default function DeveloperCareersPage() {
  const [careers, setCareers] = useState([]);
  const [stats, setStats] = useState({
    total_jobs: 0,
    active_jobs: 0,
    total_applications: 0,
    pending_applications: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '', 'active', 'draft'

  // Job Modal (Create/Edit)
  const [showJobModal, setShowJobModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [savingJob, setSavingJob] = useState(false);
  const [jobForm, setJobForm] = useState({
    title: '',
    slug: '',
    department: 'Engineering',
    job_type: 'FULL_TIME',
    workplace_type: 'REMOTE',
    location: 'Remote',
    experience_level: 'MID_LEVEL',
    salary_range: '',
    deadline: '',
    is_published: true,
    is_featured: false,
    description: '',
    requirements: '',
    responsibilities: '',
    benefits: '',
  });

  // Applications Drawer / Modal
  const [activeJobForApps, setActiveJobForApps] = useState(null);
  const [applications, setApplications] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appStatusFilter, setAppStatusFilter] = useState('ALL');
  const [appCounts, setAppCounts] = useState({});
  const [updatingAppId, setUpdatingAppId] = useState(null);
  const [notesState, setNotesState] = useState({});

  const fetchCareers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/developer/careers?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCareers(data.careers || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch careers:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchCareers();
  }, [fetchCareers]);

  // Open Create Job
  const handleOpenCreate = () => {
    setEditingJob(null);
    setJobForm({
      title: '',
      slug: '',
      department: 'Engineering',
      job_type: 'FULL_TIME',
      workplace_type: 'REMOTE',
      location: 'Remote',
      experience_level: 'MID_LEVEL',
      salary_range: '',
      deadline: '',
      is_published: true,
      is_featured: false,
      description: '',
      requirements: '',
      responsibilities: '',
      benefits: '',
    });
    setShowJobModal(true);
  };

  // Open Edit Job
  const handleOpenEdit = (job) => {
    setEditingJob(job);
    setJobForm({
      title: job.title || '',
      slug: job.slug || '',
      department: job.department || 'Engineering',
      job_type: job.job_type || 'FULL_TIME',
      workplace_type: job.workplace_type || 'REMOTE',
      location: job.location || 'Remote',
      experience_level: job.experience_level || 'MID_LEVEL',
      salary_range: job.salary_range || '',
      deadline: job.deadline ? job.deadline.split('T')[0] : '',
      is_published: Boolean(job.is_published),
      is_featured: Boolean(job.is_featured),
      description: job.description || '',
      requirements: job.requirements || '',
      responsibilities: job.responsibilities || '',
      benefits: job.benefits || '',
    });
    setShowJobModal(true);
  };

  // Save Job Form
  const handleSaveJob = async (e) => {
    e.preventDefault();
    if (!jobForm.title.trim() || !jobForm.description.trim()) {
      alert('Please fill in required fields (Title & Description)');
      return;
    }

    try {
      setSavingJob(true);
      const url = editingJob
        ? `/api/developer/careers/${editingJob.id}`
        : '/api/developer/careers';
      const method = editingJob ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobForm),
      });

      const data = await res.json();
      if (data.success) {
        setShowJobModal(false);
        fetchCareers();
      } else {
        alert(data.error || 'Failed to save job posting.');
      }
    } catch (err) {
      console.error('Error saving job:', err);
      alert('An unexpected error occurred.');
    } finally {
      setSavingJob(false);
    }
  };

  // Delete Job
  const handleDeleteJob = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? All associated applications will also be deleted.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/developer/careers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchCareers();
      } else {
        alert(data.error || 'Failed to delete job posting.');
      }
    } catch (err) {
      console.error('Error deleting job:', err);
      alert('Failed to delete job posting.');
    }
  };

  // Toggle Publish
  const handleTogglePublish = async (job) => {
    try {
      const res = await fetch(`/api/developer/careers/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...job,
          is_published: !job.is_published,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchCareers();
      }
    } catch (err) {
      console.error('Error toggling publish:', err);
    }
  };

  // Open Applications Drawer
  const handleOpenApplications = async (job) => {
    setActiveJobForApps(job);
    setAppStatusFilter('ALL');
    fetchApplications(job.id, 'ALL');
  };

  const fetchApplications = async (jobId, status = 'ALL') => {
    try {
      setAppsLoading(true);
      const url = `/api/developer/careers/${jobId}/applications?status=${status}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setApplications(data.applications || []);
        setAppCounts(data.counts || {});
        // Pre-fill notesState
        const notesObj = {};
        (data.applications || []).forEach((a) => {
          notesObj[a.id] = a.reviewer_notes || '';
        });
        setNotesState(notesObj);
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setAppsLoading(false);
    }
  };

  // Update Application Status
  const handleUpdateAppStatus = async (appId, newStatus) => {
    try {
      setUpdatingAppId(appId);
      const res = await fetch(`/api/developer/careers/applications/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setApplications((prev) =>
          prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
        );
        if (activeJobForApps) {
          fetchApplications(activeJobForApps.id, appStatusFilter);
          fetchCareers();
        }
      } else {
        alert(data.error || 'Failed to update status.');
      }
    } catch (err) {
      console.error('Error updating application status:', err);
    } finally {
      setUpdatingAppId(null);
    }
  };

  // Save Application Note
  const handleSaveAppNote = async (appId) => {
    const note = notesState[appId] || '';
    try {
      setUpdatingAppId(appId);
      const res = await fetch(`/api/developer/careers/applications/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewer_notes: note }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Reviewer note saved successfully!');
      } else {
        alert(data.error || 'Failed to save note.');
      }
    } catch (err) {
      console.error('Error saving note:', err);
    } finally {
      setUpdatingAppId(null);
    }
  };

  // Delete Application
  const handleDeleteApplication = async (appId, applicantName) => {
    if (!window.confirm(`Delete application from ${applicantName}?`)) return;

    try {
      const res = await fetch(`/api/developer/careers/applications/${appId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setApplications((prev) => prev.filter((a) => a.id !== appId));
        if (activeJobForApps) {
          fetchApplications(activeJobForApps.id, appStatusFilter);
          fetchCareers();
        }
      }
    } catch (err) {
      console.error('Error deleting application:', err);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50/60 p-4 md:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl text-xl font-bold">
              <BiBriefcase />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Careers & Hiring Portal
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Create, publish, and manage job openings and review candidate applications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/careers"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <BiLinkExternal className="text-base text-slate-500" />
            View Public Portal
          </Link>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-xs shadow-indigo-200 transition-all cursor-pointer"
          >
            <BiPlus className="text-lg" />
            Create Job Post
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-2xl">
            <BiBriefcase />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Openings
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats.total_jobs}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 text-2xl">
            <BiCheckCircle />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Published Active
            </p>
            <h3 className="text-2xl font-bold text-emerald-700 mt-0.5">{stats.active_jobs}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 text-2xl">
            <BiUser />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Applicants
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats.total_applications}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 text-2xl">
            <BiTime />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Review
            </p>
            <h3 className="text-2xl font-bold text-amber-600 mt-0.5">
              {stats.pending_applications}
            </h3>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <BiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
          <input
            type="text"
            placeholder="Search by job title, department, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === ''
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Roles
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Active Only
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('draft')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'draft'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Drafts
          </button>

          <button
            type="button"
            onClick={fetchCareers}
            title="Refresh"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <BiRefresh className="text-lg" />
          </button>
        </div>
      </div>

      {/* Jobs List */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-slate-200 border-t-indigo-600 mb-3" />
          <p className="text-sm font-semibold text-slate-600">Loading career listings...</p>
        </div>
      ) : careers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 text-3xl">
            <BiBriefcase />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Job Postings Found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
            Get started by creating your first job opening to attract top candidates to your team.
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <BiPlus className="text-lg" />
            Create Job Post
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {careers.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 shadow-xs p-5 md:p-6 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5"
            >
              {/* Left Column: Job Info */}
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {job.department}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700">
                    {job.job_type.replace('_', ' ')}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 flex items-center gap-1">
                    <BiMapPin className="text-slate-400" />
                    {job.location} ({job.workplace_type})
                  </span>
                  {job.is_featured && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800">
                      ★ Featured
                    </span>
                  )}
                  {job.is_published ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      Draft
                    </span>
                  )}
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                    {job.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                    {job.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                  {job.salary_range && (
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <BiDollarCircle className="text-slate-400 text-sm" />
                      {job.salary_range}
                    </span>
                  )}
                  {job.deadline && (
                    <span className="flex items-center gap-1">
                      <BiCalendar className="text-slate-400 text-sm" />
                      Deadline: {new Date(job.deadline).toLocaleDateString()}
                    </span>
                  )}
                  <span className="text-slate-400">
                    Posted {new Date(job.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Right Column: Applicants counter & Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                {/* Applicants Counter Button */}
                <button
                  type="button"
                  onClick={() => handleOpenApplications(job)}
                  className="px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold flex items-center justify-between sm:justify-start gap-3 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5">
                    <BiUser className="text-base text-indigo-600" />
                    <span>Applications:</span>
                    <span className="font-bold text-sm bg-white px-2 py-0.5 rounded-md border border-indigo-200 shadow-2xs">
                      {job.total_applications || 0}
                    </span>
                  </div>
                  {Number(job.pending_applications) > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white">
                      {job.pending_applications} pending
                    </span>
                  )}
                  <BiChevronRight className="text-base group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Actions */}
                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleTogglePublish(job)}
                    title={job.is_published ? 'Unpublish (set to draft)' : 'Publish job'}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                      job.is_published
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {job.is_published ? 'Published' : 'Draft'}
                  </button>

                  <Link
                    href={`/careers/${job.slug}`}
                    target="_blank"
                    title="View public preview"
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <BiLinkExternal className="text-lg" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(job)}
                    title="Edit job"
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    <BiEdit className="text-lg" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteJob(job.id, job.title)}
                    title="Delete job"
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
                  >
                    <BiTrash className="text-lg" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===================================================================== */}
      {/* CREATE / EDIT JOB MODAL */}
      {/* ===================================================================== */}
      {showJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl text-lg font-bold">
                  <BiBriefcase />
                </span>
                <h3 className="font-bold text-slate-900 text-lg">
                  {editingJob ? 'Edit Job Opening' : 'Create New Job Opening'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowJobModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <BiX className="text-2xl" />
              </button>
            </div>

            <form onSubmit={handleSaveJob} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Job Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Full-Stack Engineer"
                    value={jobForm.title}
                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-900"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Department <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={jobForm.department}
                    onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-indigo-500 bg-white text-slate-800"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Job Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Employment Type
                  </label>
                  <select
                    value={jobForm.job_type}
                    onChange={(e) => setJobForm({ ...jobForm, job_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-indigo-500 bg-white text-slate-800"
                  >
                    {JOB_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Workplace Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Workplace Setup
                  </label>
                  <select
                    value={jobForm.workplace_type}
                    onChange={(e) => setJobForm({ ...jobForm, workplace_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-indigo-500 bg-white text-slate-800"
                  >
                    {WORKPLACE_TYPES.map((w) => (
                      <option key={w.value} value={w.value}>
                        {w.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Remote, Worldwide, New York, NY"
                    value={jobForm.location}
                    onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-indigo-500 text-slate-800"
                  />
                </div>

                {/* Experience Level */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Experience Level
                  </label>
                  <select
                    value={jobForm.experience_level}
                    onChange={(e) => setJobForm({ ...jobForm, experience_level: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-indigo-500 bg-white text-slate-800"
                  >
                    {EXP_LEVELS.map((exp) => (
                      <option key={exp.value} value={exp.value}>
                        {exp.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Salary Range */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Salary Indication
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. $80,000 - $120,000 / year or Competitive"
                    value={jobForm.salary_range}
                    onChange={(e) => setJobForm({ ...jobForm, salary_range: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-indigo-500 text-slate-800"
                  />
                </div>

                {/* Deadline */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Application Deadline
                  </label>
                  <input
                    type="date"
                    value={jobForm.deadline}
                    onChange={(e) => setJobForm({ ...jobForm, deadline: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-indigo-500 bg-white text-slate-800"
                  />
                </div>

                {/* Flags: Published & Featured */}
                <div className="flex items-center gap-6 pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={jobForm.is_published}
                      onChange={(e) => setJobForm({ ...jobForm, is_published: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span className="text-sm font-semibold text-slate-800">Publish Immediately</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={jobForm.is_featured}
                      onChange={(e) => setJobForm({ ...jobForm, is_featured: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span className="text-sm font-semibold text-slate-800">Featured Role</span>
                  </label>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Role Overview & Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe the mission of this role and why it matters..."
                  value={jobForm.description}
                  onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-indigo-500 text-slate-800"
                />
              </div>

              {/* Responsibilities */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Key Responsibilities
                </label>
                <textarea
                  rows={3}
                  placeholder="List primary duties (one per line)..."
                  value={jobForm.responsibilities}
                  onChange={(e) => setJobForm({ ...jobForm, responsibilities: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-indigo-500 text-slate-800"
                />
              </div>

              {/* Requirements */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Qualifications & Requirements
                </label>
                <textarea
                  rows={3}
                  placeholder="Required skills, background, tech stack (one per line)..."
                  value={jobForm.requirements}
                  onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-indigo-500 text-slate-800"
                />
              </div>

              {/* Benefits */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Benefits & Perks
                </label>
                <textarea
                  rows={3}
                  placeholder="Health insurance, remote work stipend, flexible PTO, etc..."
                  value={jobForm.benefits}
                  onChange={(e) => setJobForm({ ...jobForm, benefits: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-indigo-500 text-slate-800"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowJobModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingJob}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-xs shadow-indigo-200 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {savingJob ? 'Saving Job...' : editingJob ? 'Update Job' : 'Create Job Opening'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* CANDIDATE APPLICATIONS DRAWER / MODAL */}
      {/* ===================================================================== */}
      {activeJobForApps && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Candidate Applications
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  {activeJobForApps.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveJobForApps(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <BiX className="text-2xl" />
              </button>
            </div>

            {/* Status Filter Bar */}
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto bg-white">
              {['ALL', 'PENDING', 'REVIEWING', 'SHORTLISTED', 'INTERVIEW', 'HIRED', 'REJECTED'].map(
                (st) => {
                  const count =
                    st === 'ALL'
                      ? appCounts.total || 0
                      : appCounts[st.toLowerCase()] || 0;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setAppStatusFilter(st);
                        fetchApplications(activeJobForApps.id, st);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                        appStatusFilter === st
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span>{st === 'ALL' ? 'All Candidates' : st}</span>
                      <span className="opacity-80 text-[11px]">({count})</span>
                    </button>
                  );
                }
              )}
            </div>

            {/* Applications List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/40">
              {appsLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-7 w-7 border-3 border-slate-200 border-t-indigo-600 mb-2" />
                  <p className="text-xs font-semibold text-slate-500">Loading applications...</p>
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-2xl">
                    <BiUser />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No applications found</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    {appStatusFilter === 'ALL'
                      ? 'No candidates have submitted an application for this position yet.'
                      : `No applications with status "${appStatusFilter}".`}
                  </p>
                </div>
              ) : (
                applications.map((app) => {
                  const statusObj =
                    APPLICATION_STATUSES.find((s) => s.value === app.status) ||
                    APPLICATION_STATUSES[0];

                  return (
                    <div
                      key={app.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 hover:border-slate-300 transition-colors"
                    >
                      {/* Candidate Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-base font-bold text-slate-900">
                            {app.applicant_name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                            <a
                              href={`mailto:${app.applicant_email}`}
                              className="flex items-center gap-1 hover:text-indigo-600"
                            >
                              <BiEnvelope className="text-slate-400" />
                              {app.applicant_email}
                            </a>
                            {app.applicant_phone && (
                              <a
                                href={`tel:${app.applicant_phone}`}
                                className="flex items-center gap-1 hover:text-indigo-600"
                              >
                                <BiPhone className="text-slate-400" />
                                {app.applicant_phone}
                              </a>
                            )}
                            <span className="flex items-center gap-1 text-slate-400">
                              <BiCalendar />
                              {new Date(app.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Status Selector Dropdown */}
                        <div className="shrink-0">
                          <select
                            value={app.status}
                            disabled={updatingAppId === app.id}
                            onChange={(e) => handleUpdateAppStatus(app.id, e.target.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer focus:outline-hidden ${statusObj.color}`}
                          >
                            {APPLICATION_STATUSES.map((st) => (
                              <option key={st.value} value={st.value}>
                                {st.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Links: Resume, Portfolio, LinkedIn */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {app.resume_url && (
                          <a
                            href={app.resume_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-colors"
                          >
                            <BiFile className="text-sm" />
                            Open Resume / CV
                            <BiLinkExternal className="text-xs" />
                          </a>
                        )}

                        {app.portfolio_url && (
                          <a
                            href={app.portfolio_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
                          >
                            Portfolio / GitHub
                            <BiLinkExternal className="text-xs" />
                          </a>
                        )}

                        {app.linkedin_url && (
                          <a
                            href={app.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
                          >
                            LinkedIn Profile
                            <BiLinkExternal className="text-xs" />
                          </a>
                        )}
                      </div>

                      {/* Cover Letter */}
                      {app.cover_letter && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-700">
                          <p className="font-bold text-slate-900 mb-1">Cover Note:</p>
                          <p className="whitespace-pre-line leading-relaxed">{app.cover_letter}</p>
                        </div>
                      )}

                      {/* Reviewer Notes Box */}
                      <div className="pt-2 border-t border-slate-100">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Internal Hiring Notes
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Add private feedback, interview remarks..."
                            value={notesState[app.id] ?? ''}
                            onChange={(e) =>
                              setNotesState({ ...notesState, [app.id]: e.target.value })
                            }
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 text-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveAppNote(app.id)}
                            disabled={updatingAppId === app.id}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <BiSave className="text-sm" />
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteApplication(app.id, app.applicant_name)}
                            title="Delete candidate application"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
                          >
                            <BiTrash className="text-base" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
