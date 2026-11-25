export const CLOUDINARY_NAME: string | undefined = process.env.CLOUDINARY_NAME;
export const CLOUDINARY_API: string | undefined = process.env.CLOUDINARY_API;
export const CLOUDINARY_API_SECRET: string | undefined = process.env.CLOUDINARY_API_SECRET;

export const JWT_SECRET: string | undefined = process.env.JWT_SECRET;
export const NODE_ENV: string = process.env.NODE_ENV || 'development';

export const cleanEnv = (val: unknown): string => {
  if (typeof val === 'string') {
    return val.replace(/\r\n/g, '').replace(/\r/g, '').trim().replace(/^['"]|['"]$/g, '').trim();
  }
  return String(val || '');
};

export const PG_USER: string = cleanEnv(process.env.PG_USER);
export const PG_PASSWORD: string = cleanEnv(process.env.PG_PASSWORD);
export const PG_HOST: string = cleanEnv(process.env.PG_HOST);
export const PG_PORT: string = cleanEnv(process.env.PG_PORT);
export const PG_DATABASE: string = cleanEnv(process.env.PG_DATABASE);

export const BREVO_API_KEY: string = cleanEnv(process.env.BREVO_API_KEY);
export const BREVO_SENDER_EMAIL: string = cleanEnv(process.env.BREVO_SENDER_EMAIL) || 'contact@disibin.com';
export const BREVO_SENDER_NAME: string = cleanEnv(process.env.BREVO_SENDER_NAME) || 'Disibin';
export const BREVO_URL: string = cleanEnv(process.env.BREVO_URL) || 'https://api.brevo.com/v3/smtp/email';

export const ZENDSMS_API_KEY: string = cleanEnv(process.env.ZENDSMS_API_KEY);
export const ZENDSMS_SENDER_ID: string = cleanEnv(process.env.ZENDSMS_SENDER_ID) || 'ZendSMS';
export const ZENDSMS_URL: string = cleanEnv(process.env.ZENDSMS_URL) || 'https://api.zendsms.com/api/v1/send-sms';

export const SCHOOL_NAME: string = 'website.name';
export const LOGO_URL: string = '/icon.png';
export const META_TITLE: string = 'Sky International Institute - Academic Excellence & Growth';
export const META_DESCRIPTION: string = 'Manage student enrollments, exam records, gradesheets, timetables, and billing files dynamically.';

export const MONTHLY_FEE_DUE_DAY: number = parseInt('6', 10);

export const SITE_NAME: string = 'Disibin';
export const SITE_MAIL: string = 'support@disibin.com';
export const SITE_CONTACT: string = '+880 180 500 3886';
export const SITE_ADDRESS: string = 'Mymensingh, Bangladesh';

export const BASE_URL: string = cleanEnv(process.env.BASE_URL) || 'localhost:3000';

export const extractBaseDomain = (url: string = ''): string => {
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

export const BASE_DOMAIN: string = extractBaseDomain(BASE_URL);

export const BASE_HOST: string = BASE_DOMAIN.split(':')[0].toLowerCase();

export const CUSTOM_DOMAIN_CNAME_TARGET: string =
  cleanEnv(process.env.CUSTOM_DOMAIN_CNAME_TARGET) ||
  cleanEnv(process.env.CNAME_TARGET) ||
  (BASE_HOST && BASE_HOST !== 'localhost' && BASE_HOST !== '127.0.0.1' ? `cname.${BASE_HOST}` : 'domains.hiesci.com');

export const CUSTOM_DOMAIN_A_TARGET: string =
  cleanEnv(process.env.CUSTOM_DOMAIN_A_TARGET) ||
  cleanEnv(process.env.SERVER_IP) ||
  '76.76.21.21';

export const getBaseProtocol = (request: any = null): string => {
  const raw = cleanEnv(BASE_URL) || '';
  if (raw.startsWith('https://')) return 'https';
  if (raw.startsWith('http://')) return 'http';

  const forwardedProto = request?.headers?.get?.('x-forwarded-proto');
  if (forwardedProto) {
    return forwardedProto.split(',')[0].trim().toLowerCase();
  }

  if (typeof window !== 'undefined' && (window as any).location?.protocol) {
    return (window as any).location.protocol.replace(':', '').toLowerCase();
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

export const getBaseUrl = (request: any = null): string => {
  const proto = getBaseProtocol(request);
  return `${proto}://${BASE_DOMAIN}`;
};

export const getBaseDomain = (request: any = null): string => BASE_DOMAIN;

export const getSubdomainUrl = (subdomain: string, request: any = null): string => {
  if (!subdomain) return getBaseUrl(request);
  const cleanSub = String(subdomain).trim().toLowerCase().replace(/\..*$/, '');
  const proto = getBaseProtocol(request);
  return `${proto}://${cleanSub}.${BASE_DOMAIN}`;
};

export const getCustomDomainUrl = (customDomain: string, request: any = null): string => {
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

export const getWebsiteUrl = (website: any, request: any = null): string => {
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

export const getWebsiteDomain = (request: any): string | null => {
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

export const DEVELOPER_TOKEN: string = cleanEnv(process.env.DEVELOPER_TOKEN)
export const CREATOR_TOKEN: string = cleanEnv(process.env.CREATOR_TOKEN)
export const TEACHER_TOKEN = 'hiesci-teacher';
export const STAFF_TOKEN = 'hiesci-staff';
export const OFFICER_TOKEN = 'hiesci-officer';
export const STUDENT_TOKEN = 'hiesci-student';
export const LIVE_CHAT_TOKEN: string = cleanEnv(process.env.LIVE_CHAT_TOKEN)

export const META_APP_ID = process.env.META_APP_ID || '';
export const META_APP_SECRET = process.env.META_APP_SECRET || '';
export const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || '';
export const META_PAGE_ID = process.env.META_PAGE_ID || '';
export const META_PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';
export const META_INSTAGRAM_ACCOUNT_ID = process.env.META_INSTAGRAM_ACCOUNT_ID || '';
export const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '';
export const META_WABA_ID = process.env.META_WABA_ID || '';
export const META_WEBHOOK_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'sii_meta_secure_verify_token_2026';

export const SSLCOMMERZ_STORE_ID = process.env.SSLCOMMERZ_STORE_ID || 'testbox';
export const SSLCOMMERZ_STORE_PASSWORD = process.env.SSLCOMMERZ_STORE_PASSWORD || 'qwerty';
export const SSLCOMMERZ_IS_LIVE = process.env.SSLCOMMERZ_IS_LIVE === 'true';
export const SSLCOMMERZ_MODE = process.env.SSLCOMMERZ_MODE || (SSLCOMMERZ_IS_LIVE ? 'live' : 'sandbox');

export const USD_TO_BDT_RATE = parseFloat(process.env.USD_TO_BDT_RATE || '120');

export const DEFAULT_CACHE_TTL_MS = parseInt(process.env.DEFAULT_CACHE_TTL_MS || '60000', 10);
export const DEFAULT_NEGATIVE_CACHE_TTL_MS = parseInt(process.env.DEFAULT_NEGATIVE_CACHE_TTL_MS || '5000', 10);
export const DEFAULT_REDIS_TTL_SEC = parseInt(process.env.DEFAULT_REDIS_TTL_SEC || '300', 10);
export const DEFAULT_REDIS_NEGATIVE_TTL_SEC = parseInt(process.env.DEFAULT_REDIS_NEGATIVE_TTL_SEC || '10', 10);
export const QUERY_TIMEOUT_MS = parseInt(process.env.QUERY_TIMEOUT_MS || '10000', 10);
