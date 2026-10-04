'use client';

import { useState, useEffect, useContext, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Context } from 'src/component/helper/Context';
import {
  FiSearch,
  FiRefreshCw,
  FiTrash2,
  FiArrowRight,
  FiArrowLeft,
  FiInbox,
  FiCheckCircle,
  FiPlus,
  FiClock,
} from 'react-icons/fi';
import { BiShieldQuarter, BiInfoCircle } from 'react-icons/bi';

export default function MetaMessengerDetails({
  platform = 'facebook',
  title = 'Facebook Messenger',
  subtitle = 'Manage customer conversations and direct replies via Meta Graph API',
  IconComponent,
  brandBadge = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
}) {
  const router = useRouter();
  const { user } = useContext(Context);
  const role = (user?.role || 'developer').toLowerCase();
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isAdminOrManager = ['admin', 'superadmin', 'manager'].includes(role);
  const hasPlatformPerm = isAdminOrManager || permissions.includes(`${platform}-messages`) || permissions.includes('chats');
  const canManage = Boolean(isAdminOrManager || hasPlatformPerm || permissions.includes('support') || role === 'support');
  const canDelete = Boolean(isAdminOrManager || hasPlatformPerm);

  const [conversations, setConversations] = useState([]);
  const [config, setConfig] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [creatingTestConv, setCreatingTestConv] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Fetch Meta config
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/marketing/developer/meta/config');
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
      }
    } catch (err) {
      console.error('Failed to fetch Meta config:', err);
    }
  }, []);

  // Fetch conversations
  const fetchConversations = useCallback(
    async (showLoading = false) => {
      try {
        if (showLoading) setLoading(true);
        const url = `/api/marketing/developer/meta/conversations?platform=${platform}&status=ALL`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && Array.isArray(data.records)) {
          setConversations(data.records);
        }
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [platform]
  );

  useEffect(() => {
    fetchConfig();
    fetchConversations(true);
  }, [fetchConfig, fetchConversations]);

  // Background polling every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // Create test conversation
  const handleCreateTestConversation = async () => {
    try {
      setCreatingTestConv(true);
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const res = await fetch('/api/marketing/developer/meta/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          recipientName: `${platform === 'whatsapp' ? 'WhatsApp Lead' : platform === 'instagram' ? 'Instagram Lead' : 'Facebook Customer'} #${randomId}`,
          recipientPhone: platform === 'whatsapp' ? `+1-555-${randomId}` : null,
          initialMessage: `Hello! I am reaching out with a question about our enrollment system on ${title}.`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchConversations(false);
      }
    } catch (err) {
      console.error('Failed to create test conversation:', err);
    } finally {
      setCreatingTestConv(false);
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (id, e) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation and message history?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/marketing/developer/meta/conversations?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const channelConfig = config?.[platform];
  const isConfigured = Boolean(
    typeof channelConfig === 'object' && channelConfig !== null
      ? channelConfig.configured
      : channelConfig
  );

  // Filter conversations
  const filteredConvs = conversations.filter((c) => {
    let matchesStatus = true;
    const st = String(c.status || 'OPEN').toUpperCase();
    if (statusFilter === 'OPEN') {
      matchesStatus = st === 'OPEN';
    } else if (statusFilter === 'ACTIVE') {
      matchesStatus = st === 'ACTIVE' || st === 'OPEN';
    } else if (statusFilter === 'RESOLVED') {
      matchesStatus = st === 'RESOLVED';
    } else if (statusFilter === 'CLOSED') {
      matchesStatus = st === 'CLOSED';
    }

    if (!matchesStatus) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.recipient_name?.toLowerCase().includes(q) ||
      c.recipient_phone?.toLowerCase().includes(q) ||
      c.last_message_text?.toLowerCase().includes(q) ||
      String(c.id).includes(q)
    );
  });

  // Calculate metrics
  const totalCount = conversations.length;
  const openCount = conversations.filter((c) => String(c.status || 'OPEN').toUpperCase() === 'OPEN').length;
  const activeCount = conversations.filter((c) => ['OPEN', 'ACTIVE'].includes(String(c.status || '').toUpperCase())).length;
  const resolvedCount = conversations.filter((c) => ['RESOLVED', 'CLOSED'].includes(String(c.status || '').toUpperCase())).length;

  if (!canManage) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center max-w-md mx-auto my-12 shadow-xs">
        <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center text-3xl">
          <BiShieldQuarter />
        </div>
        <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Access Restricted</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Your account role (<span className="font-medium capitalize">{role}</span>) does not have permission to manage this workspace.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href={`/developer/${platform}-messages`}
            className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Back to Chat"
          >
            <FiArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                {title} Workspace
              </h1>
              <span className={`text-[11px] font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${brandBadge}`}>
                Support Hub
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Health status badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-normal border transition-colors ${
              isConfigured
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}
            />
            <span>{isConfigured ? 'Meta API Connected' : 'Demo Mode'}</span>
          </div>

          <button
            type="button"
            onClick={handleCreateTestConversation}
            disabled={creatingTestConv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer shadow-xs"
            title="Create a simulated conversation"
          >
            <FiPlus className="w-3.5 h-3.5" />
            <span>{creatingTestConv ? 'Creating...' : 'Test Thread'}</span>
          </button>

          <button
            type="button"
            onClick={() => fetchConversations(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer shadow-xs"
            title="Refresh conversations"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Counters (Data Boxes) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`bg-white dark:bg-slate-900 border rounded-xl p-3.5 sm:p-4 shadow-xs cursor-pointer transition-all ${
            statusFilter === 'ALL'
              ? 'border-indigo-600 ring-2 ring-indigo-600/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">All Sessions</div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{totalCount}</div>
        </div>
        <div
          onClick={() => setStatusFilter('OPEN')}
          className={`bg-white dark:bg-slate-900 border rounded-xl p-3.5 sm:p-4 shadow-xs cursor-pointer transition-all ${
            statusFilter === 'OPEN'
              ? 'border-blue-600 ring-2 ring-blue-600/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Awaiting Reply</div>
          <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{openCount}</div>
        </div>
        <div
          onClick={() => setStatusFilter('ACTIVE')}
          className={`bg-white dark:bg-slate-900 border rounded-xl p-3.5 sm:p-4 shadow-xs cursor-pointer transition-all ${
            statusFilter === 'ACTIVE'
              ? 'border-emerald-600 ring-2 ring-emerald-600/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">Active Chats</div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</div>
        </div>
        <div
          onClick={() => setStatusFilter('RESOLVED')}
          className={`bg-white dark:bg-slate-900 border rounded-xl p-3.5 sm:p-4 shadow-xs cursor-pointer transition-all ${
            statusFilter === 'RESOLVED'
              ? 'border-amber-600 ring-2 ring-amber-600/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">Closed / Resolved</div>
          <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{resolvedCount}</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search visitor, developer, message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-600 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'OPEN', label: 'Open' },
            { id: 'ACTIVE', label: 'Active' },
            { id: 'RESOLVED', label: 'Resolved' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversations List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        {loading && conversations.length === 0 ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <FiRefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            <span className="text-xs font-normal">Loading {title} conversations...</span>
          </div>
        ) : filteredConvs.length === 0 ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <FiInbox className="w-8 h-8 text-slate-300 dark:text-slate-600 stroke-1" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No conversations found</p>
            <p className="text-xs text-slate-400 max-w-sm">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Try adjusting your search query or filter criteria.'
                : 'No customer messages have arrived on this channel yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredConvs.map((c) => {
              const status = String(c.status || 'OPEN').toUpperCase();
              const name = c.recipient_name || (platform === 'whatsapp' ? c.recipient_phone : null) || 'Customer';
              return (
                <div
                  key={c.id}
                  onClick={() => router.push(`/developer/${platform}-messages?convId=${c.id}`)}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-sm sm:text-base shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      {name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {name}
                        </h3>
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          #{c.id}
                        </span>

                        <span
                          className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-md ${
                            status === 'RESOLVED'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {status}
                        </span>

                        {c.unread_count > 0 && (
                          <span className="text-[9px] font-bold uppercase text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-900 px-2 py-0.5 rounded-md animate-pulse">
                            {c.unread_count} new msg
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 truncate mb-1">
                        {c.last_message_text ? (
                          <>
                            <span className="font-medium text-slate-500">
                              {c.last_sender_type === 'page' ? 'Staff: ' : 'Customer: '}
                            </span>
                            {c.last_message_text}
                          </>
                        ) : (
                          <span className="text-slate-400 italic">No messages yet</span>
                        )}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <FiClock className="w-3 h-3" />
                          <span>
                            {c.last_message_at
                              ? new Date(c.last_message_at).toLocaleString()
                              : c.created_at
                              ? new Date(c.created_at).toLocaleDateString()
                              : ''}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <Link
                      href={`/developer/${platform}-messages?convId=${c.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs transition-colors"
                    >
                      <span>Join Chat</span>
                      <FiArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    {canDelete && (
                      <button
                        type="button"
                        disabled={deletingId === c.id}
                        onClick={(e) => handleDeleteConversation(c.id, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                        title="Delete conversation"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
