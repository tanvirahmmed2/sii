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
export const COMPANY_URL = 'https://educraft.io';

export const DEVELOPER_TOKEN='hiesci-dev'
export const CREATOR_TOKEN='hiesci-creator'
export const TEACHER_TOKEN='hiesci-creator'
export const STAFF_TOKEN='hiesci-staff'
export const STUDENT_TOKEN='hiesci-student'
export const LIVE_CHAT_TOKEN='hiesci-live'

export const META_WEBHOOK_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'meta_webhook_verify_token';
export const META_APP_SECRET = process.env.META_APP_SECRET || '';
export const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || '';
export const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '';
export const META_WABA_ID = process.env.META_WABA_ID || '';
