'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SITE_NAME } from 'src/lib/database/secret';

export default function AdminOverviewPage() {
  const [developer, setDeveloper] = useState(null);
  const [counts, setCounts] = useState({
    developers: 0,
    packages: 0,
    websites: 0,
    blogs: 0,
    support: 0,
    revenue: 0,
    leads: 0,
    subscribers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        setLoading(true);

        const devPromise = fetch('/api/marketing/developer/me')
          .then((r) => r.json())
          .catch(() => ({ success: false }));

        const statsPromises = Promise.allSettled([
          fetch('/api/marketing/developer/devs').then((r) => r.json()),
          fetch('/api/marketing/developer/packages').then((r) => r.json()),
          fetch('/api/marketing/developer/websites').then((r) => r.json()),
          fetch('/api/marketing/developer/blogs').then((r) => r.json()),
          fetch('/api/marketing/developer/support').then((r) => r.json()),
          fetch('/api/marketing/developer/payments').then((r) => r.json()),
          fetch('/api/marketing/developer/leads').then((r) => r.json()),
          fetch('/api/marketing/developer/subscribers').then((r) => r.json()),
        ]);

        const [devRes, statsRes] = await Promise.all([devPromise, statsPromises]);

        if (devRes.success && (devRes.developer || devRes.user)) {
          setDeveloper(devRes.developer || devRes.user);
        }

        const [devs, pkgs, webs, blogs, supp, pay, leads, subs] = statsRes;

        const payments = pay.status === 'fulfilled' && pay.value?.records ? pay.value.records : [];
        const completedPayments = payments.filter((p) =>
          ['successful', 'completed'].includes(String(p.status || '').toLowerCase())
        );
        let revUsd = 0;
        let revBdt = 0;
        completedPayments.forEach((p) => {
          const curr = String(p.currency || (p.gateway === 'bkash' ? 'BDT' : 'USD')).toUpperCase();
          const amount = Number(p.amount || 0);
          if (curr === 'BDT') revBdt += amount;
          else revUsd += amount;
        });

        let revenueDisplay = '$0.00 USD';
        if (revUsd > 0 && revBdt > 0) {
          revenueDisplay = `$${revUsd.toFixed(2)} USD / ৳${revBdt.toLocaleString()} BDT`;
        } else if (revBdt > 0) {
          revenueDisplay = `৳${revBdt.toLocaleString()} BDT`;
        } else if (revUsd > 0) {
          revenueDisplay = `$${revUsd.toFixed(2)} USD`;
        }

        setCounts({
          developers: devs.status === 'fulfilled' && devs.value?.records ? devs.value.records.length : 0,
          packages: pkgs.status === 'fulfilled' && pkgs.value?.records ? pkgs.value.records.length : 0,
          websites: webs.status === 'fulfilled' && webs.value?.records ? webs.value.records.length : 0,
          blogs: blogs.status === 'fulfilled' && blogs.value?.records ? blogs.value.records.length : 0,
          support: supp.status === 'fulfilled' && supp.value?.records
            ? supp.value.records.filter((s) => String(s.status || '').toLowerCase() === 'open').length
            : 0,
          revenue: revenueDisplay,
          leads: leads.status === 'fulfilled' && leads.value?.records ? leads.value.records.length : 0,
          subscribers: subs.status === 'fulfilled' && subs.value?.records ? subs.value.records.length : 0,
        });
      } catch (err) {
        console.error('Error loading developer overview:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, []);

  const statCards = [
    {
      title: 'Platform Developers',
      value: counts.developers,
      href: '/developer/developers',
    },
    {
      title: 'Active Packages',
      value: counts.packages,
      href: '/developer/packages',
    },
    {
      title: 'Hosted Websites',
      value: counts.websites,
      href: '/developer/websites',
    },
    {
      title: 'Blog Articles',
      value: counts.blogs,
      href: '/developer/blogs',
    },
    {
      title: 'Open Support Tickets',
      value: counts.support,
      href: '/developer/support',
    },
    {
      title: 'Total Revenue',
      value: counts.revenue,
      href: '/developer/payments',
    },
    {
      title: 'Inbound Leads',
      value: counts.leads,
      href: '/developer/leads',
    },
    {
      title: 'Subscribers',
      value: counts.subscribers,
      href: '/developer/subscribers',
    },
  ];

  const moduleCategories = [
    {
      category: 'Developer & Account',
      items: [
        { label: 'Developer Profile', path: '/developer/profile', desc: 'Account metadata and session history' },
        { label: 'Account Settings', path: '/developer/settings', desc: 'Update name, email, credentials' },
        { label: 'Developers Team', path: '/developer/developers', desc: 'Platform staff and role permissions' },
        { label: 'Hosted Websites', path: '/developer/websites', desc: 'Provisioned subdomains and portfolios' },
      ],
    },
    {
      category: 'Content & Policies',
      items: [
        { label: 'Blog Articles', path: '/developer/blogs', desc: 'Platform articles, guides, and releases' },
        { label: 'Company Policies', path: '/developer/policies', desc: 'Internal operational and privacy terms' },
        { label: 'Product Updates', path: '/developer/updates', desc: 'System changelog and roadmap items' },
        { label: 'Tutorials', path: '/developer/tutorials', desc: 'Video and step-by-step guides' },
        { label: 'FAQs', path: '/developer/faqs', desc: 'Frequently asked questions' },
      ],
    },
    {
      category: 'Billing & Monetization',
      items: [
        { label: 'Packages', path: '/developer/packages', desc: 'Subscription tiers and limits' },
        { label: 'Features Catalog', path: '/developer/features', desc: 'Modular feature definitions' },
        { label: 'Payments', path: '/developer/payments', desc: 'Revenue transactions and billing' },
        { label: 'Subscriptions', path: '/developer/subscriptions', desc: 'Recurring memberships' },
      ],
    },
    {
      category: 'Support & Comms',
      items: [
        { label: 'Live Chats', path: '/developer/live-chats', desc: 'Active visitor and client chat sessions' },
        { label: 'Contacts', path: '/developer/contacts', desc: 'Inbound inquiries from website' },
        { label: 'Support Tickets', path: '/developer/support', desc: 'Technical trouble tickets' },
        { label: 'Reports', path: '/developer/reports', desc: 'Platform abuse and content reports' },
        { label: 'Reviews', path: '/developer/reviews', desc: 'Creator testimonials and star ratings moderation' },
      ],
    },
    {
      category: 'Audience & Growth',
      items: [
        { label: 'Creators Directory', path: '/developer/creators', desc: 'Registered creators and managers' },
        { label: 'End-Users Directory', path: '/developer/users', desc: 'Registered site visitors' },
        { label: 'Sales Leads', path: '/developer/leads', desc: 'Inbound customer prospects' },
        { label: 'Subscribers', path: '/developer/subscribers', desc: 'Newsletter audience email list' },
      ],
    },
  ];

  return (
    <div className="w-full space-y-4">
      {/* Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              {developer?.role || 'Developer'}
            </span>
            <span className="text-xs text-slate-500 font-normal">{SITE_NAME} Operations</span>
          </div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            {developer?.name ? `Welcome, ${developer.name}` : `Welcome to ${SITE_NAME} Operations`}
          </h1>
          <p className="text-xs text-slate-500 max-w-xl font-normal">
            Platform packages, websites, customer support, and developer governance console.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/developer/profile"
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
          >
            My Profile
          </Link>
          <Link
            href="/developer/settings"
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
          >
            Settings
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((stat, idx) => (
          <Link
            key={idx}
            href={stat.href}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 hover:border-slate-400 dark:hover:border-slate-600 transition-colors"
          >
            <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">{stat.title}</div>
            <div className="text-base font-semibold text-slate-900 dark:text-white mt-1">
              {loading ? '—' : stat.value}
            </div>
          </Link>
        ))}
      </div>

      {/* Modules Categorized Navigation */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Operations Directory</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {moduleCategories.map((cat, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3"
            >
              <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-100 dark:border-slate-800">
                {cat.category}
              </h3>
              <div className="space-y-2">
                {cat.items.map((item, i) => (
                  <Link
                    key={i}
                    href={item.path}
                    className="block p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="text-xs font-medium text-slate-900 dark:text-white">
                      {item.label}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1 font-normal">
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
