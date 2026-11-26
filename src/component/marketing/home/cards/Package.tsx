'use client';
import React from 'react';
import Link from 'next/link';
import {
    BiCheckCircle,
    BiStar,
    BiUser,
    BiGroup,
    BiIdCard,
    BiCloud,
    BiTime,
    BiHeart,
    BiSolidHeart,
    BiLoaderAlt,
} from 'react-icons/bi';

function formatStorage(mb: number): string {
    if (!mb || mb <= 0) return '0 MB';
    if (mb >= 1024) {
        return mb % 1024 === 0 ? `${mb / 1024} GB` : `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
}

export default function Package({
    pkg,
    price,
    billingCycle = 'MONTHLY',
    currency = 'USD',
    isWishlisted = false,
    onToggleWishlist,
    wishlistLoading = false,
}: any) {
    if (!pkg) return null;

    const currencySymbols: Record<string, string> = {
        BDT: '৳',
        USD: '$',
        EUR: '€',
        GBP: '£',
        AUD: 'A$',
        CAD: 'C$',
    };
    const symbol = currencySymbols[String(currency).toUpperCase()] || '$';
    const isYearly = billingCycle === 'YEARLY';
    const isPopular = Boolean(pkg.is_popular ?? pkg.popular);

    const maxStudents = Number(pkg.max_students ?? pkg.maxStudents ?? 0);
    const maxTeachers = Number(pkg.max_teachers ?? pkg.maxTeachers ?? 0);
    const maxStaff = Number(pkg.max_staff ?? pkg.maxStaff ?? 0);
    const maxStorageMb = Number(pkg.max_storage_mb ?? pkg.maxStorageMb ?? 0);
    const gracePeriod = Number(pkg.grace_period ?? pkg.gracePeriod ?? 0);
    const storageDisplay = formatStorage(maxStorageMb);

    const displayFeatures: string[] = Array.from(
        new Set<string>(
            Array.isArray(pkg.package_features)
                ? pkg.package_features
                    .filter((f: any) => f && f.is_active !== false && String(f.title || '').trim())
                    .map((f: any) => String(f.title).trim())
                : []
        )
    );
    const summaryText = pkg.tagline || pkg.short_description || pkg.description || '';

    return (
        <div
            className={`relative rounded-3xl p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 select-text ${
                isWishlisted
                    ? 'bg-white dark:bg-slate-900 border-2 border-emerald-500 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/20 z-10'
                    : isPopular
                        ? 'bg-white dark:bg-slate-900 border-2 border-secondary shadow-xl shadow-secondary/15 ring-2 ring-secondary/20 z-10'
                        : 'bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-secondary/40 dark:hover:border-secondary/40'
            }`}
        >
            {isWishlisted ? (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-semibold uppercase tracking-wider shadow-lg flex items-center gap-1.5 z-20">
                    <BiSolidHeart className="text-xs text-rose-300" />
                    <span>In Your Wishlist</span>
                </div>
            ) : isPopular ? (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-linear-to-r from-secondary to-secondary-dark text-white text-[11px] font-semibold uppercase tracking-wider shadow-lg flex items-center gap-1.5 z-20">
                    <BiStar className="text-sm fill-current text-white" />
                    <span>Most Popular</span>
                </div>
            ) : null}

            <button
                type="button"
                onClick={(e: any) => {
                    e.preventDefault();
                    if (onToggleWishlist) onToggleWishlist(pkg.id);
                }}
                disabled={wishlistLoading}
                title={isWishlisted ? 'Remove from your saved wishlist' : 'Save package to wishlist'}
                className={`absolute top-6 right-6 p-2 rounded-2xl border transition-all cursor-pointer z-20 ${
                    isWishlisted
                        ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 shadow-xs'
                        : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 hover:border-rose-300 hover:bg-rose-50/50'
                }`}
            >
                {wishlistLoading ? (
                    <div className="loader loader-sm" />
                ) : isWishlisted ? (
                    <BiSolidHeart className="text-base text-rose-500 animate-scale-up" />
                ) : (
                    <BiHeart className="text-base" />
                )}
            </button>

            <div className="space-y-6">
                <div className="pr-10">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h3 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
                            {pkg.name}
                        </h3>
                        {gracePeriod > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                <BiTime className="text-xs" />
                                <span>{gracePeriod}d Grace</span>
                            </span>
                        )}
                    </div>

                    {summaryText && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                            {summaryText}
                        </p>
                    )}
                </div>

                <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-4xl font-semibold text-slate-900 dark:text-white font-mono tracking-tight">
                            {symbol}{Number(price).toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {isYearly ? '/ year' : '/ month'}
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                        {isYearly ? 'Billed annually with full feature access' : 'Billed monthly, cancel anytime'}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <BiUser className="text-base text-secondary shrink-0" />
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                            {maxStudents.toLocaleString()} Students
                        </span>
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <BiIdCard className="text-base text-secondary shrink-0" />
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                            {maxTeachers.toLocaleString()} Teachers
                        </span>
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <BiGroup className="text-base text-secondary shrink-0" />
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                            {maxStaff.toLocaleString()} Staff
                        </span>
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <BiCloud className="text-base text-secondary shrink-0" />
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                            {storageDisplay} Storage
                        </span>
                    </div>
                </div>

                {displayFeatures.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-3">
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                            What is included:
                        </span>
                        <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                            {displayFeatures.map((feat: string, fidx: number) => (
                                <li key={fidx} className="flex items-start gap-2.5 leading-relaxed">
                                    <BiCheckCircle className="text-base text-primary dark:text-primary-light shrink-0 mt-0.5" />
                                    <span className="line-clamp-2">{feat}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <div className="pt-7">
                {isWishlisted ? (
                    <Link
                        href="/creator/checkout"
                        className="w-full py-3 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25 ring-2 ring-emerald-500/30"
                    >
                        <span>Proceed to Check Out &rarr;</span>
                    </Link>
                ) : (
                    <button
                        type="button"
                        onClick={(e: any) => {
                            e.preventDefault();
                            if (onToggleWishlist) onToggleWishlist(pkg.id);
                        }}
                        disabled={wishlistLoading}
                        className={`w-full py-3 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                            isPopular
                                ? 'bg-secondary hover:bg-secondary-dark text-white shadow-secondary/25 ring-2 ring-secondary/30'
                                : 'bg-slate-900 hover:bg-slate-800 dark:bg-white/10 dark:hover:bg-white/20 text-white border border-slate-800 dark:border-white/10 hover:border-secondary/40'
                        }`}
                    >
                        {wishlistLoading ? (
                            <BiLoaderAlt className="animate-spin text-base" />
                        ) : (
                            <>
                                <BiHeart className="text-base" />
                                <span>{pkg.cta || 'Add to Wishlist'}</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
