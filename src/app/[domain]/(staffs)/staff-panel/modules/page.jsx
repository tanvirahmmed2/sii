'use client';

import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import TenantLoader from 'src/component/tenant/TenantLoader';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function TenantModulesPage() {
  const { website, getApiEndpoint } = useContext(TenantWebsiteContext);

  const [activeTab, setActiveTab] = useState('control'); // 'control' | 'home'
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);

  const [homeModules, setHomeModules] = useState([]);
  const [controlModules, setControlModules] = useState([]);
  const [summary, setSummary] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const fetchModules = useCallback(async () => {
    try {
      setLoading(true);
      const endpoint = getApiEndpoint ? getApiEndpoint('modules?type=all') : '/api/modules?type=all';
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.success) {
        setHomeModules(data.home_modules || []);
        setControlModules(data.control_modules || []);
        setSummary(data.summary || null);
      } else {
        toast.error(data.error || 'Failed to load institution modules.');
      }
    } catch (err) {
      console.error('Error fetching modules:', err);
      toast.error('Unable to fetch tenant modules catalog.');
    } finally {
      setLoading(false);
    }
  }, [getApiEndpoint]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const handleToggle = async (type, item) => {
    const nextActive = !item.is_active;
    const toggleKey = `${type}-${item.id}`;
    setTogglingId(toggleKey);

    try {
      const endpoint = getApiEndpoint ? getApiEndpoint('modules') : '/api/modules';
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          id: item.id,
          is_active: nextActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${item.name} is now ${nextActive ? 'enabled' : 'disabled'}.`);
        if (type === 'home') {
          setHomeModules((prev) =>
            prev.map((m) => (m.id === item.id ? { ...m, is_active: nextActive } : m))
          );
        } else {
          setControlModules((prev) =>
            prev.map((m) => (m.id === item.id ? { ...m, is_active: nextActive } : m))
          );
        }
      } else {
        toast.error(data.error || 'Failed to toggle module status.');
      }
    } catch (err) {
      console.error('Toggle error:', err);
      toast.error('Error communicating with server.');
    } finally {
      setTogglingId(null);
    }
  };

  // Distinct categories
  const homeCategories = useMemo(() => {
    return Array.from(new Set(homeModules.map((m) => m.category).filter(Boolean))).sort();
  }, [homeModules]);

  const controlCategories = useMemo(() => {
    return Array.from(new Set(controlModules.map((m) => m.category).filter(Boolean))).sort();
  }, [controlModules]);

  // Filtered Home Modules
  const filteredHomeModules = useMemo(() => {
    return homeModules.filter((m) => {
      const matchesSearch =
        !searchTerm.trim() ||
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCat =
        selectedCategory === 'all' || m.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [homeModules, searchTerm, selectedCategory]);

  // Filtered Control Modules
  const filteredControlModules = useMemo(() => {
    return controlModules.filter((m) => {
      const matchesSearch =
        !searchTerm.trim() ||
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCat =
        selectedCategory === 'all' || m.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [controlModules, searchTerm, selectedCategory]);

  if (loading) {
    return <TenantLoader fullScreen={false} />;
  }

  const currentCategories = activeTab === 'control' ? controlCategories : homeCategories;
  const currentCount = activeTab === 'control' ? filteredControlModules.length : filteredHomeModules.length;
  const totalCount = activeTab === 'control' ? controlModules.length : homeModules.length;
  const activeCount =
    activeTab === 'control'
      ? controlModules.filter((m) => m.is_active).length
      : homeModules.filter((m) => m.is_active).length;

  return (
    <div className="w-full space-y-5">
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              School Modules &amp; Services Directory
            </h1>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              {website?.name || 'Campus Portal'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Browse and configure all functional modules enabled on this campus website, including public portal pages and staff back-office workstations.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchModules}
            className="px-4 py-1.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
          >
            Refresh Catalog
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Control Workstations
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {controlModules.length} Modules
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            {controlModules.filter((m) => m.is_active).length} Active &amp; Ready
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Public Website Pages
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {homeModules.length} Modules
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            {homeModules.filter((m) => m.is_active).length} Publicly Enabled
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Functional Departments
          </div>
          <div className="text-xl font-bold text-primary">
            {controlCategories.length} Categories
          </div>
          <div className="text-[11px] text-slate-400 mt-1">SIS, LMS, Exams, Fees, Library, etc.</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Current Filter View
          </div>
          <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
            {currentCount} Listed
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {activeCount} of {totalCount} active
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-0">
        <button
          type="button"
          onClick={() => {
            setActiveTab('control');
            setSelectedCategory('all');
            setSearchTerm('');
          }}
          className={`px-4 py-2.5 rounded-t text-xs font-semibold transition border-b-2 -mb-px cursor-pointer flex items-center gap-2 ${
            activeTab === 'control'
              ? 'border-primary text-primary bg-white dark:bg-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span>Staff Workstation Modules</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
            {controlModules.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('home');
            setSelectedCategory('all');
            setSearchTerm('');
          }}
          className={`px-4 py-2.5 rounded-t text-xs font-semibold transition border-b-2 -mb-px cursor-pointer flex items-center gap-2 ${
            activeTab === 'home'
              ? 'border-primary text-primary bg-white dark:bg-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span>Public Website Modules</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
            {homeModules.length}
          </span>
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-2xs flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-semibold text-slate-500">Filter Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-white"
          >
            <option value="all">All Categories ({currentCategories.length})</option>
            {currentCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder={`Search ${activeTab === 'control' ? 'control' : 'home'} modules...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Modules List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-normal uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3 whitespace-nowrap">#</th>
                <th className="px-4 py-3 whitespace-nowrap">Module Name</th>
                <th className="px-4 py-3 whitespace-nowrap">Route Path</th>
                <th className="px-4 py-3 whitespace-nowrap">Category</th>
                <th className="px-4 py-3 whitespace-nowrap">Description</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Toggle Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {(activeTab === 'control' ? filteredControlModules : filteredHomeModules).length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    No modules match your current search criteria.
                  </td>
                </tr>
              ) : (
                (activeTab === 'control' ? filteredControlModules : filteredHomeModules).map((mod, idx) => (
                  <tr key={mod.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            activeTab === 'control' ? 'bg-primary' : 'bg-emerald-500'
                          }`}
                        ></span>
                        <span>{mod.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-primary whitespace-nowrap">
                      <Link
                        href={mod.path}
                        target="_blank"
                        className="hover:underline flex items-center gap-1"
                        title="Open module"
                      >
                        {mod.path}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {mod.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-sm truncate text-[11px]" title={mod.description}>
                      {mod.description || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          mod.is_active
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {mod.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        disabled={togglingId === `${activeTab}-${mod.id}`}
                        onClick={() => handleToggle(activeTab, mod)}
                        className={`px-3 py-1 rounded text-xs font-semibold transition cursor-pointer disabled:opacity-50 ${
                          mod.is_active
                            ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                            : 'bg-primary hover:bg-primary-dark text-white shadow-xs'
                        }`}
                      >
                        {togglingId === `${activeTab}-${mod.id}`
                          ? 'Updating...'
                          : mod.is_active
                          ? 'Disable'
                          : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

