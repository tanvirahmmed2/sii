'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCreator } from '../layout';
import {
  BiBriefcase,
  BiPlus,
  BiSearch,
  BiRefresh,
  BiCheckCircle,
  BiTimeFive,
  BiDollarCircle,
  BiMessageSquareDetail,
  BiCalendar,
  BiX,
  BiLoaderAlt,
  BiRightArrowAlt,
  BiImage,
  BiLayer,
} from 'react-icons/bi';

export default function CreatorProjectsListPage() {
  const router = useRouter();
  const { creatorId, creator, projects: contextProjects = [], refetch } = useCreator();

  const [projects, setProjects] = useState(contextProjects);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('CUSTOM_FEATURE');
  const [priority, setPriority] = useState('MEDIUM');
  const [estimatedBudget, setEstimatedBudget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Fetch projects from dedicated creator projects API
  const fetchProjects = useCallback(async (showLoading = false) => {
    if (!creatorId) return;
    try {
      if (showLoading) setLoading(true);
      const res = await fetch(`/api/creator/projects?creatorId=${creatorId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.projects)) {
        setProjects(data.projects);
      }
    } catch (err) {
      console.error('Error fetching creator projects:', err);
    } finally {
      setLoading(false);
    }
  }, [creatorId]);

  useEffect(() => {
    fetchProjects(true);
  }, [fetchProjects]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setFormError('Please enter a project title and detailed description.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const budgetCents = estimatedBudget ? Math.round(parseFloat(estimatedBudget) * 100) : 0;

      const res = await fetch('/api/creator/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: Number(creatorId),
          title: title.trim(),
          description: description.trim(),
          category,
          budget_in_cents: budgetCents,
          priority,
          deadline: deadline ? new Date(deadline).toISOString() : null,
          initial_message: description.trim(),
          image_url: imageUrl.trim() || null,
        }),
      });

      const data = await res.json();
      if (data.success && data.project) {
        setFormSuccess(`Custom project #${data.project.project_number} submitted successfully!`);
        setTitle('');
        setDescription('');
        setEstimatedBudget('');
        setDeadline('');
        setImageUrl('');
        setShowCreateModal(false);

        await fetchProjects(false);
        if (refetch) refetch();

        // Redirect to new project conversation page
        router.push(`/creator/${creatorId}/projects/${data.project.id}`);
      } else {
        setFormError(data.error || 'Failed to submit project request.');
      }
    } catch (err) {
      console.error('Error submitting custom project:', err);
      setFormError('Network error while creating project.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'ACTIVE') {
        if (p.working_status === 'COMPLETED' || p.working_status === 'CANCELLED') return false;
      } else if (p.working_status !== statusFilter) {
        return false;
      }
    }
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.project_number?.toLowerCase().includes(q) ||
      p.title?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.working_status?.toLowerCase().includes(q)
    );
  });

  const workingStatusStyles = {
    PENDING_REVIEW: {
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      label: 'Pending Review',
      hint: 'Under evaluation by our engineering team. We will review and provide a quotation shortly.',
    },
    ACCEPTED: {
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      label: 'Accepted',
      hint: 'Accepted! Scheduled for kickoff.',
    },
    IN_PROGRESS: {
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      label: 'In Progress',
      hint: 'Our developers are actively building and implementing your custom project.',
    },
    UNDER_REVIEW: {
      badge: 'bg-purple-50 text-purple-700 border-purple-200',
      label: 'Ready for Review',
      hint: 'Implementation completed and ready for your testing and feedback.',
    },
    COMPLETED: {
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      label: 'Completed',
      hint: 'Project delivered, approved, and concluded.',
    },
    ON_HOLD: {
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
      label: 'On Hold',
      hint: 'Temporarily on hold awaiting inputs or requirements clarification.',
    },
    CANCELLED: {
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      label: 'Cancelled',
      hint: 'Project cancelled.',
    },
  };

  const paymentStatusStyles = {
    PENDING_QUOTE: 'bg-amber-50 text-amber-700 border-amber-200',
    UNPAID: 'bg-rose-50 text-rose-700 border-rose-200',
    PARTIAL: 'bg-blue-50 text-blue-700 border-blue-200',
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REFUNDED: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Custom Projects
            </h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Bespoke Development
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Need custom features, third-party integrations, custom portfolio designs, or bespoke automation?
            Collaborate directly with our engineering team from specification to deployment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchProjects(true)}
            disabled={loading}
            className="p-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh custom projects"
          >
            <BiRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setFormError('');
              setFormSuccess('');
              setShowCreateModal(true);
            }}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <BiPlus className="w-4 h-4 text-base" />
            <span>Request Custom Project</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'ALL', label: 'All Projects' },
            { id: 'ACTIVE', label: 'Active Projects' },
            { id: 'PENDING_REVIEW', label: 'Pending Review' },
            { id: 'IN_PROGRESS', label: 'In Progress' },
            { id: 'UNDER_REVIEW', label: 'Under Review' },
            { id: 'COMPLETED', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <BiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects by title, ID, category..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
          />
        </div>
      </div>

      {/* Projects Grid / Cards */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
          <BiLoaderAlt className="w-8 h-8 animate-spin text-indigo-600" />
          <span>Loading your custom projects...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-3 text-indigo-600">
            <BiBriefcase className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {searchTerm || statusFilter !== 'ALL'
              ? 'No matching custom projects'
              : 'No custom projects yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
            {searchTerm || statusFilter !== 'ALL'
              ? 'Try adjusting your search terms or filter selection.'
              : 'Have a special design requirement, API integration, or custom feature in mind? Request a custom project to get started.'}
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <BiPlus className="w-4 h-4" />
            <span>Create Your First Project</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((p) => {
            const statusConfig = workingStatusStyles[p.working_status] || {
              badge: 'bg-slate-100 text-slate-600 border-slate-200',
              label: p.working_status || 'PENDING',
              hint: 'In progress',
            };
            const budgetDollars = (Number(p.budget_in_cents || 0) / 100).toFixed(2);
            const paidDollars = (Number(p.paid_amount_in_cents || 0) / 100).toFixed(2);

            return (
              <div
                key={p.id}
                onClick={() => router.push(`/creator/${creatorId}/projects/${p.id}`)}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: ID and Status Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        #{p.project_number}
                      </span>
                      <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                        {p.category ? p.category.replace('_', ' ') : 'Custom'}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusConfig.badge}`}
                    >
                      {statusConfig.label}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {p.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {p.description || 'No detailed description.'}
                  </p>

                  {/* Progress Hint */}
                  <div className="mt-3.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 flex items-start gap-2">
                    <BiTimeFive className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                    <span>{statusConfig.hint}</span>
                  </div>
                </div>

                {/* Footer Metrics */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                        Quotation
                      </span>
                      <span className="font-bold text-slate-800">
                        {Number(p.budget_in_cents || 0) > 0
                          ? `$${budgetDollars} ${p.currency || 'USD'}`
                          : 'Pending Quote'}
                      </span>
                    </div>

                    <div className="h-6 w-px bg-slate-200" />

                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                        Payment
                      </span>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold border uppercase tracking-wider ${
                          paymentStatusStyles[p.payment_status] || 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {p.payment_status ? p.payment_status.replace('_', ' ') : 'PENDING QUOTE'}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    <span>Workspace</span>
                    <BiRightArrowAlt className="w-4 h-4" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Custom Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl my-8 overflow-hidden text-slate-800">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                  <BiBriefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Request Custom Project</h3>
                  <p className="text-xs text-slate-500">
                    Describe your bespoke feature, design, or integration requirements.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <BiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateProject} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {formError}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Custom Payment Gateway, 3D Interactive Portfolio, Stripe Webhook"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-indigo-400 focus:bg-white"
                />
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Project Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-indigo-400"
                  >
                    <option value="CUSTOM_FEATURE">Custom Feature</option>
                    <option value="PORTFOLIO_REDESIGN">Portfolio Redesign</option>
                    <option value="API_INTEGRATION">API / Gateway Integration</option>
                    <option value="CUSTOM_THEME">Bespoke Theme & Layout</option>
                    <option value="PERFORMANCE_SEO">Performance & SEO Optimization</option>
                    <option value="BUG_FIX">Technical Fix / Maintenance</option>
                    <option value="OTHER">Other Custom Request</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Urgency / Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-indigo-400"
                  >
                    <option value="LOW">Low (Flexible timeline)</option>
                    <option value="MEDIUM">Medium (Standard 1-2 weeks)</option>
                    <option value="HIGH">High (Within few days)</option>
                    <option value="URGENT">Urgent (Immediate sprint)</option>
                  </select>
                </div>
              </div>

              {/* Estimated Budget & Target Deadline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Estimated Budget in USD (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">
                      $
                    </span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="e.g. 250"
                      value={estimatedBudget}
                      onChange={(e) => setEstimatedBudget(e.target.value)}
                      className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-indigo-400 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Desired Delivery Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-indigo-400"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Project Description & Specifications *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail your requirements, target user flow, necessary third-party services, and deliverables..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-indigo-400 focus:bg-white"
                />
              </div>

              {/* Mockup / Image URL */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Reference Mockup / Wireframe Image URL (Optional)
                </label>
                <div className="relative">
                  <BiImage className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... or Figma link"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-indigo-400 focus:bg-white"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <BiLoaderAlt className="w-4 h-4 animate-spin" />
                      <span>Submitting Project...</span>
                    </>
                  ) : (
                    <>
                      <BiPlus className="w-4 h-4" />
                      <span>Submit Custom Project</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
