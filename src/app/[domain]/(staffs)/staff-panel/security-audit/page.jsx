'use client';

import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiShield, FiKey, FiActivity, FiCpu, FiPlus, FiTrash2, FiRefreshCw, FiCopy, FiCheck } from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import Loader from 'src/component/common/Loader';

export default function SecurityAuditStaffPage() {
  const { website, getApiEndpoint } = useContext(TenantWebsiteContext);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('audit'); // audit | keys | webhooks | jobs
  const [data, setData] = useState({ audit_logs: [], api_keys: [], webhook_events: [], background_jobs: [] });

  // Key Modal
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [newSecretKey, setNewSecretKey] = useState('');
  const [submittingKey, setSubmittingKey] = useState(false);
  const [copied, setCopied] = useState(false);

  // Diff inspection modal
  const [selectedLog, setSelectedLog] = useState(null);

  const apiEndpoint = useMemo(() => getApiEndpoint('staff/panel/security-audit'), [getApiEndpoint]);

  const fetchData = useCallback(async (showToast = false) => {
    if (!apiEndpoint) return;
    try {
      if (showToast) setRefreshing(true);
      const res = await axios.get(apiEndpoint);
      if (res.data?.success) {
        setData(res.data);
        if (showToast) toast.success('Security & Audit logs refreshed');
      } else {
        toast.error(res.data?.error || 'Failed to load audit records');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Error connecting to audit service');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiEndpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateKey = async (e) => {
    e.preventDefault();
    if (!keyName.trim()) return;
    setSubmittingKey(true);
    try {
      const res = await axios.post(apiEndpoint, {
        action: 'create_api_key',
        name: keyName.trim(),
        permissions: ['read', 'write'],
      });
      if (res.data?.success) {
        toast.success('API Key generated successfully');
        setNewSecretKey(res.data.secret_key);
        fetchData();
      } else {
        toast.error(res.data?.error || 'Failed to create key');
      }
    } catch (err) {
      toast.error('Error generating key');
    } finally {
      setSubmittingKey(false);
    }
  };

  const handleRevokeKey = async (keyId) => {
    if (!confirm('Are you sure you want to revoke this API key? External systems using it will lose access.')) return;
    try {
      const res = await axios.delete(`${apiEndpoint}?key_id=${keyId}`);
      if (res.data?.success) {
        toast.success('API key revoked');
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to revoke API key');
    }
  };

  const handleRetryJob = async (jobId) => {
    try {
      const res = await axios.post(apiEndpoint, {
        action: 'retry_job',
        job_id: jobId,
      });
      if (res.data?.success) {
        toast.success('Background job re-queued');
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to re-queue job');
    }
  };

  const copySecret = () => {
    if (newSecretKey) {
      navigator.clipboard.writeText(newSecretKey);
      setCopied(true);
      toast.success('API Key copied to clipboard');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (loading) {
    return <Loader message="Loading Security, Audit & Webhook Console..." />;
  }

  const { audit_logs, api_keys, webhook_events, background_jobs } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FiShield className="text-primary" /> Security, Webhooks & Immutable Audit
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track full before/after JSON change diffs, manage hardware & developer API keys, and monitor idempotent webhook jobs.
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
            onClick={() => {
              setNewSecretKey('');
              setKeyName('');
              setIsKeyModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition shadow-sm"
          >
            <FiPlus /> Generate API Key
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === 'audit'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiShield /> Audit Change Log ({audit_logs.length})
        </button>
        <button
          onClick={() => setActiveTab('keys')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === 'keys'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiKey /> API Keys ({api_keys.length})
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === 'webhooks'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiActivity /> Webhook Deliveries ({webhook_events.length})
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === 'jobs'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FiCpu /> Background Jobs ({background_jobs.length})
        </button>
      </div>

      {/* Tab 1: Audit Log */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Actor</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Target Table</th>
                  <th className="px-6 py-3">IP Address</th>
                  <th className="px-6 py-3 text-right">Data Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {audit_logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                      No security audit log entries recorded yet. Modifications to financial records and student marks will stream here.
                    </td>
                  </tr>
                ) : (
                  audit_logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                        {new Date(log.logged_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white capitalize">
                        {log.actor_type} #{log.actor_id || 'System'}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-bold text-primary">
                        {log.action}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono">{log.table_name || 'N/A'}</td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">{log.ip_address || 'Internal'}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded"
                        >
                          View Diff
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: API Keys */}
      {activeTab === 'keys' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Active Scoped API Keys</h2>
            <span className="text-xs text-slate-500">Used for biometric terminals and external API integrations</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {api_keys.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-sm">
                No external API keys generated yet.
              </div>
            ) : (
              api_keys.map((k) => (
                <div key={k.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">{k.name}</span>
                    <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  </div>
                  <div className="font-mono text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 p-2 rounded">
                    Prefix: {k.key_prefix}••••••••
                  </div>
                  <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800">
                    <span>Created: {new Date(k.created_at).toLocaleDateString()}</span>
                    <button onClick={() => handleRevokeKey(k.id)} className="text-red-500 hover:text-red-700">
                      <FiTrash2 /> Revoke
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Webhooks */}
      {activeTab === 'webhooks' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Event Type</th>
                  <th className="px-6 py-3">Idempotency Key</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Retry Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {webhook_events.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-400">
                      No webhook deliveries logged yet. Payment and SMS webhooks will appear here.
                    </td>
                  </tr>
                ) : (
                  webhook_events.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4 text-xs text-slate-400">{new Date(w.created_at).toLocaleTimeString()}</td>
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900 dark:text-white">{w.event_type}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{w.idempotency_key || 'Auto'}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 text-xs font-bold rounded uppercase bg-emerald-100 text-emerald-800">
                          {w.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs">{w.retry_count || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Background Jobs */}
      {activeTab === 'jobs' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3">Job Type</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Attempts</th>
                  <th className="px-6 py-3">Scheduled At</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {background_jobs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-400">
                      No asynchronous background jobs queued.
                    </td>
                  </tr>
                ) : (
                  background_jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900 dark:text-white">{job.job_type}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 text-xs uppercase font-bold rounded ${
                          job.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs">{job.attempts} / {job.max_attempts}</td>
                      <td className="px-6 py-4 text-xs text-slate-400">{new Date(job.scheduled_at).toLocaleTimeString()}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRetryJob(job.id)}
                          className="px-2 py-1 text-xs text-primary hover:underline font-semibold"
                        >
                          Retry Job
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Generate API Key Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Generate Scoped API Key</h3>
            {!newSecretKey ? (
              <form onSubmit={handleCreateKey} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Key Name / Description</label>
                  <input
                    type="text"
                    placeholder="e.g. ZKTeco Biometric Terminal Sync Key"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsKeyModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingKey}
                    className="px-4 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-dark"
                  >
                    {submittingKey ? 'Generating...' : 'Generate Secret'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                  ⚠️ Save this key now! It will <strong>never</strong> be displayed again.
                </div>
                <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg font-mono text-xs break-all">
                  <span>{newSecretKey}</span>
                  <button onClick={copySecret} className="ml-auto text-primary p-1">
                    {copied ? <FiCheck /> : <FiCopy />}
                  </button>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setIsKeyModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-dark"
                  >
                    Done & Saved
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Audit Change Record Diff</h3>
            <div className="space-y-3 font-mono text-xs">
              <div>
                <span className="font-semibold text-slate-500">Action:</span> {selectedLog.action} on <code>{selectedLog.table_name}</code>
              </div>
              <div>
                <span className="font-semibold text-slate-500">Old Value:</span>
                <pre className="p-2 bg-slate-100 dark:bg-slate-800 rounded mt-1 overflow-x-auto">
                  {JSON.stringify(selectedLog.old_value, null, 2)}
                </pre>
              </div>
              <div>
                <span className="font-semibold text-slate-500">New Value:</span>
                <pre className="p-2 bg-slate-100 dark:bg-slate-800 rounded mt-1 overflow-x-auto text-emerald-600">
                  {JSON.stringify(selectedLog.new_value, null, 2)}
                </pre>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

