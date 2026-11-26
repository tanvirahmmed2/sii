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
        title: 'Workspace',
        links: [
            { href: '/developer', label: 'Console', exact: true, iconKey: 'terminal', keywords: 'home console dashboard developer' },
            { href: '/developer/overview', label: 'Overview', iconKey: 'bar-chart', keywords: 'stats analytics metrics platform' },
            { href: '/developer/tasks', label: 'Tasks', iconKey: 'check-square', keywords: 'sprint todo board sprints' },
            { href: '/developer/notices', label: 'Notices', iconKey: 'bell', keywords: 'announcements memos company' },
            { href: '/developer/notice-board', label: 'Noticeboard', iconKey: 'clipboard', keywords: 'bulletin board updates' },
            { href: '/developer/chats', label: 'Chats', iconKey: 'message-square', keywords: 'team chat messaging internal' },
        ],
    },
    {
        title: 'Audience',
        links: [
            { href: '/developer/websites', label: 'Websites', iconKey: 'globe', keywords: 'tenants subdomains sites' },
            { href: '/developer/creators', label: 'Creators', iconKey: 'users', keywords: 'clients owners users' },
            { href: '/developer/leads', label: 'Leads', iconKey: 'user-plus', keywords: 'prospects inquiries sales' },
            { href: '/developer/subscribers', label: 'Subscribers', iconKey: 'mail', keywords: 'newsletter email list' },
        ],
    },
    {
        title: 'Commerce',
        links: [
            { href: '/developer/packages', label: 'Packages', iconKey: 'package', keywords: 'pricing plans tiers' },
            { href: '/developer/promos', label: 'Promos', iconKey: 'tag', keywords: 'coupons codes offers discounts' },
            { href: '/developer/features', label: 'Features', iconKey: 'layers', keywords: 'capabilities catalog' },
            { href: '/developer/subscriptions', label: 'Subscriptions', iconKey: 'repeat', keywords: 'recurring billing plans' },
            { href: '/developer/purchases', label: 'Purchases', iconKey: 'shopping-bag', keywords: 'orders addons' },
            { href: '/developer/payments', label: 'Payments', iconKey: 'credit-card', keywords: 'transactions invoices revenue directpay' },
        ],
    },
    {
        title: 'Templates',
        links: [
            { href: '/developer/templates/student-id-card', label: 'StudentID', iconKey: 'user-check', keywords: 'templates id card student' },
            { href: '/developer/templates/teacher-id-card', label: 'TeacherID', iconKey: 'award', keywords: 'templates id card teacher' },
            { href: '/developer/templates/officer-id-card', label: 'OfficerID', iconKey: 'shield', keywords: 'templates id card officer' },
            { href: '/developer/templates/tc', label: 'TC', iconKey: 'file-text', keywords: 'templates tc transfer certificate' },
            { href: '/developer/templates/testimonial', label: 'Testimonials', iconKey: 'star', keywords: 'templates testimonial' },
            { href: '/developer/templates/certificate', label: 'Certificates', iconKey: 'award', keywords: 'templates academic certificate' },
            { href: '/developer/templates/payment-receipt', label: 'Receipts', iconKey: 'file-text', keywords: 'templates receipt invoice payment' },
        ],
    },
    {
        title: 'Content',
        links: [
            { href: '/developer/blogs', label: 'Blogs', iconKey: 'edit', keywords: 'articles posts' },
            { href: '/developer/policies', label: 'Policies', iconKey: 'book-open', keywords: 'privacy terms legal company' },
            { href: '/developer/updates', label: 'Updates', iconKey: 'zap', keywords: 'changelog releases product' },
            { href: '/developer/tutorials', label: 'Tutorials', iconKey: 'play-circle', keywords: 'guides videos docs' },
            { href: '/developer/faqs', label: 'FAQs', iconKey: 'help-circle', keywords: 'questions answers help' },
        ],
    },
    {
        title: 'Emails',
        links: [
            { href: '/developer/email-creators', label: 'Creators', iconKey: 'mail', keywords: 'email creators campaign broadcast redis' },
            { href: '/developer/email-subscribers', label: 'Subscribers', iconKey: 'mail', keywords: 'email subscribers newsletter broadcast redis' },
            { href: '/developer/email-developers', label: 'Developers', iconKey: 'mail', keywords: 'email developers team broadcast redis' },
            { href: '/developer/email-leads', label: 'Leads', iconKey: 'mail', keywords: 'email leads prospects broadcast redis' },
        ],
    },
    {
        title: 'Support',
        links: [
            { href: '/developer/support', label: 'Support', iconKey: 'life-buoy', keywords: 'helpdesk issues tickets' },
            { href: '/developer/live-chats', label: 'Livechats', iconKey: 'message-circle', keywords: 'visitor chat support' },
            { href: '/developer/contacts', label: 'Contacts', iconKey: 'inbox', keywords: 'contact form messages' },
            { href: '/developer/reports', label: 'Reports', iconKey: 'flag', keywords: 'abuse moderation violations' },
            { href: '/developer/reviews', label: 'Reviews', iconKey: 'star', keywords: 'ratings feedback' },
        ],
    },
    {
        title: 'Meta',
        links: [
            { href: '/developer/facebook-messages', label: 'Facebook', iconKey: 'share', keywords: 'meta fb messenger messages' },
            { href: '/developer/instagram-messages', label: 'Instagram', iconKey: 'instagram', keywords: 'meta ig dm messages' },
            { href: '/developer/whatsapp-messages', label: 'WhatsApp', iconKey: 'phone-call', keywords: 'meta wa business messages' },
        ],
    },
    {
        title: 'Developers',
        links: [
            { href: '/developer/developers', label: 'Developers', iconKey: 'code', keywords: 'staff engineers members team' },
            { href: '/developer/roles', label: 'Roles', iconKey: 'key', keywords: 'rbac access control permissions' },
            { href: '/developer/payroll', label: 'Payrolls', exact: true, iconKey: 'dollar-sign', keywords: 'salary compensation' },
            { href: '/developer/payroll/assign', label: 'Allocations', iconKey: 'user-check', keywords: 'payroll allocation assign salary developer' },
            { href: '/developer/payroll/payments', label: 'Disbursements', iconKey: 'check-circle', keywords: 'salary disbursement payroll payments' },
            { href: '/developer/my-salaries', label: 'Salaries', iconKey: 'credit-card', keywords: 'payslip vouchers my salaries' },
        ],
    },
    {
        title: 'Finance',
        links: [
            { href: '/developer/shareholders', label: 'Shareholders', iconKey: 'award', keywords: 'equity dividend shares partners' },
            { href: '/developer/investments', label: 'Investments', iconKey: 'layers', keywords: 'investments funding shares capital equity' },
            { href: '/developer/expenses', label: 'Expenses', iconKey: 'file-text', keywords: 'expenses salary bills overhead accounting transactions' },
            { href: '/developer/monthly-accounting', label: 'Accounting', iconKey: 'bar-chart', keywords: 'monthly accounting profit distribution dividends reinvest' },
            { href: '/developer/withdraws', label: 'Withdrawals', iconKey: 'shopping-bag', keywords: 'payouts dividends withdrawals' },
            { href: '/developer/cashflow', label: 'Cashflow', iconKey: 'bar-chart', keywords: 'financial transactions cash flow revenues ledgers' },
        ],
    },
    {
        title: 'System',
        links: [
            { href: '/developer/modules', label: 'Modules', iconKey: 'database', keywords: 'tables schema system database' },
            { href: '/developer/spams', label: 'Spams', iconKey: 'alert-octagon', keywords: 'security blocklist rate limit defense' },
            { href: '/developer/settings', label: 'Settings', iconKey: 'settings', keywords: 'account password preferences' },
            { href: '/developer/profile', label: 'Profile', iconKey: 'user', keywords: 'account credentials bio my profile' },
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
    'expenses': ['expenses', 'expense', 'expense-transactions'],
    'expense': ['expenses', 'expense', 'expense-transactions'],
    'investments': ['investments', 'investment', 'shares', 'shareholders'],
    'investment': ['investments', 'investment', 'shares', 'shareholders'],
    'monthly-accounting': ['monthly-accounting', 'accounting', 'financial-reports', 'cashflow'],
    'email-creators': ['email-creators', 'emails', 'creators', 'marketing'],
    'email-subscribers': ['email-subscribers', 'emails', 'subscribers', 'marketing'],
    'email-developers': ['email-developers', 'emails', 'developers', 'marketing'],
    'email-leads': ['email-leads', 'emails', 'leads', 'marketing'],
};

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
