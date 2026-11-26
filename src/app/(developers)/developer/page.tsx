'use client';
import { useState, useEffect, useContext, useCallback } from 'react';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';
import { SITE_NAME } from 'src/lib/database/secret';
import LoadingScreen from 'src/component/common/LoadingScreen';

const formatDateTime = (val: any) => {
    if (!val) return '-';
    try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '-';
    }
};

const formatDate = (val: any) => {
    if (!val) return '-';
    try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return '-';
    }
};

const priorityClass = (priority: any) => {
    const p = String(priority || '').toLowerCase();
    if (p === 'urgent' || p === 'high') {
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
    }
    if (p === 'medium') {
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    }
    return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
};

const statusClass = (status: any) => {
    const s = String(status || '').toLowerCase();
    if (s === 'completed' || s === 'done' || s === 'success') {
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
    }
    if (s === 'in_progress' || s === 'in-progress' || s === 'review') {
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
    }
    if (s === 'failed' || s === 'failed_login') {
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
    }
    return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
};

export default function DeveloperConsolePage() {
    const { user: contextUser } = useContext<any>(Context) || {};
    const [developer, setDeveloper] = useState<any>(contextUser || null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loginActivities, setLoginActivities] = useState<any[]>([]);
    const [notices, setNotices] = useState<any[]>([]);
    const [pendingChats, setPendingChats] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [activityLogs, setActivityLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    const loadConsole = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const res = await fetch('/api/marketing/developer/console');
            const json = await res.json();
            if (json?.success) {
                if (json.developer) setDeveloper(json.developer);
                setSessions(Array.isArray(json.sessions) ? json.sessions : []);
                setLoginActivities(Array.isArray(json.loginActivities) ? json.loginActivities : []);
                setNotices(Array.isArray(json.notices) ? json.notices : []);
                setPendingChats(Array.isArray(json.pendingChats) ? json.pendingChats : []);
                setTasks(Array.isArray(json.tasks) ? json.tasks : []);
                setActivityLogs(Array.isArray(json.activityLogs) ? json.activityLogs : []);
            }
        } catch (err) {
            console.error('Error loading developer console:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadConsole(false);
    }, [loadConsole]);

    const activeDev = developer || contextUser;

    if (loading && !activeDev) {
        return <LoadingScreen fullScreen={false} label="Loading developer console..."/>;
    }

    if (!activeDev) {
        return (
            <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 text-center space-y-3 text-xs">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Session Unavailable</h2>
                <p className="text-slate-500 font-normal">
                    Unable to locate active developer credentials. Please login to continue.
                </p>
                <div>
                    <Link href="/developer-auth/login" className="inline-block px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors">
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    const roleName = activeDev.role_name || activeDev.roleName || activeDev.role || 'Developer';
    const isActive = activeDev.isActive !== false && activeDev.is_active !== false;
    const isVerified = Boolean(activeDev.isVerified || activeDev.email_verified || activeDev.is_verified);
    const twoFactorEnabled = Boolean(activeDev.two_factor_enabled);
    const openTasksCount = tasks.filter((t) => !['completed', 'done', 'closed'].includes(String(t.status || '').toLowerCase())).length;
    const totalUnreadChats = pendingChats.reduce((sum, c) => sum + Number(c.unread_count || 0), 0);

    return (
        <div className="w-full space-y-4 text-xs text-slate-800 dark:text-slate-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {roleName}
                            </span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'}`}>
                                {isActive ? 'Active' : 'Inactive'}
                            </span>
                            {isVerified && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded border bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                                    Verified
                                </span>
                            )}
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                                2FA: {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                        </div>
                        <h1 className="text-base font-semibold text-slate-900 dark:text-white mt-1">
                            {activeDev.name || 'Developer Console'}
                        </h1>
                        <p className="text-xs text-slate-500 font-normal">
                            {SITE_NAME} Developer Workspace
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => loadConsole(true)}
                            disabled={refreshing}
                            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {refreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                        <Link href="/developer/profile" className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition-colors">
                            My Profile
                        </Link>
                        <Link href="/developer/settings" className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition-colors">
                            Settings
                        </Link>
                    </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                        <div className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-medium">Email</div>
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate">{activeDev.email || '-'}</div>
                    </div>
                    <div>
                        <div className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-medium">Phone</div>
                        <div className="font-medium text-slate-800 dark:text-slate-200">{activeDev.phone || '-'}</div>
                    </div>
                    <div>
                        <div className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-medium">Account ID &amp; Joined</div>
                        <div className="font-mono text-slate-700 dark:text-slate-300">
                            #{activeDev.id} &bull; {formatDate(activeDev.created_at || activeDev.createdAt)}
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-medium">Last Login</div>
                        <div className="font-normal text-slate-700 dark:text-slate-300">
                            {formatDateTime(activeDev.last_login_at)}
                        </div>
                    </div>
                </div>

                {activeDev.bio && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400">
                        {activeDev.bio}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 space-y-1">
                    <div className="text-[10px] uppercase font-medium text-slate-400 dark:text-slate-500">Assigned Tasks</div>
                    <div className="text-base font-semibold text-slate-900 dark:text-white">{openTasksCount} Open</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{tasks.length} total records</div>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 space-y-1">
                    <div className="text-[10px] uppercase font-medium text-slate-400 dark:text-slate-500">Internal Pending Chats</div>
                    <div className="text-base font-semibold text-slate-900 dark:text-white">{pendingChats.length} Threads</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{totalUnreadChats} unread messages</div>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 space-y-1">
                    <div className="text-[10px] uppercase font-medium text-slate-400 dark:text-slate-500">Active Notices</div>
                    <div className="text-base font-semibold text-slate-900 dark:text-white">{notices.length} Notices</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Team announcements</div>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 space-y-1">
                    <div className="text-[10px] uppercase font-medium text-slate-400 dark:text-slate-500">Active Login Sessions</div>
                    <div className="text-base font-semibold text-slate-900 dark:text-white">{sessions.length} Active</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{loginActivities.length} recent login events</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                            <h2 className="text-xs font-semibold text-slate-900 dark:text-white">Tasks</h2>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Developer assignments &amp; sprint tasks</p>
                        </div>
                        <Link href="/developer/tasks" className="text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:underline">
                            Open Tasks &rarr;
                        </Link>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
                        {tasks.length === 0 ? (
                            <div className="p-6 text-center text-slate-500">No tasks assigned.</div>
                        ) : (
                            tasks.map((task: any) => (
                                <div key={`task-${task.id}`} className="p-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 space-y-1.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="font-medium text-slate-900 dark:text-white">{task.title}</div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border uppercase ${priorityClass(task.priority)}`}>
                                                {task.priority || 'normal'}
                                            </span>
                                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border uppercase ${statusClass(task.status)}`}>
                                                {String(task.status || 'todo').replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                    </div>
                                    {task.description && (
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{task.description}</p>
                                    )}
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                                        <span>Assignee: {task.assignee_name || 'Unassigned'}</span>
                                        <span>{task.due_date ? `Due: ${formatDate(task.due_date)}` : formatDateTime(task.updated_at || task.created_at)}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                            <h2 className="text-xs font-semibold text-slate-900 dark:text-white">Internal Pending Chats</h2>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Unread messages &amp; threads awaiting reply</p>
                        </div>
                        <Link href="/developer/chats" className="text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:underline">
                            Open Chats &rarr;
                        </Link>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
                        {pendingChats.length === 0 ? (
                            <div className="p-6 text-center text-slate-500">No pending internal chats.</div>
                        ) : (
                            pendingChats.map((chat: any) => {
                                const others = Array.isArray(chat.participants)
                                    ? chat.participants.filter((p: any) => Number(p.id) !== Number(activeDev.id)).map((p: any) => p.name).filter(Boolean)
                                    : [];
                                const chatTitle = chat.title || others.join(', ') || `Conversation #${chat.id}`;
                                return (
                                    <Link
                                        key={`chat-${chat.id}`}
                                        href={`/developer/chats?chatId=${chat.id}`}
                                        className="block p-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 space-y-1 transition-colors"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-medium text-slate-900 dark:text-white truncate">{chatTitle}</span>
                                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${Number(chat.unread_count || 0) > 0
                                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}>
                                                {Number(chat.unread_count || 0) > 0 ? `${chat.unread_count} unread` : 'Awaiting reply'}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1">
                                            <span className="font-medium">{chat.last_message_sender_name || 'Teammate'}:</span> {chat.last_message}
                                        </p>
                                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                            {formatDateTime(chat.last_message_at || chat.updated_at)}
                                        </div>
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                            <h2 className="text-xs font-semibold text-slate-900 dark:text-white">Notices</h2>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Company &amp; engineering notice board</p>
                        </div>
                        <Link href="/developer/notice-board" className="text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:underline">
                            Noticeboard &rarr;
                        </Link>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
                        {notices.length === 0 ? (
                            <div className="p-6 text-center text-slate-500">No active notices posted.</div>
                        ) : (
                            notices.map((notice: any) => (
                                <div key={`notice-${notice.id}`} className="p-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 space-y-1.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="font-medium text-slate-900 dark:text-white">{notice.title}</div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {notice.is_pinned && (
                                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900">
                                                    Pinned
                                                </span>
                                            )}
                                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border uppercase ${priorityClass(notice.priority)}`}>
                                                {notice.priority || 'NORMAL'}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 whitespace-pre-line">
                                        {notice.content}
                                    </p>
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                                        <span>{notice.category || 'GENERAL'} &bull; By {notice.creator_name || 'System'}</span>
                                        <span>{formatDateTime(notice.created_at)}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                            <h2 className="text-xs font-semibold text-slate-900 dark:text-white">Activity Log</h2>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Recent tasks, notices, and security activity</p>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                            {activityLogs.length} events
                        </span>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                        {activityLogs.length === 0 ? (
                            <div className="p-6 text-center text-slate-500">No developer activity recorded yet.</div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-medium text-slate-500 dark:text-slate-400">
                                    <tr>
                                        <th className="py-2 px-3">Action</th>
                                        <th className="py-2 px-3">Module</th>
                                        <th className="py-2 px-3">Done By</th>
                                        <th className="py-2 px-3 text-right">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                                    {activityLogs.map((log: any, idx: number) => (
                                        <tr key={`act-${log.id ?? idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                                                {log.action_name || log.action || '-'}
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                    {log.module_label || log.module || log.entity_type || '-'}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                {log.done_by || log.actor || 'Developer'}
                                            </td>
                                            <td className="py-2.5 px-3 text-right text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                                {formatDateTime(log.created_at)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>
            </div>

            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-xs font-semibold text-slate-900 dark:text-white">Login Data &amp; Active Sessions</h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Active authentication tokens and recent sign-in history</p>
                    </div>
                    <Link href="/developer/profile" className="text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:underline">
                        Manage Sessions &rarr;
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
                    <div className="p-4 space-y-2.5">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Active Sessions ({sessions.length})
                        </div>
                        {sessions.length === 0 ? (
                            <div className="py-4 text-slate-500">No active sessions found.</div>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {sessions.map((sess: any) => (
                                    <div key={`sess-${sess.id}`} className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200">
                                                IP: {sess.ip_address || 'Unknown'}
                                            </span>
                                            {sess.is_current && (
                                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                                                    Current Session
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                            {sess.user_agent || 'Unknown device'}
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                            <span>Active: {formatDateTime(sess.last_active_at || sess.created_at)}</span>
                                            <span>Expires: {formatDate(sess.expires_at)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-4 space-y-2.5">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Login History ({loginActivities.length})
                        </div>
                        {loginActivities.length === 0 ? (
                            <div className="py-4 text-slate-500">No recent login attempts recorded.</div>
                        ) : (
                            <div className="overflow-x-auto max-h-64 overflow-y-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-medium text-slate-500">
                                            <th className="py-1.5 pr-2">Status</th>
                                            <th className="py-1.5 px-2">IP Address</th>
                                            <th className="py-1.5 px-2">Reason / Agent</th>
                                            <th className="py-1.5 pl-2 text-right">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                        {loginActivities.map((act: any) => (
                                            <tr key={`login-${act.id}`}>
                                                <td className="py-2 pr-2">
                                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${statusClass(act.status)}`}>
                                                        {act.status}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-2 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                                                    {act.ip_address || '-'}
                                                </td>
                                                <td className="py-2 px-2 text-[11px] text-slate-500 dark:text-slate-400 max-w-[180px] truncate">
                                                    {act.failure_reason || act.user_agent || '-'}
                                                </td>
                                                <td className="py-2 pl-2 text-right font-mono text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                                    {formatDateTime(act.login_time || act.created_at)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
