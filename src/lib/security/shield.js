import crypto from 'crypto';
import { queryDb } from '../database/db.js';

const memoryStore = new Map();

function cleanMemoryStore() {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    if (record.expiresAt < now) {
      memoryStore.delete(key);
    }
  }
}

setInterval(cleanMemoryStore, 60000).unref();

export function getClientIp(request) {
  if (!request) return '127.0.0.1';
  const headers = request.headers;
  const forwarded = headers?.get?.('x-forwarded-for') || headers?.get?.('x-real-ip') || headers?.get?.('cf-connecting-ip');
  if (forwarded) {
    const parts = forwarded.split(',');
    return parts[0].trim();
  }
  return '127.0.0.1';
}

export function getUserAgent(request) {
  if (!request) return 'Unknown';
  return String(request.headers?.get?.('user-agent') || 'Unknown').slice(0, 500);
}

export function generateSecureOtp(length = 6) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(crypto.randomInt(min, max + 1));
}

export function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/\0/g, '').trim();
}

const ATTACK_PATTERNS = [
  /(\b(union(\s+all)?\s+select|select\s+.*\s+from\s+information_schema|waitfor\s+delay|pg_sleep)\b)/i,
  /(--|;(\s*drop\s+table|\s*delete\s+from|\s*truncate\s+table))/i,
  /('\s*or\s*'?[0-9]+'?\s*=\s*'?[0-9]+)/i,
  /(<script\b[^>]*>|javascript:\s*|onload\s*=|onerror\s*=|document\.cookie)/i,
  /(\b(cmd\.exe|powershell(\.exe)?|\/bin\/sh|\/bin\/bash)\b|;\s*rm\s+-rf)/i,
  /(\.\.[\/\\]\.\.[\/\\]|\/etc\/passwd|c:\\windows\\system32)/i,
  /(jndi:(ldap|rmi|dns):)/i,
];

export async function inspectMalwareAndAttacks(request, body = {}) {
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);
  const url = request?.url || '';

  const scanTargets = [url, userAgent];

  function extractStrings(obj, depth = 0) {
    if (!obj || depth > 4) return;
    if (typeof obj === 'string') {
      scanTargets.push(obj);
    } else if (typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        scanTargets.push(key);
        extractStrings(obj[key], depth + 1);
      }
    }
  }

  extractStrings(body);

  for (const text of scanTargets) {
    if (!text || typeof text !== 'string') continue;
    for (const pattern of ATTACK_PATTERNS) {
      if (pattern.test(text)) {
        const sample = text.slice(0, 300);
        const endpoint = request?.nextUrl?.pathname || url.slice(0, 200);

        try {
          await queryDb(
            `INSERT INTO security_attack_logs (ip_address, user_agent, endpoint, attack_type, severity, payload_sample, blocked_until)
             VALUES ($1, $2, $3, 'malicious_signature', 'CRITICAL', $4, CURRENT_TIMESTAMP + INTERVAL '2 hours')`,
            [ip, userAgent, endpoint, sample]
          );

          await queryDb(
            `INSERT INTO security_rate_limits (rate_key, hit_count, window_start, blocked_until, updated_at)
             VALUES ($1, 999, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '2 hours', CURRENT_TIMESTAMP)
             ON CONFLICT (rate_key) DO UPDATE SET blocked_until = CURRENT_TIMESTAMP + INTERVAL '2 hours', updated_at = CURRENT_TIMESTAMP`,
            [`ip_blocked:${ip}`]
          );
        } catch (_) {}

        memoryStore.set(`blocked:${ip}`, {
          expiresAt: Date.now() + 7200000,
          reason: 'Automated exploit attempt detected',
        });

        return {
          isBlocked: true,
          allowed: false,
          isAllowed: false,
          status: 403,
          error: 'Security alert: Request was blocked by enterprise firewall protection.',
        };
      }
    }
  }

  const memBlocked = memoryStore.get(`blocked:${ip}`);
  if (memBlocked && memBlocked.expiresAt > Date.now()) {
    const remainingSeconds = Math.ceil((memBlocked.expiresAt - Date.now()) / 1000);
    return {
      isBlocked: true,
      allowed: false,
      isAllowed: false,
      status: 429,
      error: `Access temporarily suspended due to security violations. Try again in ${remainingSeconds} seconds.`,
      retryAfterSeconds: remainingSeconds,
    };
  }

  return { isBlocked: false, allowed: true, isAllowed: true };
}

export async function checkRateLimit({
  ip,
  identifier = '',
  action = 'default',
  maxAttempts = 5,
  windowSeconds = 900,
  blockDurationSeconds = 900,
}) {
  const now = Date.now();
  const keys = [`ip:${ip}:${action}`];
  if (identifier) {
    keys.push(`id:${identifier.toLowerCase()}:${action}`);
  }

  for (const key of keys) {
    const mem = memoryStore.get(key);
    if (mem && mem.blockedUntil && mem.blockedUntil > now) {
      const remainingSeconds = Math.ceil((mem.blockedUntil - now) / 1000);
      return {
        isAllowed: false,
        allowed: false,
        retryAfterSeconds: remainingSeconds,
        error: `Too many ${action} attempts. Please wait ${remainingSeconds} seconds before trying again.`,
      };
    }
  }

  const primaryKey = keys[0];
  let record = memoryStore.get(primaryKey);

  if (!record || record.windowEnd < now) {
    record = {
      count: 1,
      windowEnd: now + windowSeconds * 1000,
      blockedUntil: null,
    };
    memoryStore.set(primaryKey, record);
  } else {
    record.count += 1;
    if (record.count > maxAttempts) {
      record.blockedUntil = now + blockDurationSeconds * 1000;
      memoryStore.set(primaryKey, record);

      try {
        await queryDb(
          `INSERT INTO security_rate_limits (rate_key, hit_count, window_start, blocked_until, updated_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ($3 || ' seconds')::INTERVAL, CURRENT_TIMESTAMP)
           ON CONFLICT (rate_key) DO UPDATE 
           SET hit_count = security_rate_limits.hit_count + 1,
               blocked_until = CURRENT_TIMESTAMP + ($3 || ' seconds')::INTERVAL,
               updated_at = CURRENT_TIMESTAMP`,
          [primaryKey, record.count, blockDurationSeconds]
        );

        await queryDb(
          `INSERT INTO security_attack_logs (ip_address, user_agent, endpoint, attack_type, severity, payload_sample, blocked_until)
           VALUES ($1, 'RateLimiter', $2, 'rate_limit_exceeded', 'MEDIUM', $3, CURRENT_TIMESTAMP + ($4 || ' seconds')::INTERVAL)`,
          [ip, action, `Threshold exceeded: ${record.count} attempts in ${windowSeconds}s`, blockDurationSeconds]
        );
      } catch (_) {}

      return {
        isAllowed: false,
        allowed: false,
        retryAfterSeconds: blockDurationSeconds,
        error: `Too many requests. For security reasons, please wait ${Math.ceil(blockDurationSeconds / 60)} minutes before trying again.`,
      };
    }
  }

  return { isAllowed: true, allowed: true };
}

export async function checkAccountLockout({ table, id, identifier }) {
  try {
    let res;
    if (id) {
      res = await queryDb(
        `SELECT id, failed_login_attempts, locked_until FROM ${table} WHERE id = $1 LIMIT 1`,
        [id]
      );
    } else if (identifier) {
      const cleanEmail = identifier.toLowerCase().trim();
      const raw = identifier.trim();
      const phoneDigits = raw.replace(/\D/g, '');
      res = await queryDb(
        `SELECT id, failed_login_attempts, locked_until FROM ${table} 
         WHERE LOWER(email) = $1 
            OR phone = $2 
            OR (LENGTH($3) >= 8 AND RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = RIGHT($3, 10))
         LIMIT 1`,
        [cleanEmail, raw, phoneDigits]
      );
    }

    if (!res || res.rows.length === 0) {
      return { isLocked: false };
    }

    const account = res.rows[0];
    if (account.locked_until) {
      const lockedUntilDate = new Date(account.locked_until);
      const now = new Date();
      if (lockedUntilDate > now) {
        const remainingSeconds = Math.ceil((lockedUntilDate.getTime() - now.getTime()) / 1000);
        const remainingMinutes = Math.ceil(remainingSeconds / 60);
        return {
          isLocked: true,
          lockedUntil: lockedUntilDate,
          remainingSeconds,
          remainingMinutes,
          error: `Account is temporarily locked due to multiple failed login attempts. Please wait ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''} or reset your password.`,
        };
      } else {
        await queryDb(
          `UPDATE ${table} SET locked_until = NULL, failed_login_attempts = 0 WHERE id = $1`,
          [account.id]
        );
      }
    }

    return { isLocked: false, accountId: account.id, failedAttempts: account.failed_login_attempts || 0 };
  } catch (err) {
    return { isLocked: false };
  }
}

export async function recordFailedLogin({
  table,
  id,
  ip = '127.0.0.1',
  userAgent = 'Unknown',
  reason = 'Incorrect password',
  maxFailedAttempts = 5,
  lockoutMinutes = 15,
}) {
  try {
    const activityTable = table === 'creators' ? 'creator_login_activities' : 'developer_login_activities';
    const fkColumn = table === 'creators' ? 'creator_id' : 'developer_id';

    const updateRes = await queryDb(
      `UPDATE ${table} 
       SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
           locked_until = CASE 
             WHEN COALESCE(failed_login_attempts, 0) + 1 >= $1 
             THEN CURRENT_TIMESTAMP + ($2 || ' minutes')::INTERVAL 
             ELSE locked_until 
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING failed_login_attempts, locked_until`,
      [maxFailedAttempts, lockoutMinutes, id]
    );

    const attempts = updateRes.rows[0]?.failed_login_attempts || 1;
    const isLockedNow = attempts >= maxFailedAttempts;

    await queryDb(
      `INSERT INTO ${activityTable} (${fkColumn}, ip_address, user_agent, status, failure_reason)
       VALUES ($1, $2, $3, 'Failed', $4)`,
      [id, ip, userAgent, isLockedNow ? `Account locked (${lockoutMinutes} min) - ${reason}` : reason]
    );

    if (isLockedNow) {
      await queryDb(
        `INSERT INTO security_attack_logs (ip_address, user_agent, endpoint, attack_type, severity, payload_sample, blocked_until)
         VALUES ($1, $2, '${table}_login', 'account_lockout', 'HIGH', $3, CURRENT_TIMESTAMP + ($4 || ' minutes')::INTERVAL)`,
        [ip, userAgent, `Account #${id} locked after ${attempts} failed attempts`, lockoutMinutes]
      );

      return {
        isLockedNow: true,
        remainingMinutes: lockoutMinutes,
        error: `Account is now temporarily locked for ${lockoutMinutes} minutes due to ${attempts} consecutive failed attempts.`,
      };
    }

    const remaining = maxFailedAttempts - attempts;
    return {
      isLockedNow: false,
      remainingAttempts: remaining,
      warning: remaining <= 2 ? `${remaining} attempt${remaining === 1 ? '' : 's'} remaining before account lockout.` : undefined,
    };
  } catch (err) {
    return { isLockedNow: false };
  }
}

export async function recordSuccessfulLogin({ table, id, ip = '127.0.0.1', userAgent = 'Unknown' }) {
  try {
    const activityTable = table === 'creators' ? 'creator_login_activities' : 'developer_login_activities';
    const fkColumn = table === 'creators' ? 'creator_id' : 'developer_id';

    await queryDb(
      `UPDATE ${table} 
       SET failed_login_attempts = 0, 
           locked_until = NULL, 
           last_login_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [id]
    );

    await queryDb(
      `INSERT INTO ${activityTable} (${fkColumn}, ip_address, user_agent, status)
       VALUES ($1, $2, $3, 'Success')`,
      [id, ip, userAgent]
    );
  } catch (_) {}
}

export async function enforceOtpCooldown({ ip, identifier, action = 'otp_request', minIntervalSeconds = 60, maxPerHour = 5 }) {
  const cleanId = String(identifier || '').toLowerCase().trim();
  const now = Date.now();
  const cooldownKey = `cooldown:${ip}:${cleanId}:${action}`;
  const hourlyKey = `hourly:${cleanId}:${action}`;

  const cooldown = memoryStore.get(cooldownKey);
  if (cooldown && cooldown.expiresAt > now) {
    const waitSeconds = Math.ceil((cooldown.expiresAt - now) / 1000);
    return {
      isAllowed: false,
      allowed: false,
      waitSeconds,
      error: `Please wait ${waitSeconds} seconds before requesting another code.`,
    };
  }

  let hourly = memoryStore.get(hourlyKey);
  if (!hourly || hourly.windowEnd < now) {
    hourly = { count: 1, windowEnd: now + 3600000 };
    memoryStore.set(hourlyKey, hourly);
  } else {
    hourly.count += 1;
    if (hourly.count > maxPerHour) {
      const waitMinutes = Math.ceil((hourly.windowEnd - now) / 60000);
      return {
        isAllowed: false,
        allowed: false,
        waitMinutes,
        error: `Maximum verification code requests reached. Please wait ${waitMinutes} minutes or contact support.`,
      };
    }
  }

  memoryStore.set(cooldownKey, { expiresAt: now + minIntervalSeconds * 1000 });
  return { isAllowed: true, allowed: true };
}
