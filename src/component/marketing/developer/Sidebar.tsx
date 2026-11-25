'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    FiTerminal,
    FiBarChart2,
    FiCheckSquare,
    FiBell,
    FiClipboard,
    FiMessageSquare,
    FiGlobe,
    FiUsers,
    FiUserPlus,
    FiMail,
    FiPackage,
    FiTag,
    FiLayers,
    FiRepeat,
    FiShoppingBag,
    FiCreditCard,
    FiAward,
    FiShield,
    FiFileText,
    FiStar,
    FiEdit3,
    FiBookOpen,
    FiZap,
    FiPlayCircle,
    FiHelpCircle,
    FiLifeBuoy,
    FiMessageCircle,
    FiInbox,
    FiFlag,
    FiShare2,
    FiInstagram,
    FiPhoneCall,
    FiCode,
    FiKey,
    FiDollarSign,
    FiUserCheck,
    FiCheckCircle,
    FiDatabase,
    FiAlertOctagon,
    FiSettings,
    FiUser,
    FiHome,
    FiLogOut,
    FiX,
} from 'react-icons/fi';
import {
    DEVELOPER_NAV_SECTIONS_DATA,
    isDeveloperLinkAllowed,
    getAllowedDeveloperLinks,
} from 'src/lib/developer/navModules';

export const DEVELOPER_ICON_MAP: Record<string, any> = {
    'terminal': FiTerminal,
    'bar-chart': FiBarChart2,
    'check-square': FiCheckSquare,
    'bell': FiBell,
    'clipboard': FiClipboard,
    'message-square': FiMessageSquare,
    'globe': FiGlobe,
    'users': FiUsers,
    'user-plus': FiUserPlus,
    'mail': FiMail,
    'package': FiPackage,
    'tag': FiTag,
    'layers': FiLayers,
    'repeat': FiRepeat,
    'shopping-bag': FiShoppingBag,
    'credit-card': FiCreditCard,
    'user-check': FiUserCheck,
    'award': FiAward,
    'shield': FiShield,
    'file-text': FiFileText,
    'star': FiStar,
    'edit': FiEdit3,
    'book-open': FiBookOpen,
    'zap': FiZap,
    'play-circle': FiPlayCircle,
    'help-circle': FiHelpCircle,
    'life-buoy': FiLifeBuoy,
    'message-circle': FiMessageCircle,
    'inbox': FiInbox,
    'flag': FiFlag,
    'share': FiShare2,
    'instagram': FiInstagram,
    'phone-call': FiPhoneCall,
    'code': FiCode,
    'key': FiKey,
    'dollar-sign': FiDollarSign,
    'check-circle': FiCheckCircle,
    'database': FiDatabase,
    'alert-octagon': FiAlertOctagon,
    'settings': FiSettings,
    'user': FiUser,
};

export function getDeveloperModuleIcon(iconKey?: string) {
    return (iconKey && DEVELOPER_ICON_MAP[iconKey]) || FiTerminal;
}

export const ADMIN_NAV_SECTIONS = DEVELOPER_NAV_SECTIONS_DATA.map((section) => ({
    ...section,
    links: section.links.map((link) => ({
        ...link,
        icon: getDeveloperModuleIcon(link.iconKey),
    })),
}));
export const DEVELOPER_NAV_SECTIONS = ADMIN_NAV_SECTIONS;

export { isDeveloperLinkAllowed, getAllowedDeveloperLinks };

export default function DeveloperSidebar({ isOpen, onClose, currentUser = null }: any) {
    const pathname = usePathname();
    const router = useRouter();
    const isLinkAllowed = (link: any) => isDeveloperLinkAllowed(link, currentUser);
    const handleLogout = async () => {
        try {
            await fetch('/api/marketing/developer/me/logout', {
                method: 'POST',
            });
            router.push('/developer-auth/login');
            router.refresh();
        }
        catch (e: any) {
            router.push('/developer-auth/login');
        }
    };
    const isLinkActive = (link: any) => {
        const linkBase = link.href.split('?')[0];
        if (link.exact) {
            return (pathname === linkBase &&
                (!link.href.includes('?') ||
                    (typeof window !== 'undefined' && window.location.search === link.href.slice(link.href.indexOf('?')))));
        }
        return pathname === linkBase || pathname.startsWith(`${linkBase}/`);
    };
    const navContent = (<div className="flex flex-col h-full overflow-y-auto">
      {onClose && (<div className="h-12 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 md:hidden sticky top-0 z-10">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Navigation</span>
          <button type="button" onClick={onClose} className="inline-flex items-center gap-1 text-xs font-normal text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 cursor-pointer" aria-label="Close navigation">
            <FiX className="w-3.5 h-3.5"/>
            <span>Close</span>
          </button>
        </div>)}

      <div className="p-3 space-y-4 flex-1">
        {DEVELOPER_NAV_SECTIONS.map((section: any) => {
            const visibleLinks = section.links.filter(isLinkAllowed);
            if (visibleLinks.length === 0)
                return null;
            return (<div key={section.title} className="space-y-0.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2.5 py-1">
                {section.title}
              </div>
              {visibleLinks.map((link: any) => {
                    const active = isLinkActive(link);
                    const Icon = link.icon;
                    return (<Link key={link.href} href={link.href} onClick={onClose} className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-colors ${active
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 font-normal'}`}>
                    {Icon && <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}/>}
                    <span className="truncate">{link.label}</span>
                  </Link>);
                })}
            </div>);
        })}
      </div>

      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 sticky bottom-0">
        <Link href="/" onClick={onClose} className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-normal transition-colors">
          <FiHome className="w-3.5 h-3.5 shrink-0"/>
          <span>Platform Home</span>
        </Link>
        <button type="button" onClick={handleLogout} className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 text-xs font-normal transition-colors cursor-pointer">
          <FiLogOut className="w-3.5 h-3.5 shrink-0"/>
          <span>Sign Out</span>
        </button>
      </div>
    </div>);
    return (<>
      <div className={`fixed inset-0 bg-black/40 z-50 md:hidden transition-opacity ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={onClose} aria-hidden="true"/>

      <aside className={`fixed top-0 left-0 bottom-0 w-64 max-w-[80vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 md:hidden flex flex-col justify-between shadow-sm transition-transform duration-200 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`} aria-label="Developer Mobile Navigation">
        {navContent}
      </aside>

      <aside className="hidden md:flex md:w-56 md:flex-col md:shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen sticky top-0 z-30" aria-label="Developer Desktop Navigation">
        {navContent}
      </aside>
    </>);
}
