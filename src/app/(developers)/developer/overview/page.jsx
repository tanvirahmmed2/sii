'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SITE_NAME } from 'src/lib/database/secret';

export default function PlatformOverviewPage() {
  const [developer, setDeveloper] = useState(null);
  const [counts, setCounts] = useState({
    developers: 0,
    packages: 0,
    websites: 0,
    blogs: 0,
    support: 0,
    revenueUsd: 0,
    revenueBdt: 0,
    leads: 0,
    subscribers: 0,
    subscriptions: 0,
    tasks: 0,
    notices: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchOverviewData = async () => {
      try {
        setLoading(true);

        const res = await fetch('/api/marketing/developer/overview');
        const data = await res.json();

        if (isMounted && data.success) {
          if (data.developer) setDeveloper(data.developer);
          if (data.counts) setCounts(data.counts);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOverviewData();
    return () => {
      isMounted = false;
    };
  }, []);

  const formatRevenue = () => {
    const { revenueUsd, revenueBdt } = counts;
    if (revenueUsd > 0 && revenueBdt > 0) {
      return `$${revenueUsd.toFixed(2)} USD / ৳${revenueBdt.toLocaleString()} BDT`;
    }
    if (revenueBdt > 0) {
      return `৳${revenueBdt.toLocaleString()} BDT`;
    }
    if (revenueUsd > 0) {
      return `$${revenueUsd.toFixed(2)} USD`;
    }
    return '$0.00 USD';
  };

  const statCards = [
    {
      title: 'Platform Developers',
      value: counts.developers,
      sub: 'Engineering Roster',
      href: '/developer/developers',
    },
    {
      title: 'Active Packages',
      value: counts.packages,
      sub: 'Pricing & Quota Tiers',
      href: '/developer/packages',
    },
    {
      title: 'Hosted Websites',
      value: counts.websites,
      sub: 'Tenant Portals',
      href: '/developer/websites',
    },
    {
      title: 'Active Subscriptions',
      value: counts.subscriptions,
      sub: 'Recurring Plans',
      href: '/developer/subscriptions',
    },
    {
      title: 'Open Tasks',
      value: counts.tasks,
      sub: 'Sprint Backlog',
      href: '/developer/tasks',
    },
    {
      title: 'Company Notices',
      value: counts.notices,
      sub: 'Internal Bulletins',
      href: '/developer/notices',
    },
    {
      title: 'Open Support',
      value: counts.support,
      sub: 'Pending Resolution',
      href: '/developer/support',
    },
    {
      title: 'Inbound Leads',
      value: counts.leads,
      sub: 'Prospect Inquiries',
      href: '/developer/leads',
    },
    {
      title: 'Subscribers',
      value: counts.subscribers,
      sub: 'Newsletter Audience',
      href: '/developer/subscribers',
    },
    {
      title: 'Total Revenue',
      value: formatRevenue(),
      sub: 'Settled Transactions',
      href: '/developer/payments',
    },
  ];

  const operationsDirectory = [
    {
      category: 'Workspace & Operations',
      items: [
        { label: 'Developer Console', path: '/developer', desc: 'Central workspace hub and module directories' },
        { label: 'Tasks & Sprints', path: '/developer/tasks', desc: 'Platform task tracking and sprint tickets' },
        { label: 'Company Notices', path: '/developer/notices', desc: 'Internal memos, alerts, and operational bulletins' },
        { label: 'Internal Chat', path: '/developer/chats', desc: 'Real-time internal developer messaging' },
      ],
    },
    {
      category: 'Websites & Audience',
      items: [
        { label: 'Hosted Websites', path: '/developer/websites', desc: 'Provisioned subdomains and institutional portals' },
        { label: 'Creators Directory', path: '/developer/creators', desc: 'Registered workspace managers and school leads' },
        { label: 'Inbound Leads', path: '/developer/leads', desc: 'Inbound customer prospects and quote inquiries' },
        { label: 'Subscribers', path: '/developer/subscribers', desc: 'Newsletter audience email distribution' },
      ],
    },
    {
      category: 'Commerce & Billing',
      items: [
        { label: 'Packages & Tiers', path: '/developer/packages', desc: 'Subscription pricing tiers and limits' },
        { label: 'Features Catalog', path: '/developer/features', desc: 'Modular service entitlement definitions' },
        { label: 'Subscriptions', path: '/developer/subscriptions', desc: 'Recurring creator memberships and renewals' },
        { label: 'Purchases Log', path: '/developer/purchases', desc: 'One-time package purchases and addons' },
        { label: 'Payments Ledger', path: '/developer/payments', desc: 'Settled bKash & Paddle transactions' },
      ],
    },
    {
      category: 'Content & Resources',
      items: [
        { label: 'Blog Articles', path: '/developer/blogs', desc: 'Platform articles, guides, and releases' },
        { label: 'Company Policies', path: '/developer/policies', desc: 'Operational terms, privacy, and policies' },
        { label: 'Product Updates', path: '/developer/updates', desc: 'System changelog and platform releases' },
        { label: 'Tutorials', path: '/developer/tutorials', desc: 'Technical documentation and guides' },
        { label: 'FAQs', path: '/developer/faqs', desc: 'Frequently asked customer questions' },
      ],
    },
    {
      category: 'Support & Comms',
      items: [
        { label: 'Support Tickets', path: '/developer/support', desc: 'Customer trouble tickets and triage' },
        { label: 'Live Chats', path: '/developer/live-chats', desc: 'Active visitor and client chat sessions' },
        { label: 'Contacts', path: '/developer/contacts', desc: 'Public website contact form inquiries' },
        { label: 'Abuse Reports', path: '/developer/reports', desc: 'Platform grievance and content reports' },
        { label: 'Reviews Moderation', path: '/developer/reviews', desc: 'Creator testimonials and star ratings' },
      ],
    },
    {
      category: 'Meta & Social Channels',
      items: [
        { label: 'Facebook Messages', path: '/developer/facebook-messages', desc: 'Meta Page messaging integration' },
        { label: 'Instagram Messages', path: '/developer/instagram-messages', desc: 'Instagram Direct inbox messages' },
        { label: 'WhatsApp Messages', path: '/developer/whatsapp-messages', desc: 'WhatsApp Business API threads' },
      ],
    },
    {
      category: 'Team & Governance',
      items: [
        { label: 'Developers Team', path: '/developer/developers', desc: 'Engineering team directory and direct module permissions' },
        { label: 'Roles & Permissions', path: '/developer/roles', desc: 'Access rights, permissions, and role groups' },
        { label: 'Staff Payroll', path: '/developer/payroll', desc: 'Payroll disbursement and generation' },
        { label: 'My Salaries', path: '/developer/my-salaries', desc: 'Personal compensation history' },
      ],
    },
    {
      category: 'Platform & Settings',
      items: [
        { label: 'Database Modules', path: '/developer/modules', desc: 'Platform database schema and tables' },
        { label: 'Spam Defense', path: '/developer/spams', desc: 'Automated IP and content defense' },
        { label: 'My Profile', path: '/developer/profile', desc: 'Account metadata and session history' },
        { label: 'Account Settings', path: '/developer/settings', desc: 'Update credentials and preferences' },
      ],
    },
  ];

  return (
    <div className="w-full space-y-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {developer?.role_name || developer?.roleName || developer?.role || 'Developer'}
            </span>
            <span className="text-xs text-slate-500 font-normal">{SITE_NAME} Operations Overview</span>
          </div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            {SITE_NAME} Platform Overview
          </h1>
          <p className="text-xs text-slate-500 max-w-xl font-normal">
            Real-time platform metrics, revenue tracking, website portfolios, and operational directories.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/developer"
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition-colors cursor-pointer"
          >
            Developer Console
          </Link>
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
            Settings
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((stat, idx) => (
          <Link
            key={idx}
            href={stat.href}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 hover:border-slate-400 dark:hover:border-slate-600 transition-colors flex flex-col justify-between group"
          >
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 truncate">
                {stat.title}
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1 truncate">
                {loading ? '—' : stat.value}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 truncate font-normal">
              {stat.sub}
            </div>
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Platform Operations Directory</h2>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Full directory of platform consoles, administration modules, and commerce tools.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {operationsDirectory.map((cat, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 space-y-2.5"
            >
              <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 pb-2 border-b border-slate-100 dark:border-slate-800">
                {cat.category}
              </h3>
              <div className="space-y-1.5">
                {cat.items.map((item, i) => (
                  <Link
                    key={i}
                    href={item.path}
                    className="block p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-medium text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-200">
                        {item.label}
                      </span>
                      <span className="text-slate-400 text-xs font-sans group-hover:translate-x-0.5 transition-transform">
                        &rarr;
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 font-normal mt-0.5">
                      {item.desc}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
