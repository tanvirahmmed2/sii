'use client';

import { useState, useEffect, useMemo, useContext } from 'react';
import { Context } from '@/components/helper/Context';
import {
  BiSearch,
  BiPlus,
  BiMinus,
  BiTrash,
  BiRefresh,
  BiEdit,
  BiCheckShield,
  BiCube,
  BiCheckCircle,
  BiXCircle,
  BiLayer,
  BiInfoCircle,
  BiLockAlt,
} from 'react-icons/bi';
import FeatureForm from '@/components/developer/forms/FeatureForm';

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
      const res = await fetch('/api/developer/features');
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
      const res = await fetch('/api/developer/features', {
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
    <div className="space-y-6">
      {/* Toast Feedback Notification */}
      {feedback && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl border text-xs font-semibold animate-fade-in ${
            feedbackType === 'error'
              ? 'bg-rose-900/95 text-rose-100 border-rose-700'
              : 'bg-slate-900/95 text-white border-slate-700'
          }`}
        >
          {feedbackType === 'error' ? (
            <BiXCircle className="text-rose-400 text-base shrink-0" />
          ) : (
            <BiCheckCircle className="text-emerald-400 text-base shrink-0" />
          )}
          <span>{feedback}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Platform Features
            </h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
              Capabilities
            </span>
            {!isAdminUser && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <BiLockAlt className="text-xs" />
                <span>Read-Only</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Catalog of modular builder capabilities that can be bundled into platform packages and tiers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchFeatures}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
            title="Refresh features"
          >
            <BiRefresh className="text-xl" />
          </button>
          {isAdminUser ? (
            <button
              type="button"
              onClick={handleCreateClick}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                showForm && !editingFeature
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-secondary hover:bg-secondary-dark text-white'
              }`}
            >
              {showForm && !editingFeature ? <BiMinus className="text-lg" /> : <BiPlus className="text-lg" />}
              <span>{showForm && !editingFeature ? 'Hide Form' : 'Add Feature'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-100 text-slate-500 text-xs font-semibold">
              <BiLockAlt className="text-sm" />
              <span>Admin Role Required to Create</span>
            </div>
          )}
        </div>
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Features</span>
            <div className="p-2 rounded-xl bg-secondary/10 text-secondary">
              <BiCheckShield className="text-xl" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalFeatures}</div>
          <p className="text-[11px] text-slate-400 mt-1">Platform capabilities defined</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Bundled In Packages</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <BiCube className="text-xl" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{linkedFeatures}</div>
          <p className="text-[11px] text-slate-400 mt-1">Attached to active packages</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Standalone Features</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <BiLayer className="text-xl" />
            </div>
          </div>
          <div className="text-2xl font-bold text-indigo-600">{standaloneFeatures}</div>
          <p className="text-[11px] text-slate-400 mt-1">Ready to attach to packages</p>
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
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <BiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
            <input
              type="text"
              placeholder="Search features by name, key, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all font-medium"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{filtered.length}</span> of {features.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="px-5 py-3.5 whitespace-nowrap">ID</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Feature Name</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Key Identifier</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Packages Linked</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Description</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Created</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-semibold">Loading platform features...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <BiCheckShield className="text-3xl text-slate-300" />
                      <span className="text-xs font-semibold">No features found matching your search.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((feat) => (
                  <tr
                    key={feat.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      editingFeature?.id === feat.id ? 'bg-secondary/5' : ''
                    }`}
                  >
                    <td className="px-5 py-4 font-mono font-bold text-slate-500">#{feat.id}</td>

                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900 text-sm">{feat.name}</div>
                    </td>

                    <td className="px-5 py-4 font-mono">
                      <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700">
                        {feat.key}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {Number(feat.packages_count || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <BiCube className="text-xs" />
                          <span>{feat.packages_count} {feat.packages_count === 1 ? 'Package' : 'Packages'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                          <span>Unassigned</span>
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-slate-600 max-w-sm">
                      <p className="line-clamp-2 text-[11px] leading-relaxed">{feat.description || '—'}</p>
                    </td>

                    <td className="px-5 py-4 text-slate-500 text-[11px] whitespace-nowrap">
                      {feat.created_at ? new Date(feat.created_at).toLocaleDateString() : '—'}
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      {isAdminUser ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditClick(feat)}
                            className="p-1.5 text-slate-500 hover:text-secondary hover:bg-secondary/10 rounded-lg transition-colors cursor-pointer"
                            title="Edit feature"
                          >
                            <BiEdit className="text-base" />
                          </button>

                          <button
                            type="button"
                            disabled={deletingId === feat.id}
                            onClick={() => handleDelete(feat.id, feat.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete feature"
                          >
                            <BiTrash className="text-base" />
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
