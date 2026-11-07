'use client';

import { useState, useEffect, useContext, useMemo } from 'react';
import { Context } from 'src/component/helper/Context';
import LoadingScreen from 'src/component/common/LoadingScreen';

export default function AdminDatabaseModulesPage() {
  const { user } = useContext(Context) || {};
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isAdminUser = Boolean(permissions.includes('modules'));

  const [viewMode, setViewMode] = useState('control');

  const [modules, setModules] = useState([]);
  const [counts, setCounts] = useState({ total: 0, website: 0, platform: 0, legacy: 0, home_modules: 0, control_modules: 0, developer_modules: 0 });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); 
  const [searchTerm, setSearchTerm] = useState('');

  const [homeModules, setHomeModules] = useState([]);
  const [controlModules, setControlModules] = useState([]);
  const [developerModules, setDeveloperModules] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [togglingId, setTogglingId] = useState(null);

  const [inspectingTable, setInspectingTable] = useState(null);
  const [inspectData, setInspectData] = useState(null);
  const [inspectTab, setInspectTab] = useState('schema'); 
  const [loadingSchema, setLoadingSchema] = useState(false);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/marketing/developer/modules?filter=all`);
      const data = await res.json();
      if (data.success) {
        setModules(data.modules || []);
        if (data.counts) {
          setCounts(data.counts);
        }
        if (Array.isArray(data.home_modules)) {
          setHomeModules(data.home_modules);
        }
        if (Array.isArray(data.control_modules)) {
          setControlModules(data.control_modules);
        }
        if (Array.isArray(data.developer_modules)) {
          setDeveloperModules(data.developer_modules);
        }
      }
    } catch (err) {
      console.error('Failed to fetch database modules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const handleInspectTable = async (tableName) => {
    setInspectingTable(tableName);
    setLoadingSchema(true);
    setInspectData(null);
    setInspectTab('schema');
    try {
      const res = await fetch(`/api/marketing/developer/modules?table=${encodeURIComponent(tableName)}`);
      const data = await res.json();
      if (data.success) {
        setInspectData(data);
      }
    } catch (e) {
      console.error('Error fetching table schema & preview:', e);
    } finally {
      setLoadingSchema(false);
    }
  };

  const handleToggleModule = async (type, item) => {
    const nextActive = !item.is_active;
    setTogglingId(`${type}-${item.id}`);
    try {
      const res = await fetch('/api/marketing/developer/tenant-modules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          id: item.id,
          is_active: nextActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (type === 'home') {
          setHomeModules((prev) =>
            prev.map((m) => (m.id === item.id ? { ...m, is_active: nextActive } : m))
          );
        } else {
          setControlModules((prev) =>
            prev.map((m) => (m.id === item.id ? { ...m, is_active: nextActive } : m))
          );
        }
      }
    } catch (err) {
      console.error('Failed to toggle module:', err);
    } finally {
      setTogglingId(null);
    }
  };

  const filteredTables = useMemo(() => {
    return modules.filter((mod) => {
      const matchesSearch =
        !searchTerm.trim() ||
        mod.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mod.module_title.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        activeFilter === 'all' || mod.category === activeFilter;

      return matchesSearch && matchesCategory;
    });
  }, [modules, searchTerm, activeFilter]);

  const homeCategories = useMemo(() => {
    return Array.from(new Set(homeModules.map((m) => m.category).filter(Boolean))).sort();
  }, [homeModules]);

  const controlCategories = useMemo(() => {
    return Array.from(new Set(controlModules.map((m) => m.category).filter(Boolean))).sort();
  }, [controlModules]);

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

  const filteredDeveloperModules = useMemo(() => {
    return developerModules.filter((m) => {
      const q = searchTerm.toLowerCase();
      return (
        !searchTerm.trim() ||
        m.name?.toLowerCase().includes(q) ||
        m.module_key?.toLowerCase().includes(q) ||
        m.page_path?.toLowerCase().includes(q) ||
        m.api_path?.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q))
      );
    });
  }, [developerModules, searchTerm]);

  const totalTables = modules.length;
  const websiteModules = modules.filter((m) => m.category === 'website').length;
  const platformTables = modules.filter((m) => m.category === 'platform').length;
  const legacyTables = modules.filter((m) => m.category === 'legacy').length;
  const totalHomeCount = homeModules.length;
  const totalControlCount = controlModules.length;
  const totalDevModules = developerModules.length;

  if (!isAdminUser) {
    return (
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 text-center shadow-xs">
        <h2 className="text-base font-medium text-slate-900 dark:text-white">Permission Required</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          The Database Modules &amp; Tables Inspector requires the <span className="font-mono font-normal">modules</span> permission.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-medium text-slate-900 dark:text-white tracking-tight">
              Website &amp; Control Modules Manager
            </h1>
            <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {totalControlCount} Control Modules
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {totalHomeCount} Home Modules
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              {totalDevModules} Developer Modules
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {totalTables} DB Tables
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Introspection and active status management across all tenant public frontend routes, staff workstation control panels, developer panel pages &amp; APIs, and underlying PostgreSQL tables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchModules}
            className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs font-normal"
          >
            Refresh Modules &amp; Schema
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 flex-wrap">
        <button
          type="button"
          onClick={() => {
            setViewMode('control');
            setSelectedCategory('all');
            setSearchTerm('');
          }}
          className={`px-4 py-2 rounded text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            viewMode === 'control'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <span>Control Modules (Staff Workstations)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-800">
            {totalControlCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setViewMode('home');
            setSelectedCategory('all');
            setSearchTerm('');
          }}
          className={`px-4 py-2 rounded text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            viewMode === 'home'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <span>Home Modules (Public Website)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-700 text-white dark:bg-emerald-200 dark:text-emerald-800">
            {totalHomeCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setViewMode('developer');
            setSearchTerm('');
          }}
          className={`px-4 py-2 rounded text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            viewMode === 'developer'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <span>Developer Modules &amp; APIs</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-700 text-white dark:bg-amber-200 dark:text-amber-800">
            {totalDevModules}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setViewMode('tables');
            setActiveFilter('all');
            setSearchTerm('');
          }}
          className={`px-4 py-2 rounded text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            viewMode === 'tables'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <span>Database Tables (Catalog Schema)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-500 text-white dark:bg-slate-700 dark:text-slate-200">
            {totalTables}
          </span>
        </button>
      </div>

      {viewMode === 'control' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Total Control Modules
              </span>
              <div className="text-xl font-semibold text-slate-900 dark:text-white">{totalControlCount}</div>
              <p className="text-[11px] text-slate-400">Scanned from [domain]/staff-panel/*</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Active Modules
              </span>
              <div className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                {controlModules.filter((m) => m.is_active).length}
              </div>
              <p className="text-[11px] text-slate-400">Ready for staff workstation use</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Functional Categories
              </span>
              <div className="text-xl font-semibold text-blue-600 dark:text-blue-400">{controlCategories.length}</div>
              <p className="text-[11px] text-slate-400">SIS, LMS, Exams, Fees, Routine, etc.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Status Filter
              </span>
              <div className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                {filteredControlModules.length}
              </div>
              <p className="text-[11px] text-slate-400">Matching current filter</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-white"
              >
                <option value="all">All Functional Categories ({controlCategories.length})</option>
                {controlCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat} ({controlModules.filter((m) => m.category === cat).length})
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search control module name, slug, or route..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
              >
              </input>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden">
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
                    <th className="px-4 py-3 text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <LoadingScreen fullScreen={false} size="sm" label="Loading control modules..." />
                      </td>
                    </tr>
                  ) : filteredControlModules.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400">
                        No control modules match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredControlModules.map((mod, idx) => (
                      <tr key={mod.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            <span>{mod.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {mod.path}
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
                            disabled={togglingId === `control-${mod.id}`}
                            onClick={() => handleToggleModule('control', mod)}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                              mod.is_active
                                ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {togglingId === `control-${mod.id}`
                              ? 'Saving...'
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
      )}

      {viewMode === 'home' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Total Home Modules
              </span>
              <div className="text-xl font-semibold text-slate-900 dark:text-white">{totalHomeCount}</div>
              <p className="text-[11px] text-slate-400">Scanned from [domain]/(home)/*</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Active Modules
              </span>
              <div className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                {homeModules.filter((m) => m.is_active).length}
              </div>
              <p className="text-[11px] text-slate-400">Publicly visible portal pages</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Home Categories
              </span>
              <div className="text-xl font-semibold text-purple-600 dark:text-purple-400">{homeCategories.length}</div>
              <p className="text-[11px] text-slate-400">Core, Academic, Media, Verification, etc.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Matching Results
              </span>
              <div className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                {filteredHomeModules.length}
              </div>
              <p className="text-[11px] text-slate-400">Matching current filter</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-white"
              >
                <option value="all">All Categories ({homeCategories.length})</option>
                {homeCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat} ({homeModules.filter((m) => m.category === cat).length})
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search home module name, slug, or route..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
              >
              </input>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden">
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
                    <th className="px-4 py-3 text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <LoadingScreen fullScreen={false} size="sm" label="Loading home modules..." />
                      </td>
                    </tr>
                  ) : filteredHomeModules.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400">
                        No home modules match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredHomeModules.map((mod, idx) => (
                      <tr key={mod.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>{mod.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {mod.path}
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
                            disabled={togglingId === `home-${mod.id}`}
                            onClick={() => handleToggleModule('home', mod)}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                              mod.is_active
                                ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {togglingId === `home-${mod.id}`
                              ? 'Saving...'
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
      )}

      {viewMode === 'developer' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Platform Developer Modules
              </span>
              <div className="text-xl font-semibold text-slate-900 dark:text-white">{totalDevModules}</div>
              <p className="text-[11px] text-slate-400">Stored in modules table</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Developer Panel Pages
              </span>
              <div className="text-xl font-semibold text-amber-600 dark:text-amber-400">
                {developerModules.filter((m) => m.page_path).length}
              </div>
              <p className="text-[11px] text-slate-400">Routes under /developer/*</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Backend API Routes
              </span>
              <div className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                {developerModules.filter((m) => m.api_path).length}
              </div>
              <p className="text-[11px] text-slate-400">Secured via developer middleware</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Filtered Modules
              </span>
              <div className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                {filteredDeveloperModules.length}
              </div>
              <p className="text-[11px] text-slate-400">Matching search criteria</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Platform developer panel pages and REST API routes assigned to developer roles via <span className="font-mono">developer_role_permissions</span>.
            </p>

            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search module name, key, page route, or API..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-normal uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-3 whitespace-nowrap">#</th>
                    <th className="px-4 py-3 whitespace-nowrap">Module Name</th>
                    <th className="px-4 py-3 whitespace-nowrap">Module Key</th>
                    <th className="px-4 py-3 whitespace-nowrap">Developer Page Route</th>
                    <th className="px-4 py-3 whitespace-nowrap">API Endpoint Path</th>
                    <th className="px-4 py-3 whitespace-nowrap">Description</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <LoadingScreen fullScreen={false} size="sm" label="Loading developer modules..." />
                      </td>
                    </tr>
                  ) : filteredDeveloperModules.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400">
                        No developer modules match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredDeveloperModules.map((mod, idx) => (
                      <tr key={mod.id || mod.module_key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            <span>{mod.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {mod.module_key}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-amber-600 dark:text-amber-400 whitespace-nowrap">
                          {mod.page_path ? (
                            <a href={mod.page_path} className="hover:underline flex items-center gap-1">
                              <span>{mod.page_path}</span>
                              <span className="text-[10px] text-slate-400">↗</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">No direct page</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {mod.api_path || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-xs truncate text-[11px]" title={mod.description}>
                          {mod.description || '—'}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {mod.page_path ? (
                            <a
                              href={mod.page_path}
                              className="px-2.5 py-1 rounded text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer inline-block"
                            >
                              Open Panel
                            </a>
                          ) : (
                            <span className="text-slate-400 text-xs italic">API Only</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'tables' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Total Tables
              </span>
              <div className="text-xl font-semibold text-slate-900 dark:text-white">{totalTables}</div>
              <p className="text-[11px] text-slate-400">PostgreSQL catalog tables</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Website Modules
              </span>
              <div className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">{websiteModules}</div>
              <p className="text-[11px] text-slate-400">Multi-tenant website tables</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Platform Core
              </span>
              <div className="text-xl font-semibold text-slate-900 dark:text-white">{platformTables}</div>
              <p className="text-[11px] text-slate-400">Modern SaaS platform core</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Legacy &amp; Old Tables
              </span>
              <div className="text-xl font-semibold text-amber-600 dark:text-amber-400">{legacyTables}</div>
              <p className="text-[11px] text-slate-400">Preserved prior system tables</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                    activeFilter === 'all'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  All Tables ({totalTables})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('website')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                    activeFilter === 'website'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Website Modules ({websiteModules})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('platform')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                    activeFilter === 'platform'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Platform Core ({platformTables})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('legacy')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                    activeFilter === 'legacy'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Legacy Archive ({legacyTables})
                </button>
              </div>

              <div className="relative flex-1 max-w-sm">
                <input
                  type="text"
                  placeholder="Search table or module title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-all font-normal"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-normal uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-3 whitespace-nowrap">Table Name</th>
                    <th className="px-4 py-3 whitespace-nowrap">Mapped Module Title</th>
                    <th className="px-4 py-3 whitespace-nowrap">Category</th>
                    <th className="px-4 py-3 whitespace-nowrap">Columns</th>
                    <th className="px-4 py-3 whitespace-nowrap">Rows (Est.)</th>
                    <th className="px-4 py-3 whitespace-nowrap">Integration Status</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <LoadingScreen fullScreen={false} size="sm" label="Querying PostgreSQL catalog..." />
                      </td>
                    </tr>
                  ) : filteredTables.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400">
                        <span className="text-xs font-normal">No database tables match your filter.</span>
                      </td>
                    </tr>
                  ) : (
                    filteredTables.map((mod) => (
                      <tr key={mod.table_name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-[11px] font-medium text-slate-900 dark:text-white whitespace-nowrap">
                          {mod.table_name}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {mod.module_title}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                              mod.category === 'website'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : mod.category === 'legacy'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {mod.category === 'website'
                              ? 'Website Module'
                              : mod.category === 'legacy'
                              ? 'Legacy Archive'
                              : 'Platform Core'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                          {mod.columns_count} cols
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                          ~{mod.estimated_rows}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {mod.is_primary_module ? (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              Package-Selectable
                            </span>
                          ) : mod.is_legacy ? (
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                              Archived System Table
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              {mod.is_child_table ? 'Sub-entity / Relation' : 'Internal System Table'}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleInspectTable(mod.table_name)}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                          >
                            Inspect &amp; Preview
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
      )}

      {inspectingTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded w-full max-w-4xl max-h-[85vh] flex flex-col shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-medium text-slate-900 dark:text-white font-mono">
                    {inspectingTable}
                  </h3>
                  {inspectData && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      ({inspectData.module_title})
                    </span>
                  )}
                  {inspectData?.is_legacy && (
                    <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      Legacy Archive
                    </span>
                  )}
                  {inspectData && (
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {inspectData.total_rows} total rows
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">PostgreSQL definition and real-time records introspection</p>
              </div>

              <button
                type="button"
                onClick={() => setInspectingTable(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="px-4 pt-3 pb-0 border-b border-slate-100 dark:border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => setInspectTab('schema')}
                className={`pb-2 text-xs font-medium transition-all border-b-2 cursor-pointer ${
                  inspectTab === 'schema'
                    ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                Column Schema ({inspectData?.columns?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setInspectTab('preview')}
                className={`pb-2 text-xs font-medium transition-all border-b-2 cursor-pointer ${
                  inspectTab === 'preview'
                    ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                Live Data Preview (Top {inspectData?.sample_rows?.length || 0})
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {loadingSchema ? (
                <div className="py-12">
                  <LoadingScreen fullScreen={false} size="sm" label="Reading columns and records from PostgreSQL..." />
                </div>
              ) : inspectTab === 'schema' ? (
                inspectData?.columns && inspectData.columns.length > 0 ? (
                  <div className="border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-normal uppercase text-[10px]">
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">Column Name</th>
                          <th className="px-3 py-2">Data Type</th>
                          <th className="px-3 py-2">Nullable</th>
                          <th className="px-3 py-2">Default Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                        {inspectData.columns.map((col, idx) => (
                          <tr key={col.column_name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="px-3 py-1.5 text-slate-400 text-[11px]">{idx + 1}</td>
                            <td className="px-3 py-1.5 font-medium text-slate-900 dark:text-white">{col.column_name}</td>
                            <td className="px-3 py-1.5 text-slate-700 dark:text-slate-300 font-normal">{col.data_type}</td>
                            <td className="px-3 py-1.5">
                              <span
                                className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                                  col.is_nullable === 'YES'
                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                }`}
                              >
                                {col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-slate-500 text-[10px] truncate max-w-xs">
                              {col.column_default || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">No columns found for this table.</p>
                )
              ) : (
                inspectData?.sample_rows && inspectData.sample_rows.length > 0 ? (
                  <div className="border border-slate-200 dark:border-slate-800 rounded overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-normal uppercase text-[10px]">
                          {Object.keys(inspectData.sample_rows[0]).map((k) => (
                            <th key={k} className="px-3 py-2 whitespace-nowrap font-mono">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                        {inspectData.sample_rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            {Object.keys(inspectData.sample_rows[0]).map((k) => {
                              const val = row[k];
                              const displayVal =
                                val === null || val === undefined
                                  ? 'NULL'
                                  : typeof val === 'object'
                                  ? JSON.stringify(val)
                                  : String(val);

                              return (
                                <td key={k} className="px-3 py-1.5 text-slate-700 dark:text-slate-300 whitespace-nowrap max-w-xs truncate" title={displayVal}>
                                  {val === null || val === undefined ? (
                                    <span className="text-slate-400 italic">NULL</span>
                                  ) : (
                                    displayVal
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    <p className="text-xs font-normal">Table currently has 0 rows recorded.</p>
                  </div>
                )
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingTable(null)}
                className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
