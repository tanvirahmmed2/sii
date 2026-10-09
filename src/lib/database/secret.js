// Import and export environment variables to use across the project

export const CLOUDINARY_NAME = process.env.CLOUDINARY_NAME;
export const CLOUDINARY_API = process.env.CLOUDINARY_API;
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

export const JWT_SECRET = process.env.JWT_SECRET;
export const NODE_ENV = process.env.NODE_ENV || 'development';

export const PG_USER = process.env.PG_USER;
export const PG_PASSWORD = process.env.PG_PASSWORD;
export const PG_HOST = process.env.PG_HOST;
export const PG_PORT = process.env.PG_PORT;
export const PG_DATABASE = process.env.PG_DATABASE;

export const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;
export const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME;
export const BREVO_API_KEY = process.env.BREVO_API_KEY;

export const SCHOOL_NAME = 'Alpha Institute';
export const LOGO_URL = '/icon.png';
export const META_TITLE = "Sky International Institute - Academic Excellence & Growth";
export const META_DESCRIPTION = 'Manage student enrollments, exam records, gradesheets, timetables, and billing files dynamically.';

export const MONTHLY_FEE_DUE_DAY = parseInt('6', 10);

export const SITE_NAME ='Hiesci';
export const SITE_MAIL ='support@hiesci.io';
export const SITE_CONTACT ='+1 (800) 555-0199';
export const SITE_ADDRESS ='Tech Innovation District, 100 Enterprise Way, Suite 400';
export const COMPANY_NAME ='EduCraft Technologies Inc.';
export const COMPANY_URL = process.env.COMPANY_URL || 'https://educraft.io';

export const getBaseUrl = (request) => {
  if (!request) return '';
  try {
    if (typeof request === 'string') {
      return new URL(request).origin;
    }
    if (request.nextUrl?.origin) {
      return request.nextUrl.origin;
    }
    const host = request.headers?.get?.('x-forwarded-host') || request.headers?.get?.('host');
    if (host) {
      const proto = request.headers?.get?.('x-forwarded-proto') || (request.url?.startsWith('https') ? 'https' : 'http');
      return `${proto}://${host.split(',')[0].trim()}`;
    }
    if (request.url) {
      return new URL(request.url).origin;
    }
  } catch {}
  return '';
};

export const BASE_URL = '';

export const extractBaseDomain = (url = '') => {
  if (!url) return '';
  try {
    const raw = String(url).trim();
    const parsed = new URL(raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`);
    return parsed.host || parsed.hostname || '';
  } catch {
    return String(url).replace(/^https?:\/\//, '').split('/')[0] || '';
  }
};

export const BASE_DOMAIN = '';

export const DEVELOPER_TOKEN='hiesci-dev'
export const CREATOR_TOKEN='hiesci-creator'
export const TEACHER_TOKEN='hiesci-teacher'
export const STAFF_TOKEN='hiesci-staff'
export const STUDENT_TOKEN='hiesci-student'
export const LIVE_CHAT_TOKEN='hiesci-live'

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
