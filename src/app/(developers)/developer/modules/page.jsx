'use client';

import { useState, useEffect, useContext, useMemo } from 'react';
import { Context } from 'src/component/helper/Context';

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
      const res = await fetch(`/api/marketing/developer/modules?filter=all`);
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

  if (!isAdminUser) {
    return (
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 text-center max-w-lg mx-auto shadow-xs">
        <h2 className="text-base font-medium text-slate-900 dark:text-white">Permission Required</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          The Database Modules &amp; Tables Inspector requires the <span className="font-mono font-normal">modules</span> permission.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-medium text-slate-900 dark:text-white tracking-tight">
              Database Modules &amp; Tables
            </h1>
            <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              PostgreSQL ({totalTables} Tables)
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Admin Only
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time introspection of PostgreSQL tables mapped into active website feature modules, platform core entities, and legacy archive schemas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchModules}
            className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs font-normal"
          >
            Refresh Schema
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Total Tables
          </span>
          <div className="text-xl font-semibold text-slate-900 dark:text-white">{totalTables}</div>
          <p className="text-[11px] text-slate-400">Base database tables</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Website Modules
          </span>
          <div className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">{websiteModules}</div>
          <p className="text-[11px] text-slate-400">Multi-website domain modules</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Platform Core
          </span>
          <div className="text-xl font-semibold text-slate-900 dark:text-white">{platformTables}</div>
          <p className="text-[11px] text-slate-400">Modern SaaS core tables</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Legacy &amp; Old Modules
          </span>
          <div className="text-xl font-semibold text-amber-600 dark:text-amber-400">{legacyTables}</div>
          <p className="text-[11px] text-slate-400">Preserved prior system tables</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden">
        {/* Filter Tabs & Search Bar */}
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
              Legacy / Old Modules ({legacyTables})
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

        {/* Modules Table List */}
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
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <span className="text-xs font-normal">Querying PostgreSQL catalog...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <span className="text-xs font-normal">No database tables match your filter.</span>
                  </td>
                </tr>
              ) : (
                filtered.map((mod, idx) => (
                  <tr
                    key={`${mod.table_name}-${idx}`}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-medium text-slate-900 dark:text-white">
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-xs">
                        {mod.table_name}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {mod.module_title}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {mod.category === 'website' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Website Module
                        </span>
                      ) : mod.category === 'legacy' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          Legacy / Old
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          Platform Core
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 font-mono font-normal text-slate-700 dark:text-slate-300">
                      {mod.columns_count} cols
                    </td>

                    <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">
                      {mod.estimated_rows}
                    </td>

                    <td className="px-4 py-3">
                      {mod.is_primary_module ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-normal text-emerald-600 dark:text-emerald-400">
                          Selectable in Packages
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

      {/* Schema & Live Data Inspector Modal */}
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

            {/* Modal Tabs */}
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
                <div className="py-12 text-center text-slate-400">
                  <span className="text-xs font-normal">Reading columns and records from PostgreSQL...</span>
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
                /* Data Preview Tab */
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
