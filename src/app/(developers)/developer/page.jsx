'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SITE_NAME } from '@/lib/db/secret';
import {
  BiLayer,
  BiUserCheck,
  BiCube,
  BiCreditCard,
  BiHeadphone,
  BiDesktop,
  BiFile,
  BiTrendingUp,
  BiEnvelope,
  BiPalette,
  BiRightArrowAlt,
  BiUser,
  BiCog,
} from 'react-icons/bi';

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

        // 1. Fetch current logged-in developer profile
        const devPromise = fetch('/api/developer')
          .then((r) => r.json())
          .catch(() => ({ success: false }));

        // 2. Fetch module records in parallel
        const statsPromises = Promise.allSettled([
          fetch('/api/developer/devs').then((r) => r.json()),
          fetch('/api/developer/packages').then((r) => r.json()),
          fetch('/api/developer/websites').then((r) => r.json()),
          fetch('/api/developer/blogs').then((r) => r.json()),
          fetch('/api/developer/support').then((r) => r.json()),
          fetch('/api/developer/payments').then((r) => r.json()),
          fetch('/api/developer/leads').then((r) => r.json()),
          fetch('/api/developer/subscribers').then((r) => r.json()),
        ]);

        const [devRes, statsRes] = await Promise.all([devPromise, statsPromises]);

        if (devRes.success && devRes.developer) {
          setDeveloper(devRes.developer);
        }

        const [devs, pkgs, webs, blogs, supp, pay, leads, subs] = statsRes;

        const payments = pay.status === 'fulfilled' && pay.value?.records ? pay.value.records : [];
        const totalRevenue = payments.reduce(
          (acc, p) => acc + (p.amount_in_cents || p.amountInCents || 0),
          0
        ) / 100;

        setCounts({
          developers: devs.status === 'fulfilled' && devs.value?.records ? devs.value.records.length : 0,
          packages: pkgs.status === 'fulfilled' && pkgs.value?.records ? pkgs.value.records.length : 0,
          websites: webs.status === 'fulfilled' && webs.value?.records ? webs.value.records.length : 0,
          blogs: blogs.status === 'fulfilled' && blogs.value?.records ? blogs.value.records.length : 0,
          support: supp.status === 'fulfilled' && supp.value?.records
            ? supp.value.records.filter((s) => s.status === 'OPEN').length
            : 0,
          revenue: totalRevenue,
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
      icon: BiUserCheck,
      href: '/developer/developers',
      color: 'secondary',
    },
    {
      title: 'Active Packages',
      value: counts.packages,
      icon: BiCube,
      href: '/developer/packages',
      color: 'primary',
    },
    {
      title: 'Websites',
      value: counts.websites,
      icon: BiDesktop,
      href: '/developer/websites',
      color: 'secondary',
    },
    {
      title: 'Blog Articles',
      value: counts.blogs,
      icon: BiFile,
      href: '/developer/blogs',
      color: 'primary',
    },
    {
      title: 'Open Support Tickets',
      value: counts.support,
      icon: BiHeadphone,
      href: '/developer/support',
      color: 'secondary',
    },
    {
      title: 'Total Revenue',
      value: `$${counts.revenue.toFixed(2)}`,
      icon: BiCreditCard,
      href: '/developer/payments',
      color: 'primary',
    },
    {
      title: 'Inbound Leads',
      value: counts.leads,
      icon: BiTrendingUp,
      href: '/developer/leads',
      color: 'secondary',
    },
    {
      title: 'Subscribers',
      value: counts.subscribers,
      icon: BiEnvelope,
      href: '/developer/subscribers',
      color: 'primary',
    },
  ];

  const moduleCategories = [
    {
      category: 'Developer & Account',
      items: [
        { label: 'Developer Profile', path: '/developer/profile', desc: 'Your account metadata and activity log' },
        { label: 'Account Settings', path: '/developer/settings', desc: 'Update name, email, credentials, and 2FA' },
        { label: 'Developer Team', path: '/developer/developers', desc: 'Internal platform operators and staff' },
        { label: 'Hosted Websites', path: '/developer/websites', desc: 'Provisioned portfolio subdomains and containers' },
      ],
    },
    {
      category: 'Content & Design',
      items: [
        { label: 'Blog Articles', path: '/developer/blogs', desc: 'Platform articles, guides, and releases' },
        { label: 'Themes Gallery', path: '/developer/themes', desc: 'Design templates and layout presets' },
        { label: 'Ecosystem Apps', path: '/developer/apps', desc: 'Active platform applications and integrations' },
      ],
    },
    {
      category: 'Billing & Monetization',
      items: [
        { label: 'Packages', path: '/developer/packages', desc: 'Subscription tiers and pricing limits' },
        { label: 'Feature Catalog', path: '/developer/features', desc: 'Modular platform feature definitions' },
        { label: 'Payments', path: '/developer/payments', desc: 'Revenue transactions and billing records' },
        { label: 'Subscriptions', path: '/developer/subscriptions', desc: 'Recurring memberships and renewal schedules' },
      ],
    },
    {
      category: 'Support & Real-Time Comms',
      items: [
        { label: 'Live Chats', path: '/developer/live-chats', desc: 'Active visitor and client chat sessions' },
        { label: 'Contacts', path: '/developer/contacts', desc: 'Inbound inquiry forms from website' },
        { label: 'Support Tickets', path: '/developer/support', desc: 'Technical trouble tickets and assistance' },
        { label: 'Moderation Reports', path: '/developer/reports', desc: 'Platform abuse and content reports' },
      ],
    },
    {
      category: 'Audience & Growth',
      items: [
        { label: 'Creators Directory', path: '/developer/creators', desc: 'Registered creators and appointed managers' },
        { label: 'End-Users Directory', path: '/developer/users', desc: 'Registered site visitors and comment reviewers' },
        { label: 'Sales Leads', path: '/developer/leads', desc: 'Inbound customer prospects and agency evaluations' },
        { label: 'Subscribers', path: '/developer/subscribers', desc: 'Newsletter audience email list' },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
              {developer?.role ? `${developer.role.toUpperCase()} CONSOLE` : 'DEVELOPER CONSOLE'}
            </span>
            <span className="text-xs text-slate-500 font-semibold">• {SITE_NAME} Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {developer?.name ? `Welcome back, ${developer.name}!` : `Welcome to ${SITE_NAME} Operations`}
          </h1>
          <p className="text-sm text-slate-500 max-w-xl">
            Central administration console for platform packages, website portfolios, customer support, and developer governance.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10">
          <Link
            href="/developer/profile"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-secondary hover:bg-secondary-dark text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <BiUser className="text-base" />
            <span>My Profile</span>
          </Link>
          <Link
            href="/developer/settings"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
          >
            <BiCog className="text-base" />
            <span>Settings</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Link
              key={idx}
              href={stat.href}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-secondary/40 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`p-2 rounded-xl ${
                    stat.color === 'secondary'
                      ? 'bg-secondary/10 text-secondary'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  <Icon className="text-xl" />
                </div>
                <BiRightArrowAlt className="text-slate-300 group-hover:text-secondary group-hover:translate-x-1 transition-all text-lg" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight">
                {loading ? '—' : stat.value}
              </div>
              <div className="text-xs font-semibold text-slate-600 mt-1">{stat.title}</div>
            </Link>
          );
        })}
      </div>

      {/* Modules Categorized Navigation */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Platform Operations Directory</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {moduleCategories.map((cat, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between"
            >
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  <span>{cat.category}</span>
                </h3>
                <div className="space-y-3">
                  {cat.items.map((item, i) => (
                    <Link
                      key={i}
                      href={item.path}
                      className="group flex items-start justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800 group-hover:text-secondary transition-colors">
                          {item.label}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{item.desc}</div>
                      </div>
                      <BiRightArrowAlt className="text-slate-300 group-hover:text-secondary group-hover:translate-x-0.5 transition-all text-base mt-0.5 shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
