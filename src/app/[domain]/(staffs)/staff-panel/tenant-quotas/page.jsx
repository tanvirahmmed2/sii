'use client';

import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiGlobe, FiHardDrive, FiCpu, FiCheckCircle, FiAlertCircle, FiPlus, FiTrash2, FiRefreshCw, FiSliders } from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import Loader from 'src/component/common/Loader';

export default function TenantQuotasPage() {
  const { website, getApiEndpoint } = useContext(TenantWebsiteContext);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState({ domains: [], storage_usages: [], quotas: null, feature_flags: [] });

  // Domain modal state
  const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [isPrimaryDomain, setIsPrimaryDomain] = useState(false);
  const [submittingDomain, setSubmittingDomain] = useState(false);

  // New Flag modal state
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
  const [flagKey, setFlagKey] = useState('');
  const [flagDesc, setFlagDesc] = useState('');
  const [submittingFlag, setSubmittingFlag] = useState(false);

  const apiEndpoint = useMemo(() => getApiEndpoint('staff/panel/tenant-quotas'), [getApiEndpoint]);

  const fetchData = useCallback(async (showToast = false) => {
    if (!apiEndpoint) return;
    try {
      if (showToast) setRefreshing(true);
      const res = await axios.get(apiEndpoint);
      if (res.data?.success) {
        setData(res.data);
        if (showToast) toast.success('Tenant quota & routing data refreshed');
      } else {
        toast.error(res.data?.error || 'Failed to load tenant quota data');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Error connecting to tenant service');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiEndpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddDomain = async (e) => {
    e.preventDefault();
    if (!domainInput.trim()) {
      toast.error('Please enter a valid domain name');
      return;
    }
    setSubmittingDomain(true);
    try {
      const res = await axios.post(apiEndpoint, {
        action: 'add_domain',
        domain: domainInput.trim(),
        is_primary: isPrimaryDomain,
      });
      if (res.data?.success) {
        toast.success('Custom domain added successfully');
        setIsDomainModalOpen(false);
        setDomainInput('');
        setIsPrimaryDomain(false);
        fetchData();
      } else {
        toast.error(res.data?.error || 'Failed to register domain');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error adding domain');
    } finally {
      setSubmittingDomain(false);
    }
  };

  const handleDeleteDomain = async (domainId) => {
    if (!confirm('Are you sure you want to remove this domain mapping?')) return;
    try {
      const res = await axios.delete(`${apiEndpoint}?domain_id=${domainId}`);
      if (res.data?.success) {
        toast.success('Domain removed');
        fetchData();
      } else {
        toast.error(res.data?.error || 'Failed to delete domain');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error deleting domain');
    }
  };

  const handleToggleFlag = async (feature_key, currentStatus) => {
    try {
      const res = await axios.post(apiEndpoint, {
        action: 'toggle_flag',
        feature_key,
        is_enabled: !currentStatus,
      });
      if (res.data?.success) {
        toast.success(`Feature flag "${feature_key}" updated`);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update feature flag');
    }
  };

  const handleCreateFlag = async (e) => {
    e.preventDefault();
    if (!flagKey.trim()) return;
    setSubmittingFlag(true);
    try {
      const res = await axios.post(apiEndpoint, {
        action: 'toggle_flag',
        feature_key: flagKey.trim(),
        is_enabled: true,
        description: flagDesc.trim(),
      });
      if (res.data?.success) {
        toast.success('Feature flag created');
        setIsFlagModalOpen(false);
        setFlagKey('');
        setFlagDesc('');
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create feature flag');
    } finally {
      setSubmittingFlag(false);
    }
  };

  if (loading) {
    return <Loader message="Loading Tenant Quotas & Routing Configuration..." />;
  }

  const { domains, quotas, feature_flags } = data;
  const storageLimitGB = quotas?.max_storage_bytes ? (quotas.max_storage_bytes / (1024 * 1024 * 1024)).toFixed(1) : '5.0';
  const smsPercent = quotas?.sms_credits_total ? Math.min(100, Math.round((quotas.sms_credits_used / quotas.sms_credits_total) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FiGlobe className="text-primary" /> Tenant Routing & Storage Quotas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage custom educational domains (*.edu.bd), monitor resource consumption, and toggle system feature flags.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <FiRefreshCw className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={() => setIsDomainModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition shadow-sm"
          >
            <FiPlus /> Add Domain
          </button>
        </div>
      </div>

      {/* Resource Quota Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Storage Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Cloud Storage</span>
              <FiHardDrive className="text-lg text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {storageLimitGB} GB
            </div>
            <p className="text-xs text-slate-500 mt-1">Allocated tenant S3 bucket quota</p>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-4">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '15%' }}></div>
          </div>
        </div>

        {/* SMS Credits */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">SMS Gateway Credits</span>
              <FiCpu className="text-lg text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {quotas?.sms_credits_used || 0} / {quotas?.sms_credits_total || 1000}
            </div>
            <p className="text-xs text-slate-500 mt-1">{quotas?.sms_credits_total ? quotas.sms_credits_total - (quotas?.sms_credits_used || 0) : 1000} credits available</p>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-4">
            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${smsPercent}%` }}></div>
          </div>
        </div>

        {/* Max Students */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Student Capacity</span>
            <FiCheckCircle className="text-lg text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {quotas?.max_students || 500} Seats
          </div>
          <p className="text-xs text-slate-500 mt-1">Maximum active enrolled students</p>
        </div>

        {/* Max Staff */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Staff Limit</span>
            <FiSliders className="text-lg text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {quotas?.max_staff || 50} Accounts
          </div>
          <p className="text-xs text-slate-500 mt-1">Teachers, officers & admins</p>
        </div>
      </div>

      {/* Custom Domains Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <FiGlobe className="text-primary" /> Connected Custom Domains
          </h2>
          <span className="text-xs text-slate-500">
            {domains.length} / {quotas?.max_custom_domains || 2} registered
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3">Domain Name</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">SSL Certificate</th>
                <th className="px-6 py-3">Verification Token</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {domains.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400">
                    No custom domains mapped yet. Add a domain like <code>school.edu.bd</code> to route traffic.
                  </td>
                </tr>
              ) : (
                domains.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      {d.domain}
                    </td>
                    <td className="px-6 py-4">
                      {d.is_primary ? (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 rounded">
                          Primary
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded">
                          Secondary
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                        {d.ssl_status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {d.verification_token || 'CNAME Verified'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteDomain(d.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded transition"
                        title="Delete Domain"
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feature Flags Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <FiSliders className="text-primary" /> Tenant Feature Flags
            </h2>
            <p className="text-sm text-slate-500 mt-1">Enable or disable early-access modules and experimental features for this institution.</p>
          </div>
          <button
            onClick={() => setIsFlagModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition"
          >
            <FiPlus /> New Feature Flag
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {feature_flags.length === 0 ? (
            <div className="col-span-full py-6 text-center text-slate-400 text-sm">
              No custom feature flags configured. Click &quot;New Feature Flag&quot; to toggle specialized capabilities.
            </div>
          ) : (
            feature_flags.map((flag) => (
              <div key={flag.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start justify-between">
                <div>
                  <div className="font-mono text-xs font-bold text-slate-900 dark:text-white">{flag.feature_key}</div>
                  <div className="text-xs text-slate-500 mt-1">{flag.description || 'Tenant feature toggle'}</div>
                </div>
                <button
                  onClick={() => handleToggleFlag(flag.feature_key, flag.is_enabled)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                    flag.is_enabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      flag.is_enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Domain Modal */}
      {isDomainModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Connect Custom Domain</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter your school&apos;s custom domain (e.g. <code>campus.edu.bd</code>). Point your CNAME record to our edge routing proxy.
            </p>
            <form onSubmit={handleAddDomain} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Domain Name</label>
                <input
                  type="text"
                  placeholder="e.g. idealcollege.edu.bd"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="primaryDomain"
                  checked={isPrimaryDomain}
                  onChange={(e) => setIsPrimaryDomain(e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
                <label htmlFor="primaryDomain" className="text-xs text-slate-700 dark:text-slate-300">
                  Set as primary canonical domain
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDomainModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDomain}
                  className="px-4 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50"
                >
                  {submittingDomain ? 'Saving...' : 'Connect Domain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Feature Flag Modal */}
      {isFlagModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Create Feature Flag</h3>
            <form onSubmit={handleCreateFlag} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Flag Key</label>
                <input
                  type="text"
                  placeholder="e.g. beta_cbt_proctoring"
                  value={flagKey}
                  onChange={(e) => setFlagKey(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Enables AI eye-tracking & webcam proctoring for CBT"
                  value={flagDesc}
                  onChange={(e) => setFlagDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFlagModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingFlag}
                  className="px-4 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50"
                >
                  {submittingFlag ? 'Creating...' : 'Create Flag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

