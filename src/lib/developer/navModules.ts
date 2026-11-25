export interface DeveloperNavLink {
    href: string;
    label: string;
    exact?: boolean;
    iconKey: string;
    keywords?: string;
}

export interface DeveloperNavSection {
    title: string;
    links: DeveloperNavLink[];
}

export interface AllowedDeveloperModule extends DeveloperNavLink {
    section: string;
}

export const DEVELOPER_NAV_SECTIONS_DATA: DeveloperNavSection[] = [
    {
        title: 'Workspace & Overview',
        links: [
            { href: '/developer', label: 'Developer Console', exact: true, iconKey: 'terminal', keywords: 'home console dashboard' },
            { href: '/developer/overview', label: 'Platform Overview', iconKey: 'bar-chart', keywords: 'stats analytics metrics' },
            { href: '/developer/tasks', label: 'Tasks & Sprints', iconKey: 'check-square', keywords: 'sprint todo board' },
            { href: '/developer/notices', label: 'Company Notices', iconKey: 'bell', keywords: 'announcements memos' },
            { href: '/developer/notice-board', label: 'Notice Board', iconKey: 'clipboard', keywords: 'bulletin board updates' },
            { href: '/developer/chats', label: 'Internal Chat', iconKey: 'message-square', keywords: 'team chat messaging' },
        ],
    },
    {
        title: 'Websites & Audience',
        links: [
            { href: '/developer/websites', label: 'Websites', iconKey: 'globe', keywords: 'tenants subdomains sites' },
            { href: '/developer/creators', label: 'Creators', iconKey: 'users', keywords: 'clients owners users' },
            { href: '/developer/leads', label: 'Leads', iconKey: 'user-plus', keywords: 'prospects inquiries sales' },
            { href: '/developer/subscribers', label: 'Subscribers', iconKey: 'mail', keywords: 'newsletter email list' },
        ],
    },
    {
        title: 'Commerce & Plans',
        links: [
            { href: '/developer/packages', label: 'Packages', iconKey: 'package', keywords: 'pricing plans tiers' },
            { href: '/developer/promos', label: 'Promos & Discounts', iconKey: 'tag', keywords: 'coupons codes offers' },
            { href: '/developer/features', label: 'Features', iconKey: 'layers', keywords: 'capabilities catalog' },
            { href: '/developer/subscriptions', label: 'Subscriptions', iconKey: 'repeat', keywords: 'recurring billing plans' },
            { href: '/developer/purchases', label: 'Purchases', iconKey: 'shopping-bag', keywords: 'orders addons' },
            { href: '/developer/payments', label: 'Payments', iconKey: 'credit-card', keywords: 'transactions invoices revenue' },
        ],
    },
    {
        title: 'Template Studio & Design',
        links: [
            { href: '/developer/templates/student-id-card', label: 'Student ID Cards', iconKey: 'user-check', keywords: 'templates id card student' },
            { href: '/developer/templates/teacher-id-card', label: 'Teacher ID Cards', iconKey: 'award', keywords: 'templates id card teacher' },
            { href: '/developer/templates/officer-id-card', label: 'Officer ID Cards', iconKey: 'shield', keywords: 'templates id card officer' },
            { href: '/developer/templates/tc', label: 'Transfer Certificates (TC)', iconKey: 'file-text', keywords: 'templates tc certificate' },
            { href: '/developer/templates/testimonial', label: 'Testimonials', iconKey: 'star', keywords: 'templates testimonial' },
            { href: '/developer/templates/certificate', label: 'Academic Certificates', iconKey: 'award', keywords: 'templates academic certificate' },
            { href: '/developer/templates/payment-receipt', label: 'Payment Receipts', iconKey: 'file-text', keywords: 'templates receipt invoice' },
        ],
    },
    {
        title: 'Content & Policies',
        links: [
            { href: '/developer/blogs', label: 'Blogs', iconKey: 'edit', keywords: 'articles posts' },
            { href: '/developer/policies', label: 'Company Policies', iconKey: 'book-open', keywords: 'privacy terms legal' },
            { href: '/developer/updates', label: 'Product Updates', iconKey: 'zap', keywords: 'changelog releases' },
            { href: '/developer/tutorials', label: 'Tutorials', iconKey: 'play-circle', keywords: 'guides videos docs' },
            { href: '/developer/faqs', label: 'FAQs', iconKey: 'help-circle', keywords: 'questions answers help' },
        ],
    },
    {
        title: 'Support & Comms',
        links: [
            { href: '/developer/support', label: 'Support Tickets', iconKey: 'life-buoy', keywords: 'helpdesk issues tickets' },
            { href: '/developer/live-chats', label: 'Live Chats', iconKey: 'message-circle', keywords: 'visitor chat support' },
            { href: '/developer/contacts', label: 'Contacts', iconKey: 'inbox', keywords: 'contact form messages' },
            { href: '/developer/reports', label: 'Reports', iconKey: 'flag', keywords: 'abuse moderation violations' },
            { href: '/developer/reviews', label: 'Reviews', iconKey: 'star', keywords: 'ratings feedback' },
        ],
    },
    {
        title: 'Meta Channels',
        links: [
            { href: '/developer/facebook-messages', label: 'Facebook Messages', iconKey: 'share', keywords: 'meta fb messenger' },
            { href: '/developer/instagram-messages', label: 'Instagram Messages', iconKey: 'instagram', keywords: 'meta ig dm' },
            { href: '/developer/whatsapp-messages', label: 'WhatsApp Messages', iconKey: 'phone-call', keywords: 'meta wa business' },
        ],
    },
    {
        title: 'Team & Organization',
        links: [
            { href: '/developer/developers', label: 'Developers Team', iconKey: 'code', keywords: 'staff engineers members' },
            { href: '/developer/roles', label: 'Roles & Permissions', iconKey: 'key', keywords: 'rbac access control' },
            { href: '/developer/shareholders', label: 'Shareholders & Equity', iconKey: 'award', keywords: 'equity dividend shares partners' },
            { href: '/developer/withdraws', label: 'Withdrawals & Payouts', iconKey: 'shopping-bag', keywords: 'payouts dividends withdrawals' },
            { href: '/developer/cashflow', label: 'Cash Flow & Ledgers', iconKey: 'bar-chart', keywords: 'financial transactions cash flow revenues' },
            { href: '/developer/payroll', label: 'Payrolls', exact: true, iconKey: 'dollar-sign', keywords: 'salary compensation' },
            { href: '/developer/payroll/assign', label: 'Assign to Developer', iconKey: 'user-check', keywords: 'payroll allocation salary' },
            { href: '/developer/payroll/payments', label: 'Payroll Payments', iconKey: 'check-circle', keywords: 'salary disbursement' },
            { href: '/developer/my-salaries', label: 'My Salaries', iconKey: 'credit-card', keywords: 'payslip vouchers' },
        ],
    },
    {
        title: 'Platform & Settings',
        links: [
            { href: '/developer/modules', label: 'Database Modules', iconKey: 'database', keywords: 'tables schema system' },
            { href: '/developer/spams', label: 'Spam Defense', iconKey: 'alert-octagon', keywords: 'security blocklist rate limit' },
            { href: '/developer/settings', label: 'Settings', iconKey: 'settings', keywords: 'account password preferences' },
            { href: '/developer/profile', label: 'My Profile', iconKey: 'user', keywords: 'account credentials bio' },
        ],
    },
];

export const DEVELOPER_MODULE_ALIAS_MAP: Record<string, string[]> = {
    'support': ['support', 'supports'],
    'supports': ['support', 'supports'],
    'live-chats': ['live-chats', 'live_chats', 'live-chat', 'live_chat'],
    'live_chats': ['live-chats', 'live_chats', 'live-chat', 'live_chat'],
    'contacts': ['contacts', 'contact'],
    'contact': ['contacts', 'contact'],
    'reports': ['reports', 'report'],
    'report': ['reports', 'report'],
    'reviews': ['reviews', 'review'],
    'review': ['reviews', 'review'],
    'faqs': ['faqs', 'faq'],
    'faq': ['faqs', 'faq'],
    'policies': ['policies', 'policy'],
    'policy': ['policies', 'policy'],
    'packages': ['packages', 'package'],
    'package': ['packages', 'package'],
    'blogs': ['blogs', 'blog'],
    'blog': ['blogs', 'blog'],
    'facebook-messages': ['facebook-messages', 'facebook_messages', 'facebook', 'meta'],
    'facebook_messages': ['facebook-messages', 'facebook_messages', 'facebook', 'meta'],
    'instagram-messages': ['instagram-messages', 'instagram_messages', 'instagram', 'meta'],
    'instagram_messages': ['instagram-messages', 'instagram_messages', 'instagram', 'meta'],
    'whatsapp-messages': ['whatsapp-messages', 'whatsapp_messages', 'whatsapp', 'meta'],
    'whatsapp_messages': ['whatsapp-messages', 'whatsapp_messages', 'whatsapp', 'meta'],
    'meta': ['facebook-messages', 'facebook_messages', 'facebook', 'instagram-messages', 'instagram_messages', 'instagram', 'whatsapp-messages', 'whatsapp_messages', 'whatsapp', 'meta'],
    'websites': ['websites', 'website'],
    'website': ['websites', 'website'],
    'creators': ['creators', 'creator'],
    'creator': ['creators', 'creator'],
    'leads': ['leads', 'lead'],
    'lead': ['leads', 'lead'],
    'subscribers': ['subscribers', 'subscriber'],
    'subscriber': ['subscribers', 'subscriber'],
    'payroll': ['payroll', 'payrolls', 'developer-payrolls', 'payroll-payments'],
    'payrolls': ['payroll', 'payrolls', 'developer-payrolls', 'payroll-payments'],
    'my-salaries': ['my-salaries', 'my_salaries', 'payroll'],
    'notice-board': ['notice-board', 'notices', 'notice'],
    'shareholders': ['shareholders', 'shareholder', 'equity'],
    'shareholder': ['shareholders', 'shareholder', 'equity'],
    'withdraws': ['withdraws', 'withdraw', 'withdrawals'],
    'withdraw': ['withdraws', 'withdraw', 'withdrawals'],
    'cashflow': ['cashflow', 'cashflows', 'cash-flow'],
    'cashflows': ['cashflow', 'cashflows', 'cash-flow'],
};

/**
 * Checks whether a developer navigation link is accessible to the given user.
 */
export function isDeveloperLinkAllowed(link: { href: string }, currentUser: any = null): boolean {
    const isSuperAdmin = Boolean(
        currentUser &&
            (Number(currentUser.id) === 1 ||
                String(currentUser.email).toLowerCase() === 'tanvir004006@gmail.com' ||
                (Array.isArray(currentUser.permissions) && currentUser.permissions.includes('*')))
    );
    if (isSuperAdmin)
        return true;
    if (link.href === '/developer' || link.href === '/developer/profile' || link.href === '/developer/notice-board')
        return true;
    const userPerms = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
    const allowedModules = userPerms.map((m: any) => String(m).toLowerCase().trim());
    const rawPath = link.href.split('?')[0];
    const segments = rawPath.split('/').filter(Boolean);
    const moduleName = (segments[1] || '').toLowerCase().trim();
    if (allowedModules.includes(moduleName))
        return true;
    const aliases = DEVELOPER_MODULE_ALIAS_MAP[moduleName];
    if (aliases && aliases.some((a: string) => allowedModules.includes(a)))
        return true;
    return false;
}

/**
 * Returns the flat list of developer modules allowed for the given user.
 */
export function getAllowedDeveloperLinks(currentUser: any = null): AllowedDeveloperModule[] {
    const items: AllowedDeveloperModule[] = [];
    for (const section of DEVELOPER_NAV_SECTIONS_DATA) {
        for (const link of section.links) {
            if (isDeveloperLinkAllowed(link, currentUser)) {
                items.push({
                    ...link,
                    section: section.title,
                });
            }
        }
    }
    return items;
}

/**
 * Filters a list of developer modules by multi-token query matching label, section, path, and keywords.
 */
export function filterDeveloperModules(modules: AllowedDeveloperModule[], query: string): AllowedDeveloperModule[] {
    const q = String(query || '').toLowerCase().trim();
    if (!q)
        return modules;
    const tokens = q.split(/\s+/).filter(Boolean);
    return modules.filter((item) => {
        const haystack = `${item.label} ${item.section} ${item.href} ${item.keywords || ''}`.toLowerCase();
        return tokens.every((token) => haystack.includes(token));
    });
}
