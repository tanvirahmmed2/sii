'use client';

import { useState, useEffect, useContext, useMemo } from 'react';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';
import { ROLE_PERMISSIONS } from 'src/app/(developers)/developer/layout';
import { SITE_NAME } from 'src/lib/database/secret';

const ALL_MODULES = [
  // Workspace & Management
  {
    slug: 'overview',
    label: 'Platform Overview',
    path: '/developer/overview',
    category: 'Workspace',
    desc: 'Platform operations summary, key metrics, and administrative statistics.',
  },
  {
    slug: 'tasks',
    label: 'Tasks & Sprints',
    path: '/developer/tasks',
    category: 'Workspace',
    desc: 'Platform task tracking, sprint assignments, and developer tickets.',
  },
  {
    slug: 'notices',
    label: 'Company Notices',
    path: '/developer/notices',
    category: 'Workspace',
    desc: 'Internal announcements, memos, and operational notifications.',
  },
  {
    slug: 'chats',
    label: 'Internal Chat',
    path: '/developer/chats',
    category: 'Workspace',
    desc: 'Real-time internal team discussions, channels, and developer chat.',
  },

  // Websites & Audience
  {
    slug: 'websites',
    label: 'Websites',
    path: '/developer/websites',
    category: 'Audience',
    desc: 'Provisioned client subdomains, hosted school portals, and websites.',
  },
  {
    slug: 'creators',
    label: 'Creators',
    path: '/developer/creators',
    category: 'Audience',
    desc: 'Registered workspace creators, tenant managers, and institution leads.',
  },
  {
    slug: 'users',
    label: 'End-Users',
    path: '/developer/users',
    category: 'Audience',
    desc: 'Platform user directory across students, teachers, and staff.',
  },
  {
    slug: 'leads',
    label: 'Leads',
    path: '/developer/leads',
    category: 'Audience',
    desc: 'Inbound prospect inquiries, demo requests, and sales leads.',
  },
  {
    slug: 'subscribers',
    label: 'Subscribers',
    path: '/developer/subscribers',
    category: 'Audience',
    desc: 'Newsletter subscribers and email distribution lists.',
  },

  // Commerce & Billing
  {
    slug: 'packages',
    label: 'Packages',
    path: '/developer/packages',
    category: 'Commerce',
    desc: 'Platform subscription tiers, pricing packages, and usage quotas.',
  },
  {
    slug: 'features',
    label: 'Features',
    path: '/developer/features',
    category: 'Commerce',
    desc: 'Modular platform feature definitions and capability catalog.',
  },
  {
    slug: 'subscriptions',
    label: 'Subscriptions',
    path: '/developer/subscriptions',
    category: 'Commerce',
    desc: 'Active creator recurring subscriptions and renewal lifecycles.',
  },
  {
    slug: 'purchases',
    label: 'Purchases',
    path: '/developer/purchases',
    category: 'Commerce',
    desc: 'Package purchase orders, addon acquisitions, and purchase logs.',
  },
  {
    slug: 'payments',
    label: 'Payments',
    path: '/developer/payments',
    category: 'Commerce',
    desc: 'Revenue transactions, payment gateway settlements, and invoices.',
  },

  // Content & Resources
  {
    slug: 'blogs',
    label: 'Blogs',
    path: '/developer/blogs',
    category: 'Content',
    desc: 'Engineering articles, release notes, and documentation posts.',
  },
  {
    slug: 'policies',
    label: 'Company Policies',
    path: '/developer/policies',
    category: 'Content',
    desc: 'Internal operational guidelines, privacy policy, and service terms.',
  },
  {
    slug: 'updates',
    label: 'Product Updates',
    path: '/developer/updates',
    category: 'Content',
    desc: 'System changelogs, platform version releases, and roadmap items.',
  },
  {
    slug: 'tutorials',
    label: 'Tutorials',
    path: '/developer/tutorials',
    category: 'Content',
    desc: 'Step-by-step developer guides and educational walkthroughs.',
  },
  {
    slug: 'faqs',
    label: 'FAQs',
    path: '/developer/faqs',
    category: 'Content',
    desc: 'Frequently asked questions and client troubleshooting entries.',
  },

  // Support & Comms
  {
    slug: 'support',
    label: 'Support Tickets',
    path: '/developer/support',
    category: 'Support',
    desc: 'Customer trouble tickets, issue triaging, and incident resolutions.',
  },
  {
    slug: 'live-chats',
    label: 'Live Chats',
    path: '/developer/live-chats',
    category: 'Support',
    desc: 'Active client live chat sessions and visitor conversations.',
  },
  {
    slug: 'contacts',
    label: 'Contacts',
    path: '/developer/contacts',
    category: 'Support',
    desc: 'Submissions from public contact forms and inbound inquiries.',
  },
  {
    slug: 'reports',
    label: 'Reports',
    path: '/developer/reports',
    category: 'Support',
    desc: 'User grievance reports, violation alerts, and content moderation.',
  },
  {
    slug: 'reviews',
    label: 'Reviews',
    path: '/developer/reviews',
    category: 'Support',
    desc: 'Creator reviews, star ratings moderation, and testimonials.',
  },

  // Meta Channels
  {
    slug: 'facebook-messages',
    label: 'Facebook Messages',
    path: '/developer/facebook-messages',
    category: 'Channels',
    desc: 'Meta Facebook Page messages and customer conversation threads.',
  },
  {
    slug: 'instagram-messages',
    label: 'Instagram Messages',
    path: '/developer/instagram-messages',
    category: 'Channels',
    desc: 'Instagram Direct customer messaging and inquiries.',
  },
  {
    slug: 'whatsapp-messages',
    label: 'WhatsApp Messages',
    path: '/developer/whatsapp-messages',
    category: 'Channels',
    desc: 'WhatsApp Business API threads and notifications.',
  },

  // Team & Governance
  {
    slug: 'developers',
    label: 'Developers Team',
    path: '/developer/developers',
    category: 'Team',
    desc: 'Platform engineering roster, role assignments, and team access.',
  },
  {
    slug: 'roles',
    label: 'Roles & Permissions',
    path: '/developer/roles',
    category: 'Team',
    desc: 'Role-based access control, security roles, and permissions matrix.',
  },
  {
    slug: 'payroll',
    label: 'Payroll & Salaries',
    path: '/developer/payroll',
    category: 'Team',
    desc: 'Staff compensation, payroll generation, and salary disbursement.',
  },
  {
    slug: 'my-salaries',
    label: 'My Salaries',
    path: '/developer/my-salaries',
    category: 'Team',
    desc: 'Personal compensation history, pay vouchers, and payment records.',
  },

  // Platform & Settings
  {
    slug: 'modules',
    label: 'Database Modules',
    path: '/developer/modules',
    category: 'Platform',
    desc: 'Database schema tables, module registration, and system tables.',
  },
  {
    slug: 'spams',
    label: 'Spam Defense',
    path: '/developer/spams',
    category: 'Platform',
    desc: 'Spam prevention filters, rate limits, and security blocklists.',
  },
  {
    slug: 'profile',
    label: 'My Profile',
    path: '/developer/profile',
    category: 'Account',
    desc: 'Personal developer credentials, active sessions, and security.',
  },
  {
    slug: 'settings',
    label: 'Account Settings',
    path: '/developer/settings',
    category: 'Account',
    desc: 'Developer account settings, password management, and preferences.',
  },
];

const formatDate = (val) => {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (e) {
    return '—';
  }
};

export default function DeveloperOverviewPage() {
  const { user: contextUser } = useContext(Context) || {};
  const [developer, setDeveloper] = useState(contextUser || null);
  const [activeSessions, setActiveSessions] = useState(1);
  const [stats, setStats] = useState({ assigned_tickets: 0, ticket_replies_count: 0 });
  const [loading, setLoading] = useState(!contextUser);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const [meRes, profileRes] = await Promise.allSettled([
          fetch('/api/marketing/developer/me').then((r) => r.json()),
          fetch('/api/marketing/developer/profile').then((r) => r.json()),
        ]);

        if (isMounted) {
          if (meRes.status === 'fulfilled' && meRes.value?.success && meRes.value?.user) {
            setDeveloper((prev) => ({ ...prev, ...meRes.value.user }));
          }
          if (profileRes.status === 'fulfilled' && profileRes.value?.success) {
            const p = profileRes.value;
            if (p.developer) {
              setDeveloper((prev) => ({ ...prev, ...p.developer }));
            }
            if (p.activeSessions !== undefined) {
              setActiveSessions(p.activeSessions);
            }
            if (p.stats) {
              setStats(p.stats);
            }
          }
        }
      } catch (err) {
        console.error('Error loading developer overview:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAllData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute allowed modules for this specific developer
  const allowedModules = useMemo(() => {
    const dev = developer || contextUser;
    if (!dev) return [];

    const role = (dev.role || 'developer').toLowerCase();
    const userPerms = Array.isArray(dev.permissions) ? dev.permissions : null;
    const fallbackModules = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.developer || [];
    const permissionsList = userPerms && userPerms.length > 0 ? userPerms : fallbackModules;

    const isAllowed = (slug) => {
      if (slug === 'profile' || slug === 'settings') return true;
      if (permissionsList.includes(slug)) return true;
      if (slug === 'roles' && (permissionsList.includes('developers') || permissionsList.includes('roles'))) return true;
      if (permissionsList.some((p) => p === slug || p.startsWith(`${slug}:`))) return true;
      return false;
    };

    return ALL_MODULES.filter((mod) => isAllowed(mod.slug));
  }, [developer, contextUser]);

  // Filtered allowed modules based on search query
  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return allowedModules;
    const q = searchQuery.toLowerCase().trim();
    return allowedModules.filter(
      (mod) =>
        mod.label.toLowerCase().includes(q) ||
        mod.desc.toLowerCase().includes(q) ||
        mod.path.toLowerCase().includes(q) ||
        mod.category.toLowerCase().includes(q)
    );
  }, [allowedModules, searchQuery]);

  const activeDev = developer || contextUser;

  if (loading && !activeDev) {
    return (
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 text-center space-y-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Developer Console</h2>
        <p className="text-xs text-slate-500 font-normal">Loading developer account and assigned modules...</p>
      </div>
    );
  }

  if (!activeDev) {
    return (
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 text-center space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Session Unavailable</h2>
        <p className="text-xs text-slate-500 font-normal">
          Unable to locate active developer credentials. Please sign in to access developer modules.
        </p>
        <div>
          <Link
            href="/developer-auth/login"
            className="inline-block px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const roleName = activeDev.roleName || activeDev.role_name || activeDev.role || 'Developer';
  const isActive = activeDev.isActive !== false && activeDev.is_active !== false;
  const isVerified = Boolean(activeDev.isVerified || activeDev.email_verified || activeDev.is_verified);

  const developerDataCards = [
    {
      label: 'System Role',
      value: roleName,
      sub: activeDev.isAdmin ? 'Super Admin Privileges' : 'Developer Access',
    },
    {
      label: 'Account Status',
      value: isActive ? 'Active' : 'Inactive',
      sub: isVerified ? 'Email Verified' : 'Unverified',
      isBadge: true,
      active: isActive,
    },
    {
      label: 'Allowed Modules',
      value: `${allowedModules.length} Modules`,
      sub: 'Granted Privileges',
    },
    {
      label: 'Active Sessions',
      value: `${activeSessions} Active`,
      sub: 'Current Token Valid',
    },
    {
      label: 'Support Assigned',
      value: `${stats.assigned_tickets || 0} Tickets`,
      sub: `${stats.ticket_replies_count || 0} Replies Sent`,
    },
    {
      label: 'Member Since',
      value: formatDate(activeDev.created_at || activeDev.createdAt),
      sub: activeDev.last_login_at ? `Last: ${formatDate(activeDev.last_login_at)}` : 'Current Session',
    },
  ];

  return (
    <div className="w-full space-y-4">
      {/* Developer Profile Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {roleName}
              </span>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                }`}
              >
                {isActive ? 'Account Active' : 'Account Inactive'}
              </span>
              {isVerified && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded border bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                  Verified
                </span>
              )}
            </div>
            <h1 className="text-base font-semibold text-slate-900 dark:text-white mt-1">
              {activeDev.name || 'Developer Console'}
            </h1>
            <p className="text-xs text-slate-500 font-normal">
              {activeDev.designation || 'Software Engineer'} &bull; {SITE_NAME} Developer Operations
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/developer/profile"
              className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition-colors cursor-pointer"
            >
              My Profile
            </Link>
            <Link
              href="/developer/settings"
              className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition-colors cursor-pointer"
            >
              Account Settings
            </Link>
          </div>
        </div>

        {/* High-density developer contact / metadata row */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-y-2 gap-x-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              <span className="text-slate-400 dark:text-slate-500">Email:</span>{' '}
              <strong className="font-medium text-slate-800 dark:text-slate-200">{activeDev.email || '—'}</strong>
            </span>
            {activeDev.phone && (
              <span>
                <span className="text-slate-400 dark:text-slate-500">Phone:</span>{' '}
                <strong className="font-medium text-slate-800 dark:text-slate-200">{activeDev.phone}</strong>
              </span>
            )}
            <span>
              <span className="text-slate-400 dark:text-slate-500">Account ID:</span>{' '}
              <span className="font-mono text-slate-700 dark:text-slate-300">#{activeDev.id}</span>
            </span>
          </div>

          {(activeDev.github_profile || activeDev.githubProfile || activeDev.linkedin_profile || activeDev.linkedinProfile) && (
            <div className="flex items-center gap-3">
              {(activeDev.github_profile || activeDev.githubProfile) && (
                <a
                  href={activeDev.github_profile || activeDev.githubProfile}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
                >
                  GitHub
                </a>
              )}
              {(activeDev.linkedin_profile || activeDev.linkedinProfile) && (
                <a
                  href={activeDev.linkedin_profile || activeDev.linkedinProfile}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
                >
                  LinkedIn
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Developer Data / Metrics Boxes Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {developerDataCards.map((card, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 space-y-1"
          >
            <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 truncate">
              {card.label}
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {card.value}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-normal">
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Allowed Module Grids and Boxes */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Allowed Modules</h2>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {allowedModules.length} Accessible
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Workspaces and administrative modules authorized for your developer account.
            </p>
          </div>

          {/* Quick Search */}
          <div className="w-full sm:w-60">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search allowed modules..."
              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-500"
            />
          </div>
        </div>

        {/* Allowed Modules Grid Boxes */}
        {filteredModules.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredModules.map((item) => (
              <Link
                key={item.slug}
                href={item.path}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 hover:border-slate-400 dark:hover:border-slate-600 transition-colors flex flex-col justify-between space-y-2.5 cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 text-[9px] uppercase font-semibold text-slate-400 dark:text-slate-500 mb-1">
                    <span className="truncate">{item.category}</span>
                    <span className="text-[8px] px-1 py-0.2 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 shrink-0">
                      Allowed
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-200">
                    {item.label}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 font-normal">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between font-mono text-[10px] text-slate-400 dark:text-slate-500">
                  <span className="truncate">{item.path}</span>
                  <span className="text-slate-600 dark:text-slate-300 font-sans text-xs group-hover:translate-x-0.5 transition-transform">
                    &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 text-center space-y-2">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
              {searchQuery ? 'No matching modules found' : 'No allowed modules assigned'}
            </h3>
            <p className="text-xs text-slate-500 font-normal max-w-md mx-auto">
              {searchQuery
                ? `No allowed modules match "${searchQuery}".`
                : 'Your developer account currently has no module access granted. Contact a super administrator.'}
            </p>
            {searchQuery && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition-colors cursor-pointer"
                >
                  Clear Search
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
