'use client';

import { useState, useEffect, useMemo, useContext } from 'react';
import { Context } from '@/components/helper/Context';
import {
  BiSearch,
  BiRefresh,
  BiGridAlt,
  BiTable,
  BiServer,
  BiCheckShield,
  BiLockAlt,
  BiInfoCircle,
  BiX,
  BiLayer,
  BiCodeBlock,
  BiCheckCircle,
  BiArchive,
  BiData,
} from 'react-icons/bi';

export default function AdminDatabaseModulesPage() {
  const { user } = useContext(Context) || {};
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isAdminUser = Boolean(permissions.includes('modules'));

  const [modules, setModules] = useState([]);
  const [counts, setCounts] = useState({ total: 0, website: 0, platform: 0, legacy: 0 });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'website' | 'platform' | 'legacy'
  const [searchTerm, setSearchTerm] = useState('');
  
  // Table inspection state
  const [inspectingTable, setInspectingTable] = useState(null);
  const [inspectData, setInspectData] = useState(null);
  const [inspectTab, setInspectTab] = useState('schema'); // 'schema' | 'preview'
  const [loadingSchema, setLoadingSchema] = useState(false);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/developer/modules?filter=all`);
      const data = await res.json();
      if (data.success) {
        setModules(data.modules || []);
        if (data.counts) {
          setCounts(data.counts);
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
      const res = await fetch(`/api/developer/modules?table=${encodeURIComponent(tableName)}`);
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

  // Filtered module records
  const filtered = useMemo(() => {
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

  // Metric counts
  const totalTables = modules.length;
  const websiteModules = modules.filter((m) => m.category === 'website').length;
  const platformTables = modules.filter((m) => m.category === 'platform').length;
  const legacyTables = modules.filter((m) => m.category === 'legacy').length;
  const totalColumns = modules.reduce((acc, m) => acc + (m.columns_count || 0), 0);

  if (!isAdminUser) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center max-w-lg mx-auto mt-12 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 text-2xl">
          <BiLockAlt />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Permission Required</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
          The Database Modules &amp; Tables Inspector requires the <span className="font-mono font-semibold">modules</span> permission.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Database Modules &amp; Tables
            </h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
              PostgreSQL Catalog ({totalTables} Tables)
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Admin Only
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Real-time introspection of PostgreSQL tables mapped into active website feature modules, platform core entities, and legacy archive schemas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchModules}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs font-bold"
            title="Refresh database tables"
          >
            <BiRefresh className="text-lg" />
            <span>Refresh Schema</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Tables
            </span>
            <div className="p-2 rounded-xl bg-secondary/10 text-secondary">
              <BiTable className="text-xl" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalTables}</div>
          <p className="text-[11px] text-slate-400 mt-1">Base database tables</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Website Modules
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <BiGridAlt className="text-xl" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{websiteModules}</div>
          <p className="text-[11px] text-slate-400 mt-1">Multi-website domain modules</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Platform Core
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <BiServer className="text-xl" />
            </div>
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{platformTables}</div>
          <p className="text-[11px] text-slate-400 mt-1">Modern SaaS core tables</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Legacy &amp; Old Modules
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <BiArchive className="text-xl" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{legacyTables}</div>
          <p className="text-[11px] text-slate-400 mt-1">Preserved prior system tables</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
        {/* Filter Tabs & Search Bar */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit flex-wrap">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-secondary shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              All Tables ({totalTables})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('website')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeFilter === 'website'
                  ? 'bg-white dark:bg-slate-700 text-secondary shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Website Modules ({websiteModules})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('platform')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeFilter === 'platform'
                  ? 'bg-white dark:bg-slate-700 text-secondary shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Platform Core ({platformTables})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('legacy')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeFilter === 'legacy'
                  ? 'bg-white dark:bg-slate-700 text-secondary shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Legacy / Old Modules ({legacyTables})
            </button>
          </div>

          <div className="relative flex-1 max-w-sm">
            <BiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
            <input
              type="text"
              placeholder="Search table or module title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all font-medium"
            />
          </div>
        </div>

        {/* Modules Table List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="px-5 py-3.5 whitespace-nowrap">Table Name</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Mapped Module Title</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Category</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Columns</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Rows (Est.)</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Integration Status</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-semibold">Querying PostgreSQL catalog...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <BiTable className="text-3xl text-slate-300 dark:text-slate-600" />
                      <span className="text-xs font-semibold">No database tables match your filter.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((mod, idx) => (
                  <tr
                    key={`${mod.table_name}-${idx}`}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-5 py-4 font-mono font-bold text-slate-900 dark:text-white">
                      <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                        {mod.table_name}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        {mod.module_title}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {mod.category === 'website' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Website Module
                        </span>
                      ) : mod.category === 'legacy' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <BiArchive className="text-xs" />
                          <span>Legacy / Old</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          Platform Core
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {mod.columns_count} cols
                    </td>

                    <td className="px-5 py-4 font-mono text-slate-500 dark:text-slate-400">
                      {mod.estimated_rows}
                    </td>

                    <td className="px-5 py-4">
                      {mod.is_primary_module ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <BiCheckCircle className="text-base" />
                          <span>Selectable in Packages</span>
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

                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleInspectTable(mod.table_name)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-secondary hover:text-white dark:bg-slate-800 dark:hover:bg-secondary text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                      >
                        <BiCodeBlock className="text-sm" />
                        <span>Inspect &amp; Preview</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schema & Live Data Inspector Modal */}
      {inspectingTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <BiTable className="text-secondary text-xl" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-mono">
                    {inspectingTable}
                  </h3>
                  {inspectData && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      ({inspectData.module_title})
                    </span>
                  )}
                  {inspectData?.is_legacy && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      Legacy Archive
                    </span>
                  )}
                  {inspectData && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {inspectData.total_rows} total rows
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">PostgreSQL definition and real-time records introspection</p>
              </div>

              <button
                type="button"
                onClick={() => setInspectingTable(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <BiX className="text-2xl" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-5 pt-3 pb-0 border-b border-slate-100 dark:border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => setInspectTab('schema')}
                className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                  inspectTab === 'schema'
                    ? 'border-secondary text-secondary'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                <BiCodeBlock className="text-base" />
                <span>Column Schema ({inspectData?.columns?.length || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setInspectTab('preview')}
                className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                  inspectTab === 'preview'
                    ? 'border-secondary text-secondary'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                <BiData className="text-base" />
                <span>Live Data Preview (Top {inspectData?.sample_rows?.length || 0})</span>
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {loadingSchema ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span className="text-xs font-semibold">Reading columns and records from PostgreSQL...</span>
                </div>
              ) : inspectTab === 'schema' ? (
                inspectData?.columns && inspectData.columns.length > 0 ? (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px]">
                          <th className="px-4 py-2.5">#</th>
                          <th className="px-4 py-2.5">Column Name</th>
                          <th className="px-4 py-2.5">Data Type</th>
                          <th className="px-4 py-2.5">Nullable</th>
                          <th className="px-4 py-2.5">Default Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                        {inspectData.columns.map((col, idx) => (
                          <tr key={col.column_name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="px-4 py-2 text-slate-400 text-[11px]">{idx + 1}</td>
                            <td className="px-4 py-2 font-bold text-slate-900 dark:text-white">{col.column_name}</td>
                            <td className="px-4 py-2 text-secondary font-semibold">{col.data_type}</td>
                            <td className="px-4 py-2">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  col.is_nullable === 'YES'
                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                }`}
                              >
                                {col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-slate-500 text-[10px] truncate max-w-xs">
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
                /* Data Preview Tab */
                inspectData?.sample_rows && inspectData.sample_rows.length > 0 ? (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px]">
                          {Object.keys(inspectData.sample_rows[0]).map((k) => (
                            <th key={k} className="px-4 py-2.5 whitespace-nowrap font-mono">{k}</th>
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
                                <td key={k} className="px-4 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap max-w-xs truncate" title={displayVal}>
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
                    <BiArchive className="text-4xl mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-semibold">Table currently has 0 rows recorded.</p>
                  </div>
                )
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingTable(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
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
