'use client';
import { useState, useEffect, useMemo, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BiLoaderAlt, BiPackage, BiRefresh, BiCheckCircle, BiSupport, BiRocket, BiCheckShield, BiServer, BiMessageSquareDetail, BiPhoneCall, BiEnvelope, BiArrowBack, BiX, BiHeart, BiSolidHeart, BiTag, } from 'react-icons/bi';
import Package from 'src/component/marketing/home/cards/Package';
import { SITE_MAIL, SITE_CONTACT } from 'src/lib/database/secret';
import LoadingScreen from 'src/component/common/LoadingScreen';
import { Context } from 'src/component/helper/Context';
export default function PackagesPage() {
    const router = useRouter();
    const { currency: contextCurrency, setCurrency: setContextCurrency } = useContext<any>(Context) || {};
    const [currency, setCurrency] = useState<any>(contextCurrency || 'BDT');

    useEffect(() => {
        if (contextCurrency) {
            setCurrency(contextCurrency);
        }
    }, [contextCurrency]);

    const handleSelectCurrency = (newCode: string) => {
        setCurrency(newCode);
        if (typeof setContextCurrency === 'function') {
            setContextCurrency(newCode);
        }
    };
    const [billingCycle, setBillingCycle] = useState<any>('MONTHLY');
    const [packages, setPackages] = useState<any>([]);
    const [loading, setLoading] = useState<any>(true);
    const [creator, setCreator] = useState<any>(null);
    const [wishlistIds, setWishlistIds] = useState<any>([]);
    const [wishlistLoadingId, setWishlistLoadingId] = useState<any>(null);
    const [wishlistToast, setWishlistToast] = useState<any>('');
    const [showInquiryModal, setShowInquiryModal] = useState<any>(false);
    const [inquiryName, setInquiryName] = useState<any>('');
    const [inquiryEmail, setInquiryEmail] = useState<any>('');
    const [inquirySchool, setInquirySchool] = useState<any>('');
    const [inquiryStudents, setInquiryStudents] = useState<any>('');
    const [inquiryMessage, setInquiryMessage] = useState<any>('');
    const [inquirySubmitting, setInquirySubmitting] = useState<any>(false);
    const [inquirySuccess, setInquirySuccess] = useState<any>(false);
    const [inquiryError, setInquiryError] = useState<any>('');
    const [publicPromos, setPublicPromos] = useState<any>([]);
    const fetchPackages = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/marketing/packages');
            const data = await res.json();
            if (data.success && Array.isArray(data.packages)) {
                setPackages(data.packages.filter((p: any) => p.is_public !== false && p.is_active !== false));
            }
            else {
                setPackages([]);
            }
        }
        catch (err: any) {
            console.error('Failed to load packages:', err);
            setPackages([]);
        }
        finally {
            setLoading(false);
        }
    };
    const fetchWishlist = async () => {
        try {
            const res = await fetch('/api/marketing/creator/wishlist');
            const data = await res.json();
            if (data.success && Array.isArray(data.package_ids)) {
                setWishlistIds(data.package_ids);
            }
        }
        catch (e: any) {
        }
    };
    useEffect(() => {
        fetchPackages();
        fetch('/api/marketing/promos')
            .then((res: any) => res.json())
            .then((data: any) => {
            if (data.success && Array.isArray(data.promos)) {
                setPublicPromos(data.promos);
            }
        })
            .catch(() => setPublicPromos([]));
        fetch('/api/marketing/creator/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'me' }),
        })
            .then((res: any) => res.json())
            .then((data: any) => {
            if (data.success && data.creator) {
                setCreator(data.creator);
                setInquiryName(data.creator.name || '');
                setInquiryEmail(data.creator.email || '');
                fetchWishlist();
            }
        })
            .catch(() => setCreator(null));
    }, []);
    const handleToggleWishlist = async (packageId: any) => {
        if (!creator) {
            router.push(`/creator/login?redirect=${encodeURIComponent('/packages')}`);
            return;
        }
        setWishlistLoadingId(Number(packageId));
        try {
            const res = await fetch('/api/marketing/creator/wishlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    packageId: Number(packageId),
                    creatorId: Number(creator.id),
                    action: 'toggle',
                }),
            });
            const data = await res.json();
            if (data.success) {
                if (data.isWishlisted) {
                    setWishlistIds([Number(packageId)]);
                }
                else {
                    setWishlistIds([]);
                }
                setWishlistToast(data.message || (data.isWishlisted ? 'Package saved to wishlist!' : 'Removed from wishlist.'));
                setTimeout(() => setWishlistToast(''), 3500);
            }
            else {
                setWishlistToast(data.error || 'Failed to update wishlist');
                setTimeout(() => setWishlistToast(''), 3500);
            }
        }
        catch (err: any) {
            console.error('Error toggling wishlist:', err);
        }
        finally {
            setWishlistLoadingId(null);
        }
    };
    const sortedPackages = useMemo(() => {
        const getPrice = (pkg: any) => {
            const currKey = `${currency.toLowerCase()}_per_month`;
            const monthlyRate = Number(pkg[currKey] ?? pkg.bdt_per_month ?? 0);
            return billingCycle === 'YEARLY' ? monthlyRate * 12 : monthlyRate;
        };
        return [...(packages || [])]
            .filter((pkg: any) => pkg.is_public !== false && pkg.is_active !== false)
            .sort((a: any, b: any) => {
            const priceA = getPrice(a);
            const priceB = getPrice(b);
            if (priceA !== priceB)
                return priceA - priceB;
            return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
        });
    }, [packages, billingCycle, currency]);
    const handleInquirySubmit = async (e: any) => {
        e.preventDefault();
        setInquirySubmitting(true);
        setInquiryError('');
        setInquirySuccess(false);
        try {
            if (creator?.id) {
                const res = await fetch('/api/marketing/creator', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'create_ticket',
                        creatorId: Number(creator.id),
                        subject: `Custom Package Request: ${inquirySchool || 'Enterprise Plan'}`,
                        category: 'BILLING',
                        priority: 'HIGH',
                        message: `Custom Package Inquiry from Creator #${creator.id} (${creator.name} / ${creator.email}):
Institution: ${inquirySchool || 'N/A'}
Estimated Student Count: ${inquiryStudents || 'Not specified'}
Requirements:
${inquiryMessage}`,
                    }),
                });
                const data = res.ok ? await res.json() : { success: false, error: 'Failed to submit support ticket.' };
                if (data.success) {
                    setInquirySuccess(true);
                }
                else {
                    setInquiryError(data.error || 'Failed to submit support ticket.');
                }
            }
            else {
                const res = await fetch('/api/marketing/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: inquiryName,
                        email: inquiryEmail,
                        subject: `Custom Package Inquiry: ${inquirySchool || 'Enterprise Plan'}`,
                        message: `Custom Institutional Package Request:
Institution / Organization: ${inquirySchool}
Estimated Students: ${inquiryStudents}
Contact Person: ${inquiryName} (${inquiryEmail})
Requirements:
${inquiryMessage}`,
                    }),
                });
                const data = await res.json();
                if (data.success) {
                    setInquirySuccess(true);
                }
                else {
                    setInquiryError(data.error || 'Failed to send inquiry.');
                }
            }
        }
        catch (err: any) {
            setInquiryError('A network error occurred. Please try again.');
        }
        finally {
            setInquirySubmitting(false);
        }
    };
    return (<div className="w-full px-4 sm:px-6 lg:px-8 py-16 space-y-16 relative">
      {wishlistToast && (<div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-semibold animate-fade-in">
          <BiSolidHeart className="text-rose-500 text-base"/>
          <span>{wishlistToast}</span>
        </div>)}

      <div className="text-center max-w-3xl mx-auto space-y-4">
        <h1 className="text-4xl sm:text-5xl font-semibold text-slate-900 dark:text-white tracking-tight">
          Invest in Your Educational Excellence
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          Predictable subscription tiers designed for schools, academies, colleges, and training institutes. Every plan includes automated student records, dedicated portal isolation, and instant subdomain provisioning.
        </p>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 inline-flex flex-wrap items-center justify-center gap-1.5 text-xs font-semibold shadow-xs">
            {[
              { code: 'BDT', label: 'BDT (৳)' },
              { code: 'USD', label: 'USD ($)' },
              { code: 'EUR', label: 'EUR (€)' },
              { code: 'GBP', label: 'GBP (£)' },
              { code: 'AUD', label: 'AUD (A$)' },
              { code: 'CAD', label: 'CAD (C$)' },
            ].map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => handleSelectCurrency(c.code)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-semibold ${
                  currency === c.code
                    ? 'bg-secondary text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 inline-flex items-center gap-2 text-xs font-semibold shadow-xs">
            <button type="button" onClick={() => setBillingCycle('MONTHLY')} className={`px-4 py-1.5 rounded-xl transition-all cursor-pointer ${billingCycle === 'MONTHLY'
            ? 'bg-secondary text-white shadow-md shadow-secondary/25'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
              Monthly Billing
            </button>
            <button type="button" onClick={() => setBillingCycle('YEARLY')} className={`px-4 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${billingCycle === 'YEARLY'
            ? 'bg-secondary text-white shadow-md shadow-secondary/25'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
              Annual Billing
            </button>
          </div>
        </div>
      </div>

      {loading ? (<LoadingScreen fullScreen={false} label="Loading subscription packages..."/>) : sortedPackages.length === 0 ? (<div className="py-16 text-center max-w-md mx-auto space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary text-2xl border border-secondary/20">
            <BiPackage />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            No Packages Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Subscription tiers will appear here once published in the administrative system.
          </p>
          <button type="button" onClick={fetchPackages} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-secondary hover:bg-secondary-dark transition-all cursor-pointer">
            <BiRefresh className="text-base"/>
            <span>Refresh Plans</span>
          </button>
        </div>) : (<div className="space-y-6">
          {publicPromos.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
                  <BiTag className="text-base" />
                </span>
                <div>
                  <span className="font-bold text-amber-950 dark:text-amber-200">
                    Special Offers Available:
                  </span>{' '}
                  <span className="text-amber-900/80 dark:text-amber-300/80">
                    Use public coupon{' '}
                    <span className="font-mono font-bold px-1.5 py-0.5 rounded-md bg-amber-200/60 dark:bg-amber-800/60 text-amber-950 dark:text-amber-100 border border-amber-300 dark:border-amber-700">
                      {publicPromos[0].code}
                    </span>{' '}
                    at checkout to save {publicPromos[0].discount_percentage}%!
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {publicPromos.map((pr: any) => (
                  <span
                    key={pr.id}
                    className="inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-1 rounded-lg bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shadow-xs"
                  >
                    <span>{pr.code}</span>
                    <span className="font-sans font-medium text-[10px] text-slate-500 dark:text-slate-400">
                      -{pr.discount_percentage}%
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {wishlistIds.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs shadow-xs">
              <div className="flex items-center gap-2.5 text-emerald-900 dark:text-emerald-200 font-medium">
                <BiSolidHeart className="text-rose-500 text-lg shrink-0" />
                <span>You have a plan saved in your wishlist ready for checkout.</span>
              </div>
              <Link
                href="/creator/checkout"
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm shrink-0"
              >
                Go to Checkout &rarr;
              </Link>
            </div>
          )}

          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
            <span>
              Showing {sortedPackages.length} available {sortedPackages.length === 1 ? 'plan' : 'plans'} (arranged from lowest to highest)
            </span>
            <button type="button" onClick={fetchPackages} className="flex items-center gap-1 hover:text-secondary transition-colors cursor-pointer">
              <BiRefresh className="text-sm"/>
              <span>Refresh</span>
            </button>
          </div>

          <div className={`grid gap-8 ${sortedPackages.length === 1
                ? 'max-w-md mx-auto grid-cols-1'
                : sortedPackages.length === 2
                    ? 'max-w-3xl mx-auto grid-cols-1 md:grid-cols-2'
                    : sortedPackages.length === 3
                        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
            {sortedPackages.map((pkg: any, idx: any) => {
                const currKey = `${currency.toLowerCase()}_per_month`;
                const monthlyRate = Number(pkg[currKey] ?? pkg.bdt_per_month ?? 0);
                const price = billingCycle === 'YEARLY' ? monthlyRate * 12 : monthlyRate;
                const hasExplicitPopular = sortedPackages.some((p: any) => Boolean(p.is_popular));
                const isPopular = hasExplicitPopular
                    ? Boolean(pkg.is_popular)
                    : sortedPackages.length >= 3 && idx === 1;
                return (<Package key={pkg.id} pkg={{ ...pkg, popular: isPopular }} price={price} billingCycle={billingCycle} currency={currency} isWishlisted={wishlistIds.includes(Number(pkg.id))} onToggleWishlist={handleToggleWishlist} wishlistLoading={wishlistLoadingId === Number(pkg.id)}/>);
            })}
          </div>
        </div>)}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-200/70 dark:border-slate-800">
        <div className="flex items-start gap-3.5 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-primary/20 text-secondary flex items-center justify-center text-xl shrink-0">
            <BiRocket />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Instant Provisioning</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Subdomain, SSL encryption, and institutional databases are initialized automatically upon checkout settlement.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
            <BiCheckShield />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Full Data Isolation</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Every institution operates with separated security boundaries, automated audit logs, and encrypted cloud backups.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center text-xl shrink-0">
            <BiServer />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">99.9% High Availability</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Enterprise-grade uptime with geo-redundant server clusters ensuring seamless online classes, exams, and attendance.
            </p>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-8 sm:p-10 lg:p-12 shadow-2xl border border-indigo-500/20">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-secondary/20 blur-3xl pointer-events-none"/>
        <div className="absolute bottom-0 left-1/3 -mb-20 w-64 h-64 rounded-full bg-primary/20 blur-3xl pointer-events-none"/>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-white leading-snug">
              Need a Custom Package for Your Educational Network?
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Managing a multi-campus school, large university, or district education board? Require custom student capacity, dedicated cloud VPS or on-premise servers, custom tenant modules, or legacy SIS data migration?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs text-slate-200">
              <div className="flex items-center gap-2">
                <BiCheckCircle className="text-emerald-400 text-base shrink-0"/>
                <span>Custom Student, Teacher & Staff Quotas</span>
              </div>
              <div className="flex items-center gap-2">
                <BiCheckCircle className="text-emerald-400 text-base shrink-0"/>
                <span>Dedicated High-Availability Server Clusters</span>
              </div>
              <div className="flex items-center gap-2">
                <BiCheckCircle className="text-emerald-400 text-base shrink-0"/>
                <span>Bespoke Tenant Modules & API Integrations</span>
              </div>
              <div className="flex items-center gap-2">
                <BiCheckCircle className="text-emerald-400 text-base shrink-0"/>
                <span>Direct 24/7 Creator Support & Dedicated SLA</span>
              </div>
            </div>
          </div>

          <div className="lg:w-80 shrink-0 bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 flex flex-col gap-3.5">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Creator Support Desk</h3>
              <p className="text-[11px] text-slate-300">
                Talk directly with our technical architecture & creator support team.
              </p>
            </div>

            {creator?.id && (<Link href={`/creator/${creator.id}/tickets`} className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-secondary hover:bg-secondary-dark text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-secondary/30 cursor-pointer">
                <BiSupport className="text-base"/>
                <span>Open Creator Support Ticket</span>
              </Link>)}

            <Link href="/contact?subject=Custom+Institutional+Package+Request" className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center justify-center gap-2 transition-all cursor-pointer">
              <BiMessageSquareDetail className="text-sm"/>
              <span>Contact via Contact Page</span>
            </Link>

            <div className="pt-2 border-t border-white/10 flex flex-col gap-1.5 text-[11px] text-slate-300">
              {SITE_MAIL && (<div className="flex items-center gap-2 truncate">
                  <BiEnvelope className="text-secondary shrink-0 text-xs"/>
                  <a href={`mailto:${SITE_MAIL}`} className="hover:text-white transition-colors truncate">
                    {SITE_MAIL}
                  </a>
                </div>)}
              {SITE_CONTACT && (<div className="flex items-center gap-2 truncate">
                  <BiPhoneCall className="text-secondary shrink-0 text-xs"/>
                  <a href={`tel:${SITE_CONTACT}`} className="hover:text-white transition-colors truncate">
                    {SITE_CONTACT}
                  </a>
                </div>)}
            </div>
          </div>
        </div>
      </div>

      {showInquiryModal && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
            <button type="button" onClick={() => {
                setShowInquiryModal(false);
                setInquirySuccess(false);
                setInquiryError('');
            }} className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
              <BiX className="text-2xl"/>
            </button>

            {inquirySuccess ? (<div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-3xl mx-auto">
                  <BiCheckCircle />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Custom Request Received!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Thank you! Our Creator Support team has received your custom plan inquiry and will review your institution's specifications shortly.
                </p>
                {creator?.id && (<Link href={`/creator/${creator.id}/tickets`} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs bg-secondary text-white hover:bg-secondary-dark transition-all">
                    <span>View Support Tickets</span>
                  </Link>)}
                <div>
                  <button type="button" onClick={() => {
                    setShowInquiryModal(false);
                    setInquirySuccess(false);
                }} className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                    Close Window
                  </button>
                </div>
              </div>) : (<form onSubmit={handleInquirySubmit} className="space-y-4">
                <div className="space-y-1 pr-6">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                    Creator Support Desk
                  </span>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
                    Custom Package Inquiry
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Let us know what limits, modules, and hosting capabilities your institution needs.
                  </p>
                </div>

                {inquiryError && (<div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
                    {inquiryError}
                  </div>)}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Your Name *
                    </label>
                    <input type="text" required value={inquiryName} onChange={(e: any) => setInquiryName(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-secondary"/>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Email Address *
                    </label>
                    <input type="email" required value={inquiryEmail} onChange={(e: any) => setInquiryEmail(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-secondary"/>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Institution Name
                    </label>
                    <input type="text" value={inquirySchool} onChange={(e: any) => setInquirySchool(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-secondary"/>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Estimated Students
                    </label>
                    <input type="text" value={inquiryStudents} onChange={(e: any) => setInquiryStudents(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-secondary"/>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Requirements & Modules Needed *
                  </label>
                  <textarea rows={4} required value={inquiryMessage} onChange={(e: any) => setInquiryMessage(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-secondary resize-none"/>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button type="button" onClick={() => setShowInquiryModal(false)} className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={inquirySubmitting} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-secondary hover:bg-secondary-dark transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-secondary/25 min-w-[140px]">
                    {inquirySubmitting ? (<div className="loader loader-sm loader-white"/>) : (<span>Send Inquiry to Support</span>)}
                  </button>
                </div>
              </form>)}
          </div>
        </div>)}
    </div>);
}
