export const CLOUDINARY_NAME = process.env.CLOUDINARY_NAME;
export const CLOUDINARY_API = process.env.CLOUDINARY_API;
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

export const JWT_SECRET = process.env.JWT_SECRET;
export const NODE_ENV = process.env.NODE_ENV || 'development';

export const cleanEnv = (val) =>
  typeof val === 'string'
    ? val.replace(/\r\n/g, '').replace(/\r/g, '').trim().replace(/^['"]|['"]$/g, '').trim()
    : val;

export const PG_USER = cleanEnv(process.env.PG_USER);
export const PG_PASSWORD = cleanEnv(process.env.PG_PASSWORD);
export const PG_HOST = cleanEnv(process.env.PG_HOST);
export const PG_PORT = cleanEnv(process.env.PG_PORT);
export const PG_DATABASE = cleanEnv(process.env.PG_DATABASE);

export const BREVO_SENDER_EMAIL = cleanEnv(process.env.BREVO_SENDER_EMAIL);
export const BREVO_SENDER_NAME = cleanEnv(process.env.BREVO_SENDER_NAME);
export const BREVO_API_KEY = cleanEnv(process.env.BREVO_API_KEY);

export const SCHOOL_NAME = "website.name";
export const LOGO_URL = '/icon.png';
export const META_TITLE = "Sky International Institute - Academic Excellence & Growth";
export const META_DESCRIPTION = 'Manage student enrollments, exam records, gradesheets, timetables, and billing files dynamically.';

export const MONTHLY_FEE_DUE_DAY = parseInt('6', 10);

export const SITE_NAME = 'Hiesci';
export const SITE_MAIL = 'support@hiesci.io';
export const SITE_CONTACT = '+1 (800) 555-0199';
export const SITE_ADDRESS = 'Tech Innovation District, 100 Enterprise Way, Suite 400';
export const COMPANY_NAME = 'EduCraft Technologies Inc.';
export const COMPANY_URL = process.env.COMPANY_URL || 'https://educraft.io';

export const BASE_URL = cleanEnv(process.env.BASE_URL) || 'localhost:3000';

export const extractBaseDomain = (url = '') => {
  const target = cleanEnv(url) || cleanEnv(BASE_URL) || 'localhost:3000';
  try {
    const raw = String(target).trim();
    const hasProto = raw.startsWith('http://') || raw.startsWith('https://');
    const parsed = new URL(hasProto ? raw : `http://${raw}`);
    return (parsed.host || parsed.hostname || raw).toLowerCase();
  } catch {
    return String(target).replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
  }
};

export const BASE_DOMAIN = extractBaseDomain(BASE_URL);

export const BASE_HOST = BASE_DOMAIN.split(':')[0].toLowerCase();

export const getBaseProtocol = (request = null) => {
  const raw = cleanEnv(BASE_URL) || '';
  if (raw.startsWith('https://')) return 'https';
  if (raw.startsWith('http://')) return 'http';

  const forwardedProto = request?.headers?.get?.('x-forwarded-proto');
  if (forwardedProto) {
    return forwardedProto.split(',')[0].trim().toLowerCase();
  }

  if (typeof window !== 'undefined' && window.location?.protocol) {
    return window.location.protocol.replace(':', '').toLowerCase();
  }

  const hostNoPort = BASE_HOST.toLowerCase();
  if (
    hostNoPort === 'localhost' ||
    hostNoPort === '127.0.0.1' ||
    /^\d+\.\d+\.\d+\.\d+$/.test(hostNoPort) ||
    BASE_DOMAIN.includes(':')
  ) {
    return 'http';
  }

  return 'https';
};

export const getBaseUrl = (request = null) => {
  const proto = getBaseProtocol(request);
  return `${proto}://${BASE_DOMAIN}`;
};

export const getBaseDomain = (request = null) => BASE_DOMAIN;

export const getSubdomainUrl = (subdomain, request = null) => {
  if (!subdomain) return getBaseUrl(request);
  const cleanSub = String(subdomain).trim().toLowerCase().replace(/\..*$/, '');
  const proto = getBaseProtocol(request);
  return `${proto}://${cleanSub}.${BASE_DOMAIN}`;
};

export const getCustomDomainUrl = (customDomain, request = null) => {
  if (!customDomain) return getBaseUrl(request);
  const clean = String(customDomain).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  let proto = 'https';
  if (clean.includes('localhost') || /^\d+\.\d+\.\d+\.\d+/.test(clean) || clean.includes(':')) {
    proto = 'http';
  } else if (request?.headers?.get?.('x-forwarded-proto')) {
    proto = request.headers.get('x-forwarded-proto').split(',')[0].trim().toLowerCase();
  }
  return `${proto}://${clean}`;
};

export const getWebsiteUrl = (website, request = null) => {
  if (!website) return getBaseUrl(request);

  if (typeof website === 'string') {
    const clean = website.trim();
    if (!clean) return getBaseUrl(request);
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      return clean.replace(/\/+$/, '');
    }
    if (clean.includes('.') && !clean.endsWith(`.${BASE_DOMAIN}`) && !clean.endsWith(`.${BASE_HOST}`)) {
      return getCustomDomainUrl(clean, request);
    }
    const cleanSub = clean.replace(`.${BASE_DOMAIN}`, '').replace(`.${BASE_HOST}`, '').split('.')[0];
    return getSubdomainUrl(cleanSub, request);
  }

  const rawCustom = (website.custom_domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const isCustomVerified = website.custom_domain_verified === true || website.custom_domain_verified === 'true';
  const hasSub = Boolean((website.subdomain || website.slug || '').trim());

  if (rawCustom && (isCustomVerified || !hasSub)) {
    return getCustomDomainUrl(rawCustom, request);
  }

  const rawSub = (website.subdomain || website.slug || '').trim().toLowerCase();
  if (rawSub) {
    const cleanSub = rawSub.includes('.') ? rawSub.split('.')[0] : rawSub;
    return getSubdomainUrl(cleanSub, request);
  }

  return getBaseUrl(request);
};

export const getWebsiteDomain = (request) => {
  if (!request) return null;

  let rawHost = '';
  if (typeof request === 'string') {
    rawHost = request;
  } else {
    rawHost =
      request.headers?.get?.('x-forwarded-host') ||
      request.headers?.get?.('host') ||
      request.nextUrl?.host ||
      (request.url ? new URL(request.url).host : '') ||
      '';
  }

  if (!rawHost) return null;

  const cleanHostWithPort = rawHost.split(',')[0].trim().toLowerCase();
  const cleanHost = cleanHostWithPort.split(':')[0]; 

  const baseDomain = BASE_DOMAIN.toLowerCase();
  const baseHost = BASE_HOST.toLowerCase();

  if (
    !cleanHost ||
    cleanHost === baseHost ||
    cleanHost === `www.${baseHost}` ||
    cleanHostWithPort === baseDomain ||
    ((baseHost === 'localhost' || baseHost === '127.0.0.1') && (cleanHost === 'localhost' || cleanHost === '127.0.0.1'))
  ) {
    return null;
  }

  if (baseDomain && cleanHostWithPort.endsWith(`.${baseDomain}`)) {
    let sub = cleanHostWithPort.slice(0, -(baseDomain.length + 1)).trim();
    if (sub.startsWith('www.')) sub = sub.slice(4).trim();
    if (sub && sub !== 'www') {
      return sub;
    }
  }

  if (baseHost && cleanHost.endsWith(`.${baseHost}`)) {
    let sub = cleanHost.slice(0, -(baseHost.length + 1)).trim();
    if (sub.startsWith('www.')) sub = sub.slice(4).trim();
    if (sub && sub !== 'www') {
      return sub;
    }
  }

  if (cleanHost.endsWith('.localhost')) {
    let sub = cleanHost.replace('.localhost', '').trim();
    if (sub.startsWith('www.')) sub = sub.slice(4).trim();
    if (sub && sub !== 'www') {
      return sub;
    }
  }

  return cleanHost.replace(/^www\./, '');
};

export const DEVELOPER_TOKEN = 'hiesci-dev';
export const CREATOR_TOKEN = 'hiesci-creator';
export const TEACHER_TOKEN = 'hiesci-teacher';
export const STAFF_TOKEN = 'hiesci-staff';
export const OFFICER_TOKEN = 'hiesci-officer';
export const STUDENT_TOKEN = 'hiesci-student';
export const LIVE_CHAT_TOKEN = 'hiesci-live';

export const META_APP_ID = process.env.META_APP_ID || '';
export const META_APP_SECRET = process.env.META_APP_SECRET || '';
export const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || '';
export const META_PAGE_ID = process.env.META_PAGE_ID || '';
export const META_PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';
export const META_INSTAGRAM_ACCOUNT_ID = process.env.META_INSTAGRAM_ACCOUNT_ID || '';
export const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '';
export const META_WABA_ID = process.env.META_WABA_ID || '';
export const META_WEBHOOK_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'sii_meta_secure_verify_token_2026';

export const SHURJOPAY_ENGINE_URL = process.env.SHURJOPAY_ENGINE_URL || 'https://engine.shurjopayment.com';
export const SHURJOPAY_USERNAME = process.env.SHURJOPAY_USERNAME || '';
export const SHURJOPAY_PASSWORD = process.env.SHURJOPAY_PASSWORD || '';
export const SHURJOPAY_PREFIX = process.env.SHURJOPAY_PREFIX || 'SII';
export const SHURJOPAY_RETURN_URL = process.env.SHURJOPAY_RETURN_URL || '';
export const SHURJOPAY_CANCEL_URL = process.env.SHURJOPAY_CANCEL_URL || '';

export const PAYPAL_API_URL = process.env.PAYPAL_API_URL || 'https://api-m.paypal.com';
export const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
export const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
export const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || '';

export const PADDLE_API_KEY = process.env.PADDLE_API_KEY || '';
export const PADDLE_ENVIRONMENT = process.env.PADDLE_ENVIRONMENT || 'sandbox';
export const PADDLE_CLIENT_TOKEN = process.env.PADDLE_CLIENT_TOKEN || '';
export const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET || '';

export const CRON_SECRET = process.env.CRON_SECRET || '';
export const USD_TO_BDT_RATE = parseFloat(process.env.USD_TO_BDT_RATE || '120');
