'use client';
import { useContext } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    FiBarChart2,
    FiGlobe,
    FiRepeat,
    FiPackage,
    FiCreditCard,
    FiLifeBuoy,
    FiStar,
    FiZap,
    FiUser,
    FiShield,
    FiHome,
    FiLogOut,
    FiX,
} from 'react-icons/fi';
import { Context } from 'src/component/helper/Context';

export const CREATOR_ICON_MAP: Record<string, any> = {
    'bar-chart': FiBarChart2,
    'globe': FiGlobe,
    'repeat': FiRepeat,
    'package': FiPackage,
    'credit-card': FiCreditCard,
    'life-buoy': FiLifeBuoy,
    'star': FiStar,
    'zap': FiZap,
    'user': FiUser,
    'shield': FiShield,
};

export function getCreatorModuleIcon(iconKey?: string) {
    return (iconKey && CREATOR_ICON_MAP[iconKey]) || FiBarChart2;
}

export const CREATOR_NAV_SECTIONS = [
    {
        title: 'Workspace',
        links: [
            { href: '', label: 'Overview', exact: true, iconKey: 'bar-chart', icon: FiBarChart2 },
            { href: '/workspace', label: 'Websites', iconKey: 'globe', icon: FiGlobe },
            { href: '/subscription', label: 'Subscription', iconKey: 'repeat', icon: FiRepeat },
            { href: '/purchases', label: 'Packages', iconKey: 'package', icon: FiPackage },
            { href: '/payments', label: 'Payments', iconKey: 'credit-card', icon: FiCreditCard },
        ],
    },
    {
        title: 'Support',
        links: [
            { href: '/tickets', label: 'Tickets', iconKey: 'life-buoy', icon: FiLifeBuoy },
            { href: '/reviews', label: 'Reviews', iconKey: 'star', icon: FiStar },
            { href: '/updates', label: 'Updates', iconKey: 'zap', icon: FiZap },
        ],
    },
    {
        title: 'Account',
        links: [
            { href: '/profile', label: 'Profile', iconKey: 'user', icon: FiUser },
            { href: '/settings', label: 'Security', iconKey: 'shield', icon: FiShield },
        ],
    },
];
export default function CreatorSidebar({ isOpen, onClose, creator, activeSubscription, subscriptions = [], purchases = [], websites = [], stats = {}, unreadUpdatesCount = 0 }: any) {
    const pathname = usePathname();
    const router = useRouter();
    const { setCreator, fetchCurrentUser } = useContext<any>(Context) || {};
    const creatorId = creator?.id;
    const basePath = creatorId ? `/creator/${creatorId}` : '/creator/login';
    const hasActivePlan = Boolean(stats?.hasActivePackage || activeSubscription?.is_active);
    const hasPurchaseHistory = (stats?.totalPurchases ?? purchases.length) > 0 || (stats?.totalSubscriptions ?? subscriptions.length) > 0;
    const daysRemaining = stats?.daysRemaining ?? (activeSubscription?.current_period_end ? 30 : 0);
    const maxWebsites = stats?.maxWebsites ?? (activeSubscription?.is_active ? (activeSubscription?.max_websites ?? activeSubscription?.max_portfolios ?? 1) : 0);
    const websitesCount = websites.length;
    const isLinkActive = (link: any) => {
        const fullHref = `${basePath}${link.href}`;
        if (link.exact) {
            return pathname === fullHref || pathname === `${fullHref}/`;
        }
        return pathname.startsWith(fullHref);
    };
    const handleLogout = async () => {
        try {
            await fetch('/api/marketing/creator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'logout' }),
            });
        }
        catch (_: any) { }
        if (typeof setCreator === 'function') {
            setCreator(null);
        }
        if (typeof fetchCurrentUser === 'function') {
            fetchCurrentUser();
        }
        router.push('/creator/login');
    };
    const navContent = (<div className="flex flex-col h-full overflow-y-auto bg-white text-slate-800 text-xs">
      <div className="h-12 px-4 flex items-center justify-between border-b border-slate-200 bg-white sticky top-0 z-10">
        <Link href={basePath} className="font-semibold text-slate-900 tracking-tight text-sm">
          Creator
        </Link>

        {onClose && (<button type="button" onClick={onClose} className="md:hidden inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 px-2 py-1 border border-slate-200 rounded cursor-pointer" aria-label="Close menu">
            <FiX className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>)}
      </div>

      <div className="p-2 space-y-4 flex-1">
        {CREATOR_NAV_SECTIONS.map((section: any) => (<div key={section.title} className="space-y-0.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2.5 py-1">
              {section.title}
            </div>
            {section.links.map((link: any) => {
                const active = isLinkActive(link);
                const targetHref = `${basePath}${link.href}`;
                const Icon = link.icon || getCreatorModuleIcon(link.iconKey);
                return (<Link key={link.label} href={targetHref} onClick={onClose} className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded text-xs transition-colors ${active
                        ? 'bg-slate-100 text-slate-900 font-semibold border-l-2 border-slate-900'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-normal'}`}>
                  <span className="flex items-center gap-2 min-w-0">
                    {Icon && <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-slate-900' : 'text-slate-400'}`} />}
                    <span className="truncate">{link.label}</span>
                  </span>

                  {(link.href === '/workspace' || link.href === '/webites') && websitesCount > 0 && (<span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {websitesCount}
                    </span>)}
                  {link.href === '/updates' && unreadUpdatesCount > 0 && (<span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {unreadUpdatesCount}
                    </span>)}
                </Link>);
            })}
          </div>))}
      </div>

      <div className="p-3 m-2 rounded border border-slate-200 bg-slate-50 space-y-1.5 text-xs">
        <div className="flex items-center justify-between text-[11px] font-medium">
          <span className="text-slate-600">Websites Quota</span>
          <span className="text-slate-900 font-mono">
            {websitesCount} / {maxWebsites}
          </span>
        </div>
        <div className="w-full h-1 bg-slate-200 rounded-sm overflow-hidden">
          <div className="h-full bg-slate-800 rounded-sm" style={{
            width: `${maxWebsites > 0 ? Math.min(100, Math.round((websitesCount / maxWebsites) * 100)) : 0}%`,
        }}/>
        </div>
        <div className="flex items-center justify-between text-[10px] pt-0.5 text-slate-500">
          <span>
            {hasActivePlan
                ? (daysRemaining > 0 ? `${daysRemaining}d remaining` : 'Active')
                : hasPurchaseHistory
                    ? 'Plan expired'
                    : 'No purchases'}
          </span>
          {hasActivePlan || hasPurchaseHistory ? (
            <Link href={`${basePath}/purchases`} className="text-slate-800 font-semibold hover:underline">
              Renew / Change
            </Link>
          ) : (
            <Link href="/packages" className="text-slate-800 font-semibold hover:underline">
              Purchase Plan
            </Link>
          )}
        </div>
      </div>

      <div className="p-2 border-t border-slate-200 bg-white space-y-1 sticky bottom-0">
        <Link href="/" onClick={onClose} className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors">
          <FiHome className="w-3.5 h-3.5 shrink-0" />
          <span>Home</span>
        </Link>
        <button type="button" onClick={handleLogout} className="w-full flex items-center justify-center gap-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 py-1.5 px-3 rounded font-medium transition-colors text-xs cursor-pointer">
          <FiLogOut className="w-3.5 h-3.5 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>);
    return (<>
      <div className={`fixed inset-0 bg-black/30 z-50 md:hidden transition-opacity duration-200 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={onClose} aria-hidden="true"/>

      <aside className={`fixed top-0 left-0 bottom-0 w-64 max-w-[85vw] bg-white z-50 md:hidden flex flex-col justify-between border-r border-slate-200 transition-transform duration-200 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`} aria-label="Creator Mobile Navigation">
        {navContent}
      </aside>

      <aside className="hidden md:flex md:w-56 md:flex-col md:shrink-0 bg-white border-r border-slate-200 h-screen sticky top-0 z-30" aria-label="Creator Desktop Navigation">
        {navContent}
      </aside>
    </>);
}
