'use client';

import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';
import LoadingScreen from 'src/component/common/LoadingScreen';
import {
  FiBell,
  FiBookmark,
  FiShield,
  FiRefreshCw,
  FiCalendar,
  FiUser,
  FiCheckCircle,
  FiAlertCircle,
  FiFilter,
  FiTag,
  FiArrowRight,
  FiCopy,
  FiCheck,
  FiEdit3
} from 'react-icons/fi';

export default function DeveloperNoticeBoardPage() {
  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canManage = Boolean(
    permissions.includes('notices') ||
    permissions.includes('*') ||
    Number(user?.id) === 1 ||
    String(user?.email).toLowerCase() === 'tanvir004006@gmail.com'
  );

  const [notices, setNotices] = useState([]);
  const [currentDeveloper, setCurrentDeveloper] = useState(null);
  const [roles, setRoles] = useState([]);
  const [stats, setStats] = useState({
    total_notices: 0,
    pinned_notices: 0,
    urgent_notices: 0,
    my_role_notices: 0,
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (activeTab === 'MY_ROLE') {
        params.append('role', 'MY_ROLE');
      } else if (selectedRole !== 'ALL') {
        params.append('role', selectedRole);
      }

      if (selectedCategory !== 'ALL') {
        params.append('category', selectedCategory);
      }

      if (selectedPriority !== 'ALL') {
        params.append('priority', selectedPriority);
      }

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const res = await fetch(`/api/marketing/notice-board?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setNotices(data.notices || []);
        setCurrentDeveloper(data.currentDeveloper || null);
        setRoles(data.roles || []);
        setStats(data.stats || {
          total_notices: 0,
          pinned_notices: 0,
          urgent_notices: 0,
          my_role_notices: 0,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, [activeTab, selectedRole, selectedCategory, selectedPriority]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchNotices();
  };

  const handleCopyNotice = (notice) => {
    const text = `${notice.title}\n\n${notice.content}\n\nCategory: ${notice.category} | Priority: ${notice.priority} | Target: ${notice.target_role}`;
    navigator.clipboard.writeText(text);
    setCopiedId(notice.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const categories = ['ALL', 'GENERAL', 'URGENT', 'MAINTENANCE', 'POLICY', 'RELEASE'];
  const priorities = ['ALL', 'NORMAL', 'HIGH', 'URGENT', 'LOW'];

  const priorityStyles = {
    URGENT: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
    HIGH: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    NORMAL: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
    LOW: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };

  const categoryStyles = {
    GENERAL: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    URGENT: 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200',
    MAINTENANCE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
    POLICY: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200',
    RELEASE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
  };

  const effectiveDev = currentDeveloper || user;

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-medium text-slate-900 dark:text-white tracking-tight">
              Developer Notice Board
            </h1>
            <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              Workspace &amp; Overview
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Internal company notices, technical bulletins, and role-assigned engineering updates.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={fetchNotices}
            className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-normal transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <FiRefreshCw className="text-xs" />
            <span>Refresh</span>
          </button>

          {canManage && (
            <Link
              href="/developer/notices"
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-normal transition-colors flex items-center gap-1.5"
            >
              <FiEdit3 className="text-xs" />
              <span>Manage Notices</span>
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs">
        <Link
          href="/developer/notice-board"
          className="px-3 py-1.5 rounded font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900"
        >
          Notice Board
        </Link>
        <Link
          href="/developer/notices"
          className="px-3 py-1.5 rounded font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
        >
          Company Notices
        </Link>
        <Link
          href="/developer/tasks"
          className="px-3 py-1.5 rounded font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
        >
          Tasks &amp; Sprints
        </Link>
        <Link
          href="/developer/chats"
          className="px-3 py-1.5 rounded font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
        >
          Internal Chat
        </Link>
      </div>

      {effectiveDev && (
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-medium text-xs">
              {effectiveDev.name ? effectiveDev.name.charAt(0).toUpperCase() : 'D'}
            </div>
            <div>
              <div className="font-medium text-slate-900 dark:text-white">
                {effectiveDev.name}
                <span className="text-slate-400 font-normal ml-2">({effectiveDev.email})</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                Assigned Role: <span className="font-medium text-slate-800 dark:text-slate-200">{effectiveDev.roleName || 'Platform Developer'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('MY_ROLE');
                setSelectedRole('ALL');
              }}
              className={`px-3 py-1.5 rounded text-xs transition-colors cursor-pointer font-medium ${
                activeTab === 'MY_ROLE'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              For My Role ({stats.my_role_notices})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('ALL');
                setSelectedRole('ALL');
              }}
              className={`px-3 py-1.5 rounded text-xs transition-colors cursor-pointer font-normal ${
                activeTab === 'ALL'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              All Notices ({stats.total_notices})
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-normal">Total Bulletins</span>
            <FiBell className="text-blue-500 text-sm" />
          </div>
          <div className="text-xl font-medium text-slate-900 dark:text-white">
            {stats.total_notices}
          </div>
          <span className="text-[11px] text-slate-400 font-normal">Active notices</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-normal">Pinned Notices</span>
            <FiBookmark className="text-amber-500 text-sm" />
          </div>
          <div className="text-xl font-medium text-slate-900 dark:text-white">
            {stats.pinned_notices}
          </div>
          <span className="text-[11px] text-slate-400 font-normal">Important announcements</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-normal">Urgent Alerts</span>
            <FiAlertCircle className="text-red-500 text-sm" />
          </div>
          <div className="text-xl font-medium text-slate-900 dark:text-white">
            {stats.urgent_notices}
          </div>
          <span className="text-[11px] text-slate-400 font-normal">Priority bulletins</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-normal">Role Updates</span>
            <FiUser className="text-emerald-500 text-sm" />
          </div>
          <div className="text-xl font-medium text-slate-900 dark:text-white">
            {stats.my_role_notices}
          </div>
          <span className="text-[11px] text-slate-400 font-normal">Targeted to your role</span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <FiFilter className="text-xs" />
              <span>Category:</span>
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 font-normal'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-normal hover:bg-slate-800 cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <label className="text-slate-500 font-normal">Target Role:</label>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setActiveTab('FILTERED');
              }}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-normal text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <option value="ALL">All Target Roles</option>
              {roles.map((r) => (
                <option key={r.slug} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-slate-500 font-normal">Priority Level:</label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-normal text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && notices.length === 0 ? (
        <LoadingScreen message="Loading notices..." />
      ) : notices.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-12 text-center space-y-2 shadow-xs">
          <FiBell className="text-3xl text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">
            No notices found
          </h3>
          <p className="text-xs text-slate-400 font-normal max-w-sm mx-auto">
            There are currently no announcements matching your selected category, role, or search filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => {
            const isPinned = Boolean(notice.is_pinned);
            const isTargetMyRole = effectiveDev && (
              notice.target_role === 'ALL' ||
              String(notice.target_role).toLowerCase() === String(effectiveDev.roleName).toLowerCase() ||
              String(notice.target_role).toLowerCase() === String(effectiveDev.roleSlug).toLowerCase()
            );

            return (
              <div
                key={notice.id}
                className={`bg-white dark:bg-slate-900 border rounded shadow-xs p-5 transition-all space-y-3 ${
                  isPinned
                    ? 'border-amber-300 dark:border-amber-700/60 ring-1 ring-amber-200/50 dark:ring-amber-900/30'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isPinned && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-medium">
                          <FiBookmark className="text-[10px]" />
                          <span>Pinned Announcement</span>
                        </span>
                      )}

                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-normal uppercase ${categoryStyles[notice.category] || categoryStyles.GENERAL}`}>
                        {notice.category}
                      </span>

                      <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-normal ${priorityStyles[notice.priority] || priorityStyles.NORMAL}`}>
                        {notice.priority}
                      </span>

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-normal">
                        <FiTag className="text-[10px]" />
                        <span>Target: {notice.target_role || 'All Roles'}</span>
                      </span>

                      {isTargetMyRole && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-medium">
                          <FiCheck className="text-[10px]" />
                          <span>For Your Role</span>
                        </span>
                      )}
                    </div>

                    <h2 className="text-base sm:text-lg font-medium text-slate-900 dark:text-white pt-1">
                      {notice.title}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyNotice(notice)}
                    className="self-start px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-normal transition-colors cursor-pointer flex items-center gap-1"
                  >
                    {copiedId === notice.id ? (
                      <>
                        <FiCheck className="text-emerald-500 text-xs" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <FiCopy className="text-xs" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div
                  className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-normal leading-relaxed prose prose-xs sm:prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: notice.content }}
                />

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 font-normal">
                  <div className="flex items-center gap-2">
                    <FiUser className="text-xs" />
                    <span>
                      Posted by <strong className="text-slate-600 dark:text-slate-300 font-medium">{notice.author_name || 'Engineering Lead'}</strong> ({notice.author_role})
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <FiCalendar className="text-xs" />
                      <span>{new Date(notice.created_at).toLocaleDateString()}</span>
                    </div>

                    {notice.expires_at && (
                      <div className="flex items-center gap-1 text-amber-500">
                        <FiAlertCircle className="text-xs" />
                        <span>Valid until: {new Date(notice.expires_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

