'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  BiLoaderAlt,
  BiGridAlt,
  BiLayer,
  BiPackage,
  BiRefresh,
  BiChevronLeft,
  BiChevronRight,
} from 'react-icons/bi';
import Package from '@/components/home/cards/Package';

function AppPackageRow({ app, packages, billingCycle, currency }) {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 360;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Sort packages from lower to higher price dynamically according to active currency & billing cycle
  const sortedPackages = useMemo(() => {
    return [...(packages || [])].sort((a, b) => {
      const priceA =
        currency === 'BDT'
          ? billingCycle === 'YEARLY'
            ? Number(a.yearlyPriceBdt ?? 0)
            : Number(a.monthlyPriceBdt ?? 0)
          : billingCycle === 'YEARLY'
          ? Number(a.yearlyPriceUsd ?? 0)
          : Number(a.monthlyPriceUsd ?? 0);

      const priceB =
        currency === 'BDT'
          ? billingCycle === 'YEARLY'
            ? Number(b.yearlyPriceBdt ?? 0)
            : Number(b.monthlyPriceBdt ?? 0)
          : billingCycle === 'YEARLY'
          ? Number(b.yearlyPriceUsd ?? 0)
          : Number(b.monthlyPriceUsd ?? 0);

      if (priceA !== priceB) return priceA - priceB;
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    });
  }, [packages, billingCycle, currency]);

  if (!sortedPackages || sortedPackages.length === 0) return null;

  return (
    <section className="space-y-4 rounded-3xl bg-slate-50/70 dark:bg-slate-900/40 transition-all">
      {/* Row Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/70 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-secondary/10 text-secondary border border-secondary/20 flex items-center justify-center text-lg shrink-0">
              <BiLayer />
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
              {app.title}
            </h2>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-primary/20 text-slate-800 dark:text-primary-light border border-primary/30">
              {sortedPackages.length} {sortedPackages.length === 1 ? 'Tier' : 'Tiers'}
            </span>
          </div>
          {app.short_description && (
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              {app.short_description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {app.slug && app.slug !== 'global' && (
            <Link
              href={`/apps/${app.slug}`}
              className="text-xs font-semibold text-secondary hover:text-secondary-dark flex items-center gap-1 hover:underline"
            >
              <span>Explore App</span>
              <span>&rarr;</span>
            </Link>
          )}

          {/* Desktop Left/Right Controls */}
          <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => scroll('left')}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-secondary hover:border-secondary/40 transition-all shadow-xs cursor-pointer"
              title="Scroll left"
            >
              <BiChevronLeft className="text-xl" />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-secondary hover:border-secondary/40 transition-all shadow-xs cursor-pointer"
              title="Scroll right"
            >
              <BiChevronRight className="text-xl" />
            </button>
          </div>
        </div>
      </div>

      {/* Swipeable Single-Line Container (No Wrap Grid) */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex flex-nowrap overflow-x-auto gap-6 pb-4 pt-2 px-1 scroll-smooth snap-x snap-mandatory touch-pan-x cursor-grab active:cursor-grabbing select-none"
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin',
          }}
        >
          {sortedPackages.map((pkg, idx) => {
            const price =
              currency === 'BDT'
                ? billingCycle === 'YEARLY'
                  ? pkg.yearlyPriceBdt
                  : pkg.monthlyPriceBdt
                : billingCycle === 'YEARLY'
                ? pkg.yearlyPriceUsd
                : pkg.monthlyPriceUsd;

            const hasExplicitPopular = sortedPackages.some((p) => Boolean(p.is_popular || p.popular));
            const isPopular = hasExplicitPopular
              ? Boolean(pkg.is_popular || pkg.popular)
              : sortedPackages.length >= 3 && idx === 1;

            return (
              <Package
                key={pkg.id}
                pkg={{ ...pkg, popular: isPopular }}
                price={price}
                billingCycle={billingCycle}
                currency={currency}
              />
            );
          })}
        </div>
      </div>

      {/* Mobile Touch Swipe Guidance */}
      <div className="sm:hidden flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-1">
        <span className="flex items-center gap-1 font-medium">
          <span>&larr;</span>
          <span>Swipe cards horizontally</span>
          <span>&rarr;</span>
        </span>
        <span>{sortedPackages.length} plans (arranged low to high)</span>
      </div>
    </section>
  );
}

export default function PackagesPage() {
  const [currency, setCurrency] = useState('USD');
  const [billingCycle, setBillingCycle] = useState('MONTHLY');
  const [packages, setPackages] = useState([]);
  const [apps, setApps] = useState([]);
  const [selectedApp, setSelectedApp] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchPackagesAndApps = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/packages');
      const data = await res.json();
      if (data.success && Array.isArray(data.packages)) {
        const mapped = data.packages.map((p, idx) => {
          const monthlyUsd =
            Number(
              p.monthly_price_usd !== undefined
                ? p.monthly_price_usd
                : p.price_in_cents
                ? p.price_in_cents / 100
                : 0
            ) || 0;
          const yearlyUsd = Number(p.yearly_price_usd) || Math.round(monthlyUsd * 10);
          const monthlyBdt = Number(p.monthly_price_bdt) || Math.round(monthlyUsd * 120);
          const yearlyBdt = Number(p.yearly_price_bdt) || Math.round(monthlyBdt * 10);

          const feats =
            Array.isArray(p.features) && p.features.length > 0
              ? p.features.map((f) => f.name || f.description || f)
              : Array.isArray(p.allowed_modules) && p.allowed_modules.length > 0
              ? p.allowed_modules.map((m) => `Includes ${m} Module`)
              : ['Standard Website Provisioning', 'Creator Dashboard Access'];

          return {
            id: p.id,
            app_id: p.app_id,
            app_title: p.app_title,
            app_slug: p.app_slug,
            name: p.name,
            slug: p.slug,
            description: p.description || 'Complete website & portfolio creation package.',
            monthlyPriceUsd: monthlyUsd,
            yearlyPriceUsd: yearlyUsd,
            monthlyPriceBdt: monthlyBdt,
            yearlyPriceBdt: yearlyBdt,
            maxWebsites: Number(p.max_websites ?? p.max_portfolios ?? 1),
            maxPortfolios: Number(p.max_websites ?? p.max_portfolios ?? 1),
            max_websites: Number(p.max_websites ?? p.max_portfolios ?? 1),
            popular: Boolean(p.is_popular),
            features: feats,
            cta: `Get ${p.name}`,
          };
        });
        setPackages(mapped);
        setApps(data.apps || []);
      } else {
        setPackages([]);
        setApps([]);
      }
    } catch (err) {
      console.error('Failed to load packages:', err);
      setPackages([]);
      setApps([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetch('/api/packages')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && Array.isArray(data.packages)) {
          const mapped = data.packages.map((p, idx) => {
            const monthlyUsd =
              Number(
                p.monthly_price_usd !== undefined
                  ? p.monthly_price_usd
                  : p.price_in_cents
                  ? p.price_in_cents / 100
                  : 0
              ) || 0;
            const yearlyUsd = Number(p.yearly_price_usd) || Math.round(monthlyUsd * 10);
            const monthlyBdt = Number(p.monthly_price_bdt) || Math.round(monthlyUsd * 120);
            const yearlyBdt = Number(p.yearly_price_bdt) || Math.round(monthlyBdt * 10);

            const feats =
              Array.isArray(p.features) && p.features.length > 0
                ? p.features.map((f) => f.name || f.description || f)
                : Array.isArray(p.allowed_modules) && p.allowed_modules.length > 0
                ? p.allowed_modules.map((m) => `Includes ${m} Module`)
                : ['Standard Website Provisioning', 'Creator Dashboard Access'];

            return {
              id: p.id,
              app_id: p.app_id,
              app_title: p.app_title,
              app_slug: p.app_slug,
              name: p.name,
              slug: p.slug,
              description: p.description || 'Complete website & portfolio creation package.',
              monthlyPriceUsd: monthlyUsd,
              yearlyPriceUsd: yearlyUsd,
              monthlyPriceBdt: monthlyBdt,
              yearlyPriceBdt: yearlyBdt,
              maxWebsites: Number(p.max_websites ?? p.max_portfolios ?? 1),
              maxPortfolios: Number(p.max_websites ?? p.max_portfolios ?? 1),
              max_websites: Number(p.max_websites ?? p.max_portfolios ?? 1),
              popular: Boolean(p.is_popular),
              features: feats,
              cta: `Get ${p.name}`,
            };
          });
          setPackages(mapped);
          setApps(data.apps || []);
        } else {
          setPackages([]);
          setApps([]);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load packages:', err);
        setPackages([]);
        setApps([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('app') || params.get('app_id');
      if (q) {
        setTimeout(() => setSelectedApp(q), 0);
      }
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Group packages by application so each app gets its own separate row
  const appRows = useMemo(() => {
    const grouped = new Map();

    apps.forEach((app) => {
      grouped.set(String(app.id), {
        app,
        packages: [],
      });
    });

    const unassigned = [];

    packages.forEach((pkg) => {
      const key = pkg.app_id ? String(pkg.app_id) : null;
      if (key && grouped.has(key)) {
        grouped.get(key).packages.push(pkg);
      } else if (key) {
        if (!grouped.has(key)) {
          grouped.set(key, {
            app: {
              id: pkg.app_id,
              title: pkg.app_title || `Application #${pkg.app_id}`,
              slug: pkg.app_slug || `app-${pkg.app_id}`,
              short_description: 'Ecosystem application plans and subscriptions.',
            },
            packages: [],
          });
        }
        grouped.get(key).packages.push(pkg);
      } else {
        unassigned.push(pkg);
      }
    });

    let result = Array.from(grouped.values()).filter(
      (item) => item.packages.length > 0
    );

    if (unassigned.length > 0) {
      result.push({
        app: {
          id: 'global',
          title: 'Global Platform Plans',
          slug: 'global',
          short_description: 'Universal subscription tiers providing access across the platform.',
        },
        packages: unassigned,
      });
    }

    // Sort packages inside each app row from lower to higher price
    result.forEach((item) => {
      item.packages.sort((a, b) => {
        const priceA =
          currency === 'BDT'
            ? billingCycle === 'YEARLY'
              ? Number(a.yearlyPriceBdt ?? 0)
              : Number(a.monthlyPriceBdt ?? 0)
            : billingCycle === 'YEARLY'
            ? Number(a.yearlyPriceUsd ?? 0)
            : Number(a.monthlyPriceUsd ?? 0);

        const priceB =
          currency === 'BDT'
            ? billingCycle === 'YEARLY'
              ? Number(b.yearlyPriceBdt ?? 0)
              : Number(b.monthlyPriceBdt ?? 0)
            : billingCycle === 'YEARLY'
            ? Number(b.yearlyPriceUsd ?? 0)
            : Number(b.monthlyPriceUsd ?? 0);

        if (priceA !== priceB) return priceA - priceB;
        return (Number(a.id) || 0) - (Number(b.id) || 0);
      });
    });

    if (selectedApp !== 'ALL') {
      result = result.filter(
        (item) =>
          String(item.app.id) === String(selectedApp) ||
          item.app.slug === selectedApp
      );
    }

    return result;
  }, [apps, packages, selectedApp, currency, billingCycle]);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-16 space-y-14">
      {/* Header Section */}
      <div className="text-center max-w-7xl mx-auto space-y-4">
        

        <h1 className="text-4xl sm:text-5xl font-semibold text-slate-900 dark:text-white tracking-tight">
          Invest in Your Digital Identity
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Select subscription packages categorized by application. Every tier includes zero-latency portfolio isolation, real-time drag-and-drop studio, and instant subdomain activation.
        </p>

        {/* Application Category Filter Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
          <button
            type="button"
            onClick={() => setSelectedApp('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedApp === 'ALL'
                ? 'bg-secondary text-white shadow-md shadow-secondary/25'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-secondary/40 hover:text-secondary'
            }`}
          >
            <BiGridAlt className="text-sm" />
            <span>All Applications</span>
            <span className="text-[10px] opacity-75 ml-0.5">({packages.length})</span>
          </button>

          {apps.map((app) => {
            const count = packages.filter((p) => String(p.app_id) === String(app.id)).length;
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => setSelectedApp(String(app.id))}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedApp === String(app.id)
                    ? 'bg-secondary text-white shadow-md shadow-secondary/25'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-secondary/40 hover:text-secondary'
                }`}
              >
                <BiLayer className="text-sm" />
                <span>{app.title}</span>
                <span className="text-[10px] opacity-75 ml-0.5">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Controls: Billing Cycle and Currency Switcher */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          {/* Currency Switcher */}
          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 inline-flex items-center gap-1.5 text-xs font-semibold shadow-xs">
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-semibold ${
                currency === 'USD'
                  ? 'bg-secondary text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              USD ($)
            </button>
            <button
              type="button"
              onClick={() => setCurrency('BDT')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-semibold ${
                currency === 'BDT'
                  ? 'bg-secondary text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              BDT (৳)
            </button>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 inline-flex items-center gap-2 text-xs font-semibold shadow-xs">
            <button
              type="button"
              onClick={() => setBillingCycle('MONTHLY')}
              className={`px-4 py-1.5 rounded-xl transition-all cursor-pointer ${
                billingCycle === 'MONTHLY'
                  ? 'bg-secondary text-white shadow-md shadow-secondary/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('YEARLY')}
              className={`px-4 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                billingCycle === 'YEARLY'
                  ? 'bg-secondary text-white shadow-md shadow-secondary/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] bg-primary/25 text-slate-900 dark:text-primary-light border border-primary/40 px-1.5 py-0.5 rounded-md font-semibold">
                SAVE 20%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Rows of Packages grouped by Application (No Grid) */}
      {loading ? (
        <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-xl mx-auto shadow-xs">
          <BiLoaderAlt className="animate-spin text-4xl text-secondary mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 font-semibold">
            Loading subscription plans...
          </p>
        </div>
      ) : appRows.length === 0 ? (
        <div className="py-16 text-center max-w-md mx-auto space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary text-2xl border border-secondary/20">
            <BiPackage />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            No Packages Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {selectedApp !== 'ALL'
              ? 'There are currently no active packages registered under this application.'
              : 'Subscription tiers will appear here once published in the administrative system.'}
          </p>
          {selectedApp !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedApp('ALL')}
              className="text-xs font-semibold text-secondary hover:text-secondary-dark hover:underline cursor-pointer pt-1"
            >
              View All Applications
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-10 max-w-7xl mx-auto">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
            <span>
              Showing {appRows.length} application {appRows.length === 1 ? 'category' : 'categories'} ({packages.length} total tiers)
            </span>
            <button
              type="button"
              onClick={fetchPackagesAndApps}
              className="flex items-center gap-1 hover:text-secondary transition-colors cursor-pointer"
            >
              <BiRefresh className="text-sm" />
              <span>Refresh</span>
            </button>
          </div>

          {/* Render each application in its own distinct row */}
          {appRows.map(({ app, packages: rowPackages }) => (
            <AppPackageRow
              key={app.id}
              app={app}
              packages={rowPackages}
              billingCycle={billingCycle}
              currency={currency}
            />
          ))}
        </div>
      )}

      {/* Guarantee Banner */}
      <div className="p-6 rounded-3xl bg-primary/10 dark:bg-slate-900/60 border border-primary/20 text-center space-y-2 max-w-3xl mx-auto shadow-xs">
        <h4 className="font-semibold text-slate-900 dark:text-white text-base">
          All packages include instant website provisioning
        </h4>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          When you complete checkout, your invoice is generated with Payoneer settlement. Once paid, your subscription activates and your dedicated subdomain website is provisioned immediately.
        </p>
      </div>
    </div>
  );
}
