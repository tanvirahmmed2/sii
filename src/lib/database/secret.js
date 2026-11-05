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

// Base URL configured in .env (e.g. 'localhost:3000' or 'educraft.io' or 'https://educraft.io')
export const BASE_URL = cleanEnv(process.env.BASE_URL) || 'localhost:3000';

/**
 * Normalizes and extracts base domain (with port if present, e.g. 'localhost:3000' or 'educraft.io')
 */
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

// Configured base domain (host:port, e.g. 'localhost:3000' or 'educraft.io')
export const BASE_DOMAIN = extractBaseDomain(BASE_URL);

// Base hostname without port (e.g. 'localhost' or 'educraft.io')
export const BASE_HOST = BASE_DOMAIN.split(':')[0].toLowerCase();

/**
 * Returns the fully qualified base URL for the main website.
 * Directly uses BASE_URL from .env / secret.js.
 */
export const getBaseUrl = (request = null) => {
  const raw = String(BASE_URL).trim();
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw.replace(/\/+$/, '');
  }

  // Determine protocol: if localhost/127.0.0.1 => http, otherwise https or request proto
  let proto = 'https';
  if (BASE_HOST === 'localhost' || BASE_HOST === '127.0.0.1') {
    proto = 'http';
  } else if (request?.headers?.get?.('x-forwarded-proto')) {
    proto = request.headers.get('x-forwarded-proto');
  } else if (typeof window !== 'undefined' && window.location?.protocol) {
    proto = window.location.protocol.replace(':', '');
  }

  return `${proto}://${raw.replace(/\/+$/, '')}`;
};

export const getBaseDomain = (request = null) => BASE_DOMAIN;

/**
 * Extracts tenant identifier (subdomain or custom domain) from incoming request or host.
 * Returns null if the request is on the main SaaS platform.
 * Subdomain is fetched by matching subdomain.base_url.
 */
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

  // Split multiple comma-separated proxy hosts
  const cleanHostWithPort = rawHost.split(',')[0].trim().toLowerCase();
  const cleanHost = cleanHostWithPort.split(':')[0]; // strip port

  const baseDomain = BASE_DOMAIN.toLowerCase();
  const baseHost = BASE_HOST.toLowerCase();

  // 1. MAIN WEBSITE:
  // If host directly matches baseDomain, baseHost, www.baseHost, or localhost/127.0.0.1 => MAIN WEBSITE
  if (
    !cleanHost ||
    cleanHost === baseHost ||
    cleanHost === `www.${baseHost}` ||
    cleanHostWithPort === baseDomain ||
    ((baseHost === 'localhost' || baseHost === '127.0.0.1') && (cleanHost === 'localhost' || cleanHost === '127.0.0.1'))
  ) {
    return null;
  }

  // 2. SUBDOMAIN: fetched by subdomain.base_url
  // Check against full baseDomain with port (e.g. afit.localhost:3000 -> afit)
  if (baseDomain && cleanHostWithPort.endsWith(`.${baseDomain}`)) {
    const sub = cleanHostWithPort.slice(0, -(baseDomain.length + 1)).trim();
    if (sub && sub !== 'www') {
      return sub;
    }
  }

  // Check against baseHost without port (e.g. afit.localhost or afit.educraft.io -> afit)
  if (baseHost && cleanHost.endsWith(`.${baseHost}`)) {
    const sub = cleanHost.slice(0, -(baseHost.length + 1)).trim();
    if (sub && sub !== 'www') {
      return sub;
    }
  }

  // Also support .localhost when base_url is localhost
  if (cleanHost.endsWith('.localhost')) {
    const sub = cleanHost.replace('.localhost', '').trim();
    if (sub && sub !== 'www') {
      return sub;
    }
  }

  // 3. STANDALONE CUSTOM DOMAIN (e.g. oxfordschool.edu.bd)
  return cleanHost;
};

export const DEVELOPER_TOKEN = 'hiesci-dev';
export const CREATOR_TOKEN = 'hiesci-creator';
export const TEACHER_TOKEN = 'hiesci-teacher';
export const STAFF_TOKEN = 'hiesci-staff';
export const OFFICER_TOKEN = 'hiesci-officer';
export const STUDENT_TOKEN = 'hiesci-student';
export const LIVE_CHAT_TOKEN = 'hiesci-live';

// Meta Graph API (Facebook Messenger, Instagram Direct & WhatsApp Cloud API)
export const META_APP_ID = process.env.META_APP_ID || '';
export const META_APP_SECRET = process.env.META_APP_SECRET || '';
export const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || '';
export const META_PAGE_ID = process.env.META_PAGE_ID || '';
export const META_PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';
export const META_INSTAGRAM_ACCOUNT_ID = process.env.META_INSTAGRAM_ACCOUNT_ID || '';
export const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '';
export const META_WABA_ID = process.env.META_WABA_ID || '';
export const META_WEBHOOK_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'sii_meta_secure_verify_token_2026';

// Paddle Payment Gateway
export const PADDLE_API_KEY = process.env.PADDLE_API_KEY || '';
export const PADDLE_ENVIRONMENT = process.env.PADDLE_ENVIRONMENT || 'sandbox';
export const PADDLE_CLIENT_TOKEN = process.env.PADDLE_CLIENT_TOKEN || '';
export const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET || '';

// bKash Payment Gateway
export const BKASH_BASE_URL = process.env.BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta';
export const BKASH_APP_KEY = process.env.BKASH_APP_KEY || '';
export const BKASH_APP_SECRET = process.env.BKASH_APP_SECRET || '';
export const BKASH_USERNAME = process.env.BKASH_USERNAME || '';
export const BKASH_PASSWORD = process.env.BKASH_PASSWORD || '';
export const BKASH_CALLBACK_URL = process.env.BKASH_CALLBACK_URL || '';
export const USD_TO_BDT_RATE = parseFloat(process.env.USD_TO_BDT_RATE || '120');
