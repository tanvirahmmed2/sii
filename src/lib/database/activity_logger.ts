import { query } from './db';

const g = globalThis as typeof globalThis & {
  __loggedDeveloperRequests?: WeakSet<object>;
};

function getLoggedRequestSet(): WeakSet<object> {
  if (!g.__loggedDeveloperRequests) {
    g.__loggedDeveloperRequests = new WeakSet<object>();
  }
  return g.__loggedDeveloperRequests;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'newpassword',
  'currentpassword',
  'confirmpassword',
  'token',
  'secret',
  'otp',
  'otpcode',
  'twofactorcode',
  'apikey',
  'authorization',
]);

function sanitizeValue(val: any, depth = 0): any {
  if (val === null || val === undefined) return val;
  if (depth > 2) return '[nested]';
  if (typeof val === 'string') {
    if (val.startsWith('data:') && val.length > 120) {
      return `[data-uri:${val.length}chars]`;
    }
    return val.length > 300 ? `${val.slice(0, 300)}...` : val;
  }
  if (typeof val === 'number' || typeof val === 'boolean') return val;
  if (Array.isArray(val)) {
    const sliced = val.slice(0, 10).map((item) => sanitizeValue(item, depth + 1));
    if (val.length > 10) sliced.push(`...+${val.length - 10}`);
    return sliced;
  }
  if (typeof val === 'object') {
    const out: Record<string, any> = {};
    let count = 0;
    for (const [k, v] of Object.entries(val)) {
      if (count >= 20) break;
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        out[k] = '[redacted]';
      } else {
        out[k] = sanitizeValue(v, depth + 1);
      }
      count++;
    }
    return out;
  }
  return String(val);
}

function deriveModuleAndTarget(pathname: string, searchParams: URLSearchParams, body: any) {
  const prefixMatch = pathname.match(/^\/api\/(?:marketing\/)?developer\/?(.*)$/i);
  const tail = (prefixMatch?.[1] || '').replace(/^\/+|\/+$/g, '');
  const parts = tail ? tail.split('/').filter(Boolean) : [];

  let moduleName = parts[0] || 'developer';
  let urlTargetId: string | null = null;
  let routeSubAction: string | null = null;

  if (moduleName === 'emails' && parts[1]) {
    moduleName = `email-${parts[1]}`;
  } else if (moduleName === 'contacts' && parts[1] === 'reply') {
    routeSubAction = 'REPLIED_TO_CONTACT';
  } else if (moduleName === 'custom-email' && !parts[1]) {
    routeSubAction = 'SENT_CUSTOM_EMAIL';
  } else if (moduleName === 'payments' && parts[1] === 'manual-approve') {
    routeSubAction = 'APPROVED_PAYMENT';
  } else if (moduleName === 'investments' && parts[1] === 'withdraw') {
    routeSubAction = 'RECORDED_INVESTMENT_WITHDRAWAL';
  } else if (moduleName === 'dividends' && parts[1]) {
    moduleName = 'monthly-accounting';
    routeSubAction = 'DISTRIBUTED_PROFIT';
  } else if (moduleName === 'support' && parts[2] === 'messages') {
    urlTargetId = parts[1] || null;
    routeSubAction = 'REPLIED_TO_TICKET';
  } else if (moduleName === 'chats' && parts[2] === 'messages') {
    urlTargetId = parts[1] || null;
    routeSubAction = 'SENT_INTERNAL_MESSAGE';
  } else if (moduleName === 'tasks' && parts[2] === 'comments') {
    urlTargetId = parts[1] || null;
    routeSubAction = 'COMMENTED_ON_TASK';
  } else if (moduleName === 'payroll' && parts[1]) {
    if (['allocations', 'payments', 'assign'].includes(parts[1])) {
      moduleName = `payroll-${parts[1]}`;
      urlTargetId = parts[2] || null;
    } else {
      urlTargetId = parts[1];
    }
  } else if (moduleName === 'meta' && parts[1]) {
    moduleName = `meta-${parts[1]}`;
  } else if (moduleName === 'me' && parts[1]) {
    moduleName = `auth-${parts[1]}`;
  } else if (parts[1] && !['list', 'seed'].includes(parts[1])) {
    urlTargetId = parts[1];
  }

  const bodyData = body?.data && typeof body.data === 'object' ? body.data : body;
  const targetIdRaw =
    urlTargetId ||
    searchParams.get('id') ||
    searchParams.get('sessionId') ||
    searchParams.get('slug') ||
    searchParams.get('ticketId') ||
    searchParams.get('websiteId') ||
    bodyData?.id ||
    bodyData?.targetId ||
    bodyData?.adminId ||
    bodyData?.contactId ||
    bodyData?.contact_id ||
    bodyData?.developer_id ||
    bodyData?.developerId ||
    bodyData?.role_id ||
    bodyData?.roleId ||
    bodyData?.ticket_id ||
    bodyData?.ticketId ||
    bodyData?.website_id ||
    bodyData?.websiteId ||
    bodyData?.subscription_id ||
    bodyData?.subscriptionId ||
    bodyData?.slug ||
    null;

  return {
    module: moduleName.toLowerCase(),
    targetId: targetIdRaw !== null && targetIdRaw !== undefined ? String(targetIdRaw).slice(0, 120) : null,
    routeSubAction,
  };
}

function deriveActionName(method: string, moduleName: string, body: any, searchParams: URLSearchParams, routeSubAction?: string | null): string {
  const explicitAction = body?.action || searchParams.get('action');
  if (explicitAction && typeof explicitAction === 'string') {
    return explicitAction.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_').slice(0, 140);
  }
  if (routeSubAction) return routeSubAction;
  if (method === 'POST') return `CREATE_${moduleName.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
  if (method === 'PUT' || method === 'PATCH') return `UPDATE_${moduleName.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
  if (method === 'DELETE') return `DELETE_${moduleName.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
  return method;
}

export interface DeveloperActivityParams {
  developerId?: number | string | null;
  developerName?: string | null;
  developerEmail?: string | null;
  roleName?: string | null;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  module: string;
  action: string;
  endpoint: string;
  targetId?: string | number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, any>;
}

export async function recordDeveloperActivity(params: DeveloperActivityParams): Promise<void> {
  try {
    await query(
      `INSERT INTO developer_activity_logs (
         developer_id, developer_name, developer_email, role_name,
         method, module, action, endpoint, target_id, ip_address, user_agent, details
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)`,
      [
        params.developerId ? Number(params.developerId) : null,
        params.developerName || null,
        params.developerEmail || null,
        params.roleName || null,
        params.method,
        params.module,
        params.action,
        params.endpoint,
        params.targetId !== undefined && params.targetId !== null ? String(params.targetId).slice(0, 120) : null,
        params.ipAddress || null,
        params.userAgent || null,
        JSON.stringify(sanitizeValue(params.details || {}) || {}),
      ]
    );
  } catch (err) {
    console.error('Error recording developer activity log:', err);
  }
}

export function recordDeveloperHttpActivity(request: any, developer: any): void {
  try {
    if (!request || typeof request !== 'object' || !developer?.id) return;
    const method = typeof request.method === 'string' ? request.method.toUpperCase() : '';
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return;

    const urlStr = typeof request.url === 'string' ? request.url : '';
    if (!urlStr) return;

    const parsedUrl = new URL(urlStr, 'http://localhost');
    const pathname = parsedUrl.pathname || '';
    if (!pathname.startsWith('/api/marketing/developer') && !pathname.startsWith('/api/developer')) {
      return;
    }

    if (
      pathname === '/api/marketing/developer/me/login' ||
      pathname === '/api/marketing/developer/me/recovery' ||
      pathname === '/api/marketing/developer/me/resend-code'
    ) {
      return;
    }

    const seen = getLoggedRequestSet();
    if (seen.has(request)) return;
    seen.add(request);

    const contentType = String(request.headers?.get?.('content-type') || '').toLowerCase();
    let bodyPromise: Promise<any> = Promise.resolve({});
    if (method !== 'DELETE' && contentType.includes('application/json') && typeof request.clone === 'function') {
      try {
        bodyPromise = request.clone().json().catch(() => ({}));
      } catch {
        bodyPromise = Promise.resolve({});
      }
    } else if (method === 'DELETE' && typeof request.clone === 'function' && contentType.includes('application/json')) {
      try {
        bodyPromise = request.clone().json().catch(() => ({}));
      } catch {
        bodyPromise = Promise.resolve({});
      }
    }

    const rawIp =
      request.headers?.get?.('x-forwarded-for') ||
      request.headers?.get?.('x-real-ip') ||
      null;
    const ipAddress = rawIp ? String(rawIp).split(',')[0].trim() : null;
    const userAgent = request.headers?.get?.('user-agent') || null;
    const queryObj: Record<string, string> = {};
    parsedUrl.searchParams.forEach((v, k) => {
      queryObj[k] = v;
    });

    void bodyPromise.then((body) => {
      const { module, targetId, routeSubAction } = deriveModuleAndTarget(pathname, parsedUrl.searchParams, body);
      const action = deriveActionName(method, module, body, parsedUrl.searchParams, routeSubAction);
      const payloadSummary = body && typeof body === 'object' ? sanitizeValue(body) : {};

      return recordDeveloperActivity({
        developerId: developer.id,
        developerName: developer.name || null,
        developerEmail: developer.email || null,
        roleName: developer.roleName || developer.role || 'Developer',
        method: method as 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        module,
        action,
        endpoint: pathname,
        targetId,
        ipAddress,
        userAgent,
        details: {
          ...(Object.keys(queryObj).length > 0 ? { query: queryObj } : {}),
          ...(payloadSummary && typeof payloadSummary === 'object' ? { body: payloadSummary } : {}),
        },
      });
    }).catch(() => { });
  } catch { }
}

export interface LogActivityParams {
  userId?: string | number | null;
  userType?: string;
  action: string;
  details?: Record<string, any>;
}

export async function logActivity({ userId, userType = 'staff', action, details = {} }: LogActivityParams): Promise<void> {
  try {
    await query(
      `INSERT INTO activity_logs (user_id, user_type, action, details)
       VALUES ($1, $2, $3, $4)`,
      [userId || null, userType, action, JSON.stringify(details)]
    );
  } catch (error) {
    console.error('Error writing to activity_logs:', error);
  }
}
