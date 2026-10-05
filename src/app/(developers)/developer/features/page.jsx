'use client';

import { useState, useEffect, useContext, useMemo } from 'react';
import { Context } from 'src/component/helper/Context';
import FeatureForm from 'src/component/marketing/developer/forms/FeatureForm';

export default function AdminFeaturesPage() {
  const { user } = useContext(Context) || {};
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isAdminUser = Boolean(permissions.includes('features'));

  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFeature, setEditingFeature] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [feedbackType, setFeedbackType] = useState('success');

  const fetchFeatures = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketing/developer/features');
      const data = await res.json();
      if (data.success) {
        setFeatures(data.records || []);
      }
    } catch (e) {
      console.error('Error fetching features:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  const handleEditClick = (feat) => {
    if (!isAdminUser) {
      showNotification('Access Denied: features permission required to edit features.', 'error');
      return;
    }
    setEditingFeature(feat);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateClick = () => {
    if (!isAdminUser) {
      showNotification('Access Denied: features permission required to create features.', 'error');
      return;
    }
    setEditingFeature(null);
    setShowForm((prev) => !prev);
  };

  const showNotification = (msg, type = 'success') => {
    setFeedback(msg);
    setFeedbackType(type);
    setTimeout(() => setFeedback(null), 4500);
  };

  const handleDelete = async (id, name) => {
    if (!isAdminUser) {
      showNotification('Access Denied: features permission required to delete features.', 'error');
      return;
    }
    if (!confirm(`Are you sure you want to delete feature "${name || `#${id}`}"? This cannot be undone.`)) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch('/api/marketing/developer/features', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setFeatures((prev) => prev.filter((feat) => feat.id !== id));
        if (editingFeature?.id === id) {
          setEditingFeature(null);
          setShowForm(false);
        }
        showNotification(`Feature "${name}" was deleted successfully.`);
      } else {
        showNotification(data.error || 'Failed to delete feature. features permission required.', 'error');
      }
    } catch (e) {
      console.error('Error deleting feature:', e);
      showNotification(e.message || 'Error occurred while deleting feature.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return features;
    const q = searchTerm.toLowerCase();
    return features.filter((feat) => {
      return (
        feat.name?.toLowerCase().includes(q) ||
        feat.key?.toLowerCase().includes(q) ||
        feat.description?.toLowerCase().includes(q)
      );
    });
  }, [features, searchTerm]);

  // Metric KPIs
  const totalFeatures = features.length;
  const linkedFeatures = features.filter((f) => Number(f.packages_count || 0) > 0).length;
  const standaloneFeatures = totalFeatures - linkedFeatures;

  return (
    <div className="w-full space-y-4">
      {/* Toast Feedback Notification */}
      {feedback && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded shadow-lg border text-xs font-medium ${
            feedbackType === 'error'
              ? 'bg-rose-900 text-rose-100 border-rose-700'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          {feedback}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">
              Platform Features
            </h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              Capabilities
            </span>
            {!isAdminUser && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">
                Read-Only
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Catalog of modular builder capabilities that can be bundled into platform packages and tiers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchFeatures}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
          >
            Refresh
          </button>
          {isAdminUser ? (
            <button
              type="button"
              onClick={handleCreateClick}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                showForm && !editingFeature
                  ? 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                  : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900'
              }`}
            >
              {showForm && !editingFeature ? 'Hide Form' : 'Add Feature'}
            </button>
          ) : (
            <div className="px-3 py-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-medium">
              Admin Role Required
            </div>
          )}
        </div>
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5">
          <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Total Features</div>
          <div className="text-base font-semibold text-slate-900 dark:text-white mt-1">{totalFeatures}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Platform capabilities defined</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5">
          <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Bundled In Packages</div>
          <div className="text-base font-semibold text-emerald-600 dark:text-emerald-400 mt-1">{linkedFeatures}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Attached to active packages</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5">
          <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Standalone Features</div>
          <div className="text-base font-semibold text-indigo-600 dark:text-indigo-400 mt-1">{standaloneFeatures}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Ready to attach to packages</p>
        </div>
      </div>

      {/* Feature Form (Create or Edit) */}
      {showForm && isAdminUser && (
        <FeatureForm
          initialData={editingFeature}
          onSuccess={(savedFeat) => {
            showNotification(
              editingFeature
                ? `Feature "${savedFeat.name}" updated successfully.`
                : `Feature "${savedFeat.name}" created successfully.`
            );
            setShowForm(false);
            setEditingFeature(null);
            fetchFeatures();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingFeature(null);
          }}
        />
      )}

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="w-full sm:w-80">
            <input
              type="text"
              placeholder="Search features by name, key, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-slate-800"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Showing {filtered.length} of {features.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[10px] uppercase font-semibold">
                <th className="pb-2 whitespace-nowrap">ID</th>
                <th className="pb-2 whitespace-nowrap">Feature Name</th>
                <th className="pb-2 whitespace-nowrap">Key Identifier</th>
                <th className="pb-2 whitespace-nowrap">Packages Linked</th>
                <th className="pb-2 whitespace-nowrap">Description</th>
                <th className="pb-2 whitespace-nowrap">Created</th>
                <th className="pb-2 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs font-normal">
                    Loading platform features...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs font-normal">
                    No features found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((feat) => (
                  <tr
                    key={feat.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 font-mono font-medium text-slate-400">#{feat.id}</td>

                    <td className="py-2.5">
                      <div className="font-medium text-slate-900 dark:text-white">{feat.name}</div>
                    </td>

                    <td className="py-2.5 font-mono">
                      <span className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-[11px] font-normal text-slate-700 dark:text-slate-300">
                        {feat.key}
                      </span>
                    </td>

                    <td className="py-2.5">
                      {Number(feat.packages_count || 0) > 0 ? (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {feat.packages_count} {feat.packages_count === 1 ? 'Package' : 'Packages'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                          Unassigned
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 text-slate-600 dark:text-slate-400 max-w-sm">
                      <p className="line-clamp-2 text-[11px] leading-relaxed font-normal">{feat.description || '—'}</p>
                    </td>

                    <td className="py-2.5 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                      {feat.created_at ? new Date(feat.created_at).toLocaleDateString() : '—'}
                    </td>

                    <td className="py-2.5 text-right whitespace-nowrap">
                      {isAdminUser ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditClick(feat)}
                            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            disabled={deletingId === feat.id}
                            onClick={() => handleDelete(feat.id, feat.name)}
                            className="px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">View Only</span>
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
  );
}
