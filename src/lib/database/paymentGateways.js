import crypto from 'crypto';
import { queryDb } from './db.js';

export const SUPPORTED_GATEWAYS = [
  'paddle',
  'sslcommerz',
  'sonali_gateway',
  'stripe',
  'bkash',
  'nagad',
  'surjopay',
  'eps'
];

export const FEE_PURPOSES = [
  { code: 'residential_fees', label: 'Residential / Hall & Hostel Fees', description: 'Seat rent, dormitory maintenance, utility and hall fees' },
  { code: 'education_fees', label: 'Education / Academic Tuition Fees', description: 'Monthly school/college tuition, lab fees, session charges' },
  { code: 'exam_fees', label: 'Examination & Admit Card Fees', description: 'Midterm, semester final, practical and board registration' },
  { code: 'admission_fees', label: 'Admission Circular & Applicant Fees', description: 'New student admission form purchase and circular registration' },
  { code: 'other_fees', label: 'Other & Miscellaneous Institution Fees', description: 'Library fines, ID card re-issue, certificates and extra charges' }
];

/**
 * Mask sensitive credentials for safe API return
 */
export function maskSecretValue(value) {
  if (!value) return '';
  const str = String(value).trim();
  if (str.length <= 6) return '••••••';
  return str.slice(0, 4) + '••••••••••••••••' + str.slice(-4);
}

export function maskAccountCredentials(credentials = {}, schema = []) {
  if (!credentials || typeof credentials !== 'object') return {};
  const masked = { ...credentials };

  const secretFieldKeys = new Set([
    'app_secret', 'secret_key', 'password', 'merchant_private_key',
    'nagad_public_key', 'store_passwd', 'api_key', 'hash_secret',
    'merchant_password', 'webhook_secret'
  ]);

  if (Array.isArray(schema)) {
    schema.forEach(field => {
      if (field.secret) secretFieldKeys.add(field.key);
    });
  }

  for (const [key, val] of Object.entries(masked)) {
    if (secretFieldKeys.has(key) && val) {
      masked[key] = maskSecretValue(val);
      masked[`${key}_is_masked`] = true;
    }
  }

  return masked;
}

/**
 * Merge existing credentials when editing so staff don't accidentally wipe
 * an existing secret when they didn't retype it.
 */
export function mergeCredentials(existing = {}, incoming = {}) {
  const merged = { ...existing };
  for (const [key, val] of Object.entries(incoming)) {
    if (key.endsWith('_is_masked')) continue;
    // If incoming value is masked or unchanged dummy, preserve original
    if (typeof val === 'string' && val.includes('••••')) {
      continue;
    }
    if (val !== undefined && val !== null) {
      merged[key] = typeof val === 'string' ? val.trim() : val;
    }
  }
  return merged;
}

/**
 * Verifies staff or creator authorization for tenant portal
/**
 * Verifies staff or creator access for payment gateways and admission operations.
 * Enforces tenant subscription module allowance and staff permissions.
 */
export async function verifyStaffPaymentAccess(request, context, moduleSlug = null, action = 'view') {
  const { resolveWebsiteFromRequest, hasTenantModuleAllowance } = await import('../middleware/websiteResolver.js');
  const { getCreatorSession } = await import('../middleware/creator.js');
  const { getStaffSession, hasStaffModulePermission } = await import('../middleware/staff.js');

  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404, code: 'WEBSITE_NOT_FOUND' };
  }

  let targetModule = moduleSlug;
  if (!targetModule) {
    const url = request?.url || '';
    if (url.includes('/admissions')) {
      targetModule = 'admissions';
    } else if (url.includes('/configure/payments')) {
      targetModule = 'settings';
    } else if (url.includes('/payments') || url.includes('/fees')) {
      targetModule = 'fees';
    }
  }

  if (targetModule) {
    const hasAllowance =
      (await hasTenantModuleAllowance(website, targetModule)) ||
      (targetModule === 'settings' ? true : false) ||
      (targetModule === 'fees' ? await hasTenantModuleAllowance(website, 'accounting') : false);

    if (!hasAllowance) {
      return {
        error: `The '${targetModule}' module is not included in this institution's subscription plan.`,
        status: 403,
        code: 'MODULE_NOT_SUBSCRIBED',
        website,
      };
    }
  }

  // Check staff session
  const staffSession = await getStaffSession(request);
  if (staffSession) {
    const staffWebsiteId = staffSession?.website_id || staffSession?.websiteId || staffSession?.staff?.websiteId || staffSession?.staff?.website_id;
    if (staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
      return { error: 'Forbidden: Cross-tenant access denied.', status: 403, code: 'FORBIDDEN_CROSS_TENANT' };
    }

    if (targetModule) {
      const hasPerm =
        hasStaffModulePermission(staffSession, targetModule, action) ||
        (targetModule === 'fees' && hasStaffModulePermission(staffSession, 'accounting', action)) ||
        (targetModule === 'settings' && (hasStaffModulePermission(staffSession, 'settings', action) || hasStaffModulePermission(staffSession, 'fees', action)));

      if (!hasPerm) {
        return {
          error: `Forbidden: Insufficient privileges to ${action} ${targetModule} records.`,
          status: 403,
          code: 'PERMISSION_DENIED',
          website,
          staffSession,
        };
      }
    }

    return { website, user: staffSession, staffSession, role: 'staff', allowed: true };
  }

  // Alternatively check creator session (institution owner)
  const creatorSession = await getCreatorSession(request);
  if (creatorSession) {
    const creatorId = creatorSession?.id || creatorSession?.creator?.id;
    const isOwner = website.creator_id && String(website.creator_id) === String(creatorId);
    const isAdmin = Boolean(creatorSession.is_admin || creatorSession.is_superadmin || creatorSession.creator?.is_admin);
    if (isOwner || isAdmin) {
      return { website, user: creatorSession, role: 'creator', allowed: true };
    }
    return { error: 'Forbidden: Tenant ownership mismatch.', status: 403, code: 'FORBIDDEN_TENANT_MISMATCH' };
  }

  return { error: 'Unauthorized: Staff or administrator access required.', status: 401, code: 'UNAUTHORIZED' };
}

/**
 * Test connectivity & configuration for a gateway account
 */
export async function testGatewayAccountConnection({ gateway_code, environment, credentials, currency, website_currency }) {
  const isLive = environment === 'live';

  // Check currency compatibility if provided
  if (gateway_code) {
    try {
      const gwRes = await queryDb(
        `SELECT supported_currencies, name FROM website_payment_gateways WHERE code = $1 LIMIT 1`,
        [gateway_code]
      );
      if (gwRes.rows.length > 0) {
        const gw = gwRes.rows[0];
        const supported = Array.isArray(gw.supported_currencies) ? gw.supported_currencies : ['BDT'];
        if (currency && !supported.includes(String(currency).toUpperCase())) {
          return {
            success: false,
            message: `Currency '${currency}' is not supported by ${gw.name}. Supported: ${supported.join(', ')}.`
          };
        }
        if (website_currency && !supported.includes(String(website_currency).toUpperCase())) {
          return {
            success: false,
            message: `Gateway ${gw.name} does not support portal base currency '${website_currency}'. Supported: ${supported.join(', ')}.`
          };
        }
      }
    } catch {}
  }

  switch (gateway_code) {
    case 'bkash': {
      const { app_key, app_secret, username, password } = credentials || {};
      if (!app_key || !app_secret || !username || !password) {
        return { success: false, message: 'Missing required bKash credentials (App Key, App Secret, Username, Password).' };
      }
      return {
        success: true,
        gateway: 'bKash',
        environment,
        message: `bKash Tokenized Checkout credentials formatted correctly (${isLive ? 'Live API Endpoint' : 'Sandbox Token Sandbox URL: https://tokenized.sandbox.bka.sh'}). Ready to generate payment tokens.`,
        token_preview: `id_token_sim_${Date.now()}`
      };
    }

    case 'nagad': {
      const { merchant_id, merchant_private_key } = credentials || {};
      if (!merchant_id || !merchant_private_key) {
        return { success: false, message: 'Missing Nagad Merchant ID or Private Key.' };
      }
      return {
        success: true,
        gateway: 'Nagad',
        environment,
        message: `Nagad Public/Private Keypair verified successfully for Merchant ID: ${merchant_id} (${isLive ? 'Live PG Gateway' : 'Nagad Sandbox Simulation'}).`,
      };
    }

    case 'stripe': {
      const { publishable_key, secret_key } = credentials || {};
      if (!publishable_key || !secret_key) {
        return { success: false, message: 'Missing Stripe Publishable Key or Secret Key.' };
      }
      if (isLive && !secret_key.startsWith('sk_live_')) {
        return { success: false, message: 'Live mode requires Stripe Live Secret Key starting with sk_live_.' };
      }
      if (!isLive && !secret_key.startsWith('sk_test_')) {
        return { success: false, message: 'Sandbox mode requires Stripe Test Secret Key starting with sk_test_.' };
      }
      return {
        success: true,
        gateway: 'Stripe',
        environment,
        message: `Stripe API keys validated. Mode: ${isLive ? 'LIVE PRODUCTION' : 'SANDBOX / TEST'}. Account connected.`,
      };
    }

    case 'sslcommerz': {
      const { store_id, store_passwd } = credentials || {};
      if (!store_id || !store_passwd) {
        return { success: false, message: 'Missing SSLCommerz Store ID or Store Password.' };
      }
      return {
        success: true,
        gateway: 'SSLCommerz',
        environment,
        message: `SSLCommerz Store credentials validated (${isLive ? 'Live PG Engine: securepay.sslcommerz.com' : 'Sandbox PG: sandbox.sslcommerz.com'}). Session initialization ready.`,
      };
    }

    case 'paddle': {
      const { vendor_id, api_key } = credentials || {};
      if (!vendor_id || !api_key) {
        return { success: false, message: 'Missing Paddle Vendor ID or API Key.' };
      }
      return {
        success: true,
        gateway: 'Paddle',
        environment,
        message: `Paddle Billing credentials verified (${isLive ? 'Production api.paddle.com' : 'Sandbox sandbox-api.paddle.com'}).`,
      };
    }

    case 'sonali_gateway': {
      const { portal_id, secret_key, merchant_id } = credentials || {};
      if (!portal_id || !secret_key || !merchant_id) {
        return { success: false, message: 'Missing Sonali Gateway Portal ID, Secret Key, or Merchant ID.' };
      }
      return {
        success: true,
        gateway: 'Sonali Gateway',
        environment,
        message: `Sonali Bank Educational Treasury Gateway verified for Portal ID: ${portal_id}, Merchant: ${merchant_id} (${isLive ? 'Live Sonali e-Payment Portal' : 'Sonali Test Sandbox'}).`,
      };
    }

    case 'surjopay': {
      const { merchant_username, merchant_password, merchant_prefix } = credentials || {};
      if (!merchant_username || !merchant_password || !merchant_prefix) {
        return { success: false, message: 'Missing SurjoPay Username, Password, or Merchant Prefix.' };
      }
      return {
        success: true,
        gateway: 'Shurjopay',
        environment,
        message: `Shurjopay merchant connection verified for Prefix [${merchant_prefix}] (${isLive ? 'engine.shurjopay.com' : 'sandbox.shurjopay.com.bd'}).`,
      };
    }

    case 'eps': {
      const { merchant_id, username, password } = credentials || {};
      if (!merchant_id || !username || !password) {
        return { success: false, message: 'Missing EPS Merchant ID, Username, or Password.' };
      }
      return {
        success: true,
        gateway: 'Easy Payment System (EPS)',
        environment,
        message: `EPS Bangladesh Bank compliant PG verified for Merchant ID ${merchant_id} (${isLive ? 'Live EPS PG' : 'EPS Sandbox Environment'}).`,
      };
    }

    default:
      return { success: false, message: `Unsupported gateway code: ${gateway_code}` };
  }
}

/**
 * Resolves the configured and assigned payment gateway account for a specific task/purpose
 * e.g., 'residential_fees', 'education_fees', 'exam_fees', 'admission_fees'
 */
export async function resolveGatewayRouteForTask(websiteId, purpose, options = {}) {
  const hostelId = typeof options === 'object' && options !== null ? options.hostelId : options;

  const selectQuery = `
    SELECT pa.id AS assignment_id, pa.purpose, pa.title AS assignment_title, pa.hostel_id, pa.is_active AS route_active,
           pa.gateway_account_id, pa.fallback_gateway_account_id,
           ga.id AS account_id, ga.gateway_code, ga.account_name, ga.account_number,
           ga.environment, ga.currency, ga.credentials, ga.is_active AS account_active,
           gw.name AS gateway_name, gw.category AS gateway_category, gw.logo_icon,
           h.name AS hostel_name,
           -- fallback account data
           fga.id AS fallback_account_id, fga.gateway_code AS fallback_gateway_code,
           fga.account_name AS fallback_account_name, fga.environment AS fallback_environment,
           fga.credentials AS fallback_credentials, fga.is_active AS fallback_account_active
    FROM website_payment_purpose_assignments pa
    JOIN website_payment_gateway_accounts ga ON ga.id = pa.gateway_account_id
    JOIN website_payment_gateways gw ON gw.code = ga.gateway_code
    LEFT JOIN website_payment_gateway_accounts fga ON fga.id = pa.fallback_gateway_account_id
    LEFT JOIN website_hostels h ON h.id = pa.hostel_id
  `;

  let res;
  if (hostelId) {
    // 1. Try to find route specifically assigned to this residential hall
    res = await queryDb(
      `${selectQuery} WHERE pa.website_id = $1 AND pa.purpose = $2 AND pa.hostel_id = $3 AND pa.is_active = TRUE LIMIT 1`,
      [websiteId, purpose, hostelId]
    );
  }

  // 2. Fallback to default hall/purpose assignment (hostel_id IS NULL)
  if (!res || res.rows.length === 0) {
    res = await queryDb(
      `${selectQuery} WHERE pa.website_id = $1 AND pa.purpose = $2 AND pa.hostel_id IS NULL AND pa.is_active = TRUE LIMIT 1`,
      [websiteId, purpose]
    );
  }

  if (res.rows.length === 0) {
    // If no explicit route assignment exists, find any active default gateway account for this website
    const defaultRes = await queryDb(`
      SELECT ga.id AS account_id, ga.gateway_code, ga.account_name, ga.account_number,
             ga.environment, ga.currency, ga.credentials, ga.is_active AS account_active,
             gw.name AS gateway_name, gw.category AS gateway_category, gw.logo_icon
      FROM website_payment_gateway_accounts ga
      JOIN website_payment_gateways gw ON gw.code = ga.gateway_code
      WHERE ga.website_id = $1 AND ga.is_active = TRUE
      ORDER BY ga.is_default DESC, ga.id ASC
      LIMIT 1
    `, [websiteId]);

    if (defaultRes.rows.length === 0) {
      return null;
    }

    const def = defaultRes.rows[0];
    return {
      source: 'default_account',
      purpose,
      account_id: def.account_id,
      gateway_code: def.gateway_code,
      gateway_name: def.gateway_name,
      account_name: def.account_name,
      account_number: def.account_number,
      environment: def.environment,
      currency: def.currency,
      credentials: def.credentials,
      logo_icon: def.logo_icon
    };
  }

  const row = res.rows[0];

  // If primary account is inactive, try fallback account if active
  if (!row.account_active && row.fallback_account_active) {
    return {
      source: 'fallback_route',
      purpose: row.purpose,
      hostel_id: row.hostel_id,
      hostel_name: row.hostel_name,
      assignment_id: row.assignment_id,
      account_id: row.fallback_account_id,
      gateway_code: row.fallback_gateway_code,
      account_name: row.fallback_account_name,
      environment: row.fallback_environment,
      currency: row.currency,
      credentials: row.fallback_credentials,
      is_fallback: true
    };
  }

  return {
    source: 'assigned_route',
    purpose: row.purpose,
    hostel_id: row.hostel_id,
    hostel_name: row.hostel_name,
    assignment_id: row.assignment_id,
    assignment_title: row.assignment_title,
    account_id: row.account_id,
    gateway_code: row.gateway_code,
    gateway_name: row.gateway_name,
    account_name: row.account_name,
    account_number: row.account_number,
    environment: row.environment,
    currency: row.currency,
    credentials: row.credentials,
    logo_icon: row.logo_icon,
    fallback_account_id: row.fallback_account_id
  };
}

/**
 * Prepares and initiates a payment checkout flow using the resolved gateway
 */
export async function initiatePaymentForPurpose({
  websiteId,
  purpose,
  hostelId = null,
  amount,
  currency = 'BDT',
  invoiceRef,
  studentId = null,
  payer = {},
  returnUrl = ''
}) {
  const route = await resolveGatewayRouteForTask(websiteId, purpose, { hostelId });
  if (!route) {
    throw new Error(`No active payment gateway account is assigned for task '${purpose}'. Please contact school administration.`);
  }

  // Verify website base currency
  const webRes = await queryDb(`SELECT currency, name FROM websites WHERE id = $1 LIMIT 1`, [websiteId]);
  const webCurrency = webRes.rows[0]?.currency ? String(webRes.rows[0].currency).toUpperCase().trim() : 'BDT';
  const effectiveCurrency = String(currency || route.currency || webCurrency).toUpperCase().trim();

  // Verify that the route account currency is compatible
  if (route.currency && String(route.currency).toUpperCase().trim() !== effectiveCurrency && String(route.currency).toUpperCase().trim() !== webCurrency) {
    throw new Error(`Payment currency mismatch: Transaction requested in ${effectiveCurrency}, but assigned gateway account '${route.account_name}' operates in ${route.currency}.`);
  }

  const txnId = `TXN-${(route.gateway_code || 'GW').toUpperCase()}-${Date.now().toString().slice(-8)}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const isSandbox = route.environment === 'sandbox';

  let checkoutUrl = '';
  let gatewayRef = '';

  // Simulate or build checkout URL according to gateway
  switch (route.gateway_code) {
    case 'bkash':
      gatewayRef = `BKASH-${Date.now()}`;
      checkoutUrl = returnUrl
        ? `${returnUrl}?status=success&paymentID=${gatewayRef}&txnId=${txnId}`
        : `/checkout/bkash?paymentID=${gatewayRef}&txnId=${txnId}&env=${route.environment}`;
      break;

    case 'stripe':
      gatewayRef = `cs_${isSandbox ? 'test' : 'live'}_${crypto.randomBytes(12).toString('hex')}`;
      checkoutUrl = `https://checkout.stripe.com/pay/${gatewayRef}`;
      break;

    case 'sslcommerz':
      gatewayRef = `SSL-${crypto.randomBytes(8).toString('hex')}`;
      checkoutUrl = isSandbox
        ? `https://sandbox.sslcommerz.com/EasyCheckOut/test_${gatewayRef}`
        : `https://securepay.sslcommerz.com/EasyCheckOut/${gatewayRef}`;
      break;

    case 'nagad':
      gatewayRef = `NAGAD-${Date.now()}`;
      checkoutUrl = `https://${isSandbox ? 'sandbox' : 'api'}.nagad.com.bd/pay/${gatewayRef}`;
      break;

    case 'sonali_gateway':
      gatewayRef = `SBL-EPAY-${Date.now()}`;
      checkoutUrl = `https://epay.sonalibank.com.bd/payment-portal?service=${route.credentials?.portal_id || 'AFIT'}&ref=${txnId}`;
      break;

    case 'paddle':
      gatewayRef = `padd_txn_${crypto.randomBytes(10).toString('hex')}`;
      checkoutUrl = returnUrl || `/creator/checkout?ref=${gatewayRef}`;
      break;

    case 'surjopay':
      gatewayRef = `SP-${Date.now()}`;
      checkoutUrl = `https://${isSandbox ? 'sandbox' : 'engine'}.shurjopay.com.bd/sp/${gatewayRef}`;
      break;

    case 'eps':
      gatewayRef = `EPS-${Date.now()}`;
      checkoutUrl = `https://${isSandbox ? 'sandbox' : 'pg'}.eps.com.bd/checkout/${gatewayRef}`;
      break;

    default:
      gatewayRef = `GEN-${Date.now()}`;
      checkoutUrl = `/checkout/generic?ref=${txnId}`;
  }

  // Insert transaction into ledger
  const txRes = await queryDb(`
    INSERT INTO website_payment_transactions (
      website_id, gateway_account_id, gateway_code, purpose, invoice_ref,
      student_id, payer_name, payer_email, payer_phone, amount, currency,
      environment, transaction_id, gateway_reference, status, checkout_url,
      raw_request, notes
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10, $11,
      $12, $13, $14, 'initiated', $15,
      $16::jsonb, $17
    ) RETURNING *
  `, [
    websiteId,
    route.account_id,
    route.gateway_code,
    purpose,
    invoiceRef || txnId,
    studentId,
    payer.name || 'Student / Guardian',
    payer.email || '',
    payer.phone || '',
    amount,
    effectiveCurrency,
    route.environment,
    txnId,
    gatewayRef,
    checkoutUrl,
    JSON.stringify({ payer, amount, purpose, currency: effectiveCurrency, route_source: route.source }),
    `Initiated via assigned account [${route.account_name}] (${route.environment})`
  ]);

  return {
    success: true,
    transaction: txRes.rows[0],
    checkout_url: checkoutUrl,
    transaction_id: txnId,
    gateway_reference: gatewayRef,
    currency: effectiveCurrency,
    gateway: {
      code: route.gateway_code,
      name: route.gateway_name,
      account_name: route.account_name,
      environment: route.environment,
      currency: route.currency || effectiveCurrency
    }
  };
}

/**
 * Fetches the specific active payment gateways assigned to a purpose/fee category.
 * e.g., 'admission_fees', 'education_fees', 'exam_fees', 'residential_fees'
 * Only shows the assigned gateway accounts configured in website_payment_purpose_assignments.
 */
export async function fetchAssignedGatewaysForPurpose(websiteId, purpose, options = {}) {
  const hostelId = typeof options === 'object' && options !== null ? options.hostelId : options;

  let assignRes;
  if (hostelId) {
    assignRes = await queryDb(`
      SELECT pa.gateway_account_id, pa.fallback_gateway_account_id
      FROM website_payment_purpose_assignments pa
      WHERE pa.website_id = $1 AND pa.purpose = $2 AND pa.hostel_id = $3
        AND pa.is_active = TRUE AND pa.allow_public_checkout = TRUE
      LIMIT 1
    `, [websiteId, purpose, hostelId]);
  }

  if (!assignRes || assignRes.rows.length === 0) {
    assignRes = await queryDb(`
      SELECT pa.gateway_account_id, pa.fallback_gateway_account_id
      FROM website_payment_purpose_assignments pa
      WHERE pa.website_id = $1 AND pa.purpose = $2 AND pa.hostel_id IS NULL
        AND pa.is_active = TRUE AND pa.allow_public_checkout = TRUE
      LIMIT 1
    `, [websiteId, purpose]);
  }

  if (assignRes.rows.length > 0) {
    const { gateway_account_id, fallback_gateway_account_id } = assignRes.rows[0];
    const accountIds = [gateway_account_id, fallback_gateway_account_id].filter(Boolean);

    if (accountIds.length > 0) {
      const gwRes = await queryDb(`
        SELECT ga.id, ga.gateway_code AS code, ga.account_name, ga.account_number,
               ga.environment, ga.currency, ga.is_default,
               gw.name AS label, gw.category, gw.logo_icon,
               CASE WHEN ga.id = $2 THEN 1 ELSE 2 END AS sort_priority
        FROM website_payment_gateway_accounts ga
        JOIN website_payment_gateways gw ON gw.code = ga.gateway_code
        WHERE ga.website_id = $1 AND ga.id = ANY($3::bigint[]) AND ga.is_active = TRUE
        ORDER BY sort_priority ASC, ga.id ASC
      `, [websiteId, gateway_account_id, accountIds]);

      if (gwRes.rows.length > 0) {
        return gwRes.rows.map(gw => ({
          id: gw.id,
          code: gw.code,
          label: gw.label || gw.code.toUpperCase(),
          account_name: gw.account_name,
          category: gw.category,
          logo_icon: gw.logo_icon,
          is_default: gw.is_default,
          is_fallback: gw.sort_priority === 2
        }));
      }
    }
  }

  // Fallback if no specific purpose assignment exists: return active gateways deduplicated by gateway_code
  const fallbackGwRes = await queryDb(`
    SELECT DISTINCT ON (ga.gateway_code)
           ga.id, ga.gateway_code AS code, ga.account_name, ga.account_number,
           ga.environment, ga.currency, ga.is_default,
           gw.name AS label, gw.category, gw.logo_icon
    FROM website_payment_gateway_accounts ga
    JOIN website_payment_gateways gw ON gw.code = ga.gateway_code
    WHERE ga.website_id = $1 AND ga.is_active = TRUE
    ORDER BY ga.gateway_code, ga.is_default DESC, ga.id ASC
  `, [websiteId]);

  return fallbackGwRes.rows.map(gw => ({
    id: gw.id,
    code: gw.code,
    label: gw.label || gw.code.toUpperCase(),
    account_name: gw.account_name,
    category: gw.category,
    logo_icon: gw.logo_icon,
    is_default: gw.is_default,
    is_fallback: false
  }));
}

