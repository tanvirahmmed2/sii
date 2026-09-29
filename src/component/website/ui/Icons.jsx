export function LayoutGridIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect width="7" height="7" x="3" y="3" rx="1" strokeWidth="2"/>
      <rect width="7" height="7" x="14" y="3" rx="1" strokeWidth="2"/>
      <rect width="7" height="7" x="14" y="14" rx="1" strokeWidth="2"/>
      <rect width="7" height="7" x="3" y="14" rx="1" strokeWidth="2"/>
    </svg>
  );
}

export function BoxIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
    </svg>
  );
}

export function CreditCardIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect width="20" height="14" x="2" y="5" rx="2" strokeWidth="2"/>
      <line x1="2" x2="22" y1="10" y2="10" strokeWidth="2"/>
    </svg>
  );
}

export function AlertCircleIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth="2"/>
      <line x1="12" x2="12" y1="8" y2="12" strokeWidth="2"/>
      <line x1="12" x2="12.01" y1="16" y2="16" strokeWidth="2"/>
    </svg>
  );
}

export function UsersIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4" strokeWidth="2"/>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  );
}

export function ShieldCheckIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
    </svg>
  );
}

export function StarIcon({ className = "w-5 h-5", filled = false }) {
  return (
    <svg className={className} fill={filled ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
      <polygon strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}

export function MessageSquareIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  );
}

export function MoveVerticalIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <polyline strokeWidth="2" points="8 18 12 22 16 18"/>
      <polyline strokeWidth="2" points="8 6 12 2 16 6"/>
      <line strokeWidth="2" x1="12" x2="12" y1="2" y2="22"/>
    </svg>
  );
}

export function PlusIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <line strokeWidth="2" x1="12" x2="12" y1="5" y2="19"/>
      <line strokeWidth="2" x1="5" x2="19" y1="12" y2="12"/>
    </svg>
  );
}

export function CheckCircleIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
      <polyline strokeWidth="2" points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
}

export function ExternalLinkIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
      <polyline strokeWidth="2" points="15 3 21 3 21 9"/>
      <line strokeWidth="2" x1="10" x2="21" y1="14" y2="3"/>
    </svg>
  );
}
