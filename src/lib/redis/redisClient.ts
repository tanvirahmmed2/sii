import Redis from 'ioredis';
import { createHash } from 'crypto';
import { queryDb } from '../database/db';
import { getCurrentYearMonth, getWebsiteMonthlyUsageAndLimits } from '../database/usageLimiter';
import {
  AllowedDeveloperModule,
  filterDeveloperModules,
  getAllowedDeveloperLinks,
} from '../developer/navModules';

interface CacheEntry {
  value: string;
  expiresAt: number;
}

interface GlobalRedisState {
  client: Redis | null;
  available: boolean;
  initAttempted: boolean;
  lastAttemptAt: number;
  connectPromise: Promise<boolean> | null;
  l1Cache: Map<string, CacheEntry>;
  l1TagIndex: Map<string, Set<string>>;
  inFlight: Map<string, Promise<any>>;
}

const g = globalThis as typeof globalThis & { __platformRedisState?: GlobalRedisState };

function getState(): GlobalRedisState {
  if (!g.__platformRedisState) {
    g.__platformRedisState = {
      client: null,
      available: false,
      initAttempted: false,
      lastAttemptAt: 0,
      connectPromise: null,
      l1Cache: new Map<string, CacheEntry>(),
      l1TagIndex: new Map<string, Set<string>>(),
      inFlight: new Map<string, Promise<any>>(),
    };
  }
  return g.__platformRedisState;
}

const RECONNECT_COOLDOWN_MS = 15000;
const L1_MAX_ENTRIES = 2500;

function l1Get(key: string): string | null {
  const state = getState();
  const entry = state.l1Cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    state.l1Cache.delete(key);
    return null;
  }
  return entry.value;
}

function l1Set(key: string, value: string, ttlSeconds: number): void {
  const state = getState();
  if (state.l1Cache.size >= L1_MAX_ENTRIES) {
    const firstKey = state.l1Cache.keys().next().value;
    if (firstKey !== undefined) {
      state.l1Cache.delete(firstKey);
    }
  }
  state.l1Cache.set(key, {
    value,
    expiresAt: Date.now() + Math.max(1, ttlSeconds) * 1000,
  });
}

function l1Delete(patternOrKey: string): void {
  const state = getState();
  if (!patternOrKey.includes('*')) {
    state.l1Cache.delete(patternOrKey);
    return;
  }
  const escaped = patternOrKey.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  const regex = new RegExp(`^${escaped}$`);
  for (const key of Array.from(state.l1Cache.keys())) {
    if (regex.test(key)) {
      state.l1Cache.delete(key);
    }
  }
}

function createRedisConnection(state: GlobalRedisState): Redis | null {
  try {
    const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 1200,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    });

    client.on('error', () => {
      state.available = false;
    });

    client.on('close', () => {
      state.available = false;
    });

    client.on('end', () => {
      state.available = false;
    });

    client.on('ready', () => {
      state.available = true;
    });

    client.on('connect', () => {
      state.available = true;
    });

    return client;
  } catch {
    state.available = false;
    return null;
  }
}

export async function ensureRedisReady(): Promise<Redis | null> {
  const state = getState();
  if (state.available && state.client && state.client.status === 'ready') {
    return state.client;
  }
  if (state.connectPromise) {
    await state.connectPromise;
    return state.available ? state.client : null;
  }
  const now = Date.now();
  if (state.initAttempted && now - state.lastAttemptAt < RECONNECT_COOLDOWN_MS) {
    return state.available ? state.client : null;
  }

  state.initAttempted = true;
  state.lastAttemptAt = now;

  if (!state.client || state.client.status === 'end' || state.client.status === 'close') {
    if (state.client) {
      try {
        state.client.disconnect();
      } catch {}
    }
    state.client = createRedisConnection(state);
  }

  const client = state.client;
  if (!client) return null;

  state.connectPromise = new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      state.available = false;
      resolve(false);
    }, 900);

    client
      .connect()
      .then(() => {
        clearTimeout(timer);
        state.available = true;
        resolve(true);
      })
      .catch(() => {
        clearTimeout(timer);
        state.available = false;
        resolve(false);
      });
  }).finally(() => {
    state.connectPromise = null;
  });

  await state.connectPromise;
  return state.available ? state.client : null;
}

export function getRedisClient(): Redis | null {
  const state = getState();
  if (state.initAttempted) {
    if (!state.available && Date.now() - state.lastAttemptAt >= RECONNECT_COOLDOWN_MS) {
      ensureRedisReady().catch(() => {});
    }
    return state.client;
  }
  state.initAttempted = true;
  state.lastAttemptAt = Date.now();
  state.client = createRedisConnection(state);
  if (state.client) {
    state.client
      .connect()
      .then(() => {
        state.available = true;
      })
      .catch(() => {
        state.available = false;
      });
  }
  return state.client;
}

export function isRedisConnected(): boolean {
  const state = getState();
  return Boolean(state.available && state.client && state.client.status === 'ready');
}

export interface RecordSentSmsParams {
  websiteId: string | number;
  recipientType?: string;
  recipientId?: string | number | null;
  recipientIdentifier: string;
  recipientName?: string | null;
  type?: string;
  message?: string;
  status?: string;
  failureReason?: string | null;
  provider?: string;
  partsCount?: number | string;
}

export async function recordSentSms({
  websiteId,
  recipientType = 'other',
  recipientId = null,
  recipientIdentifier,
  recipientName = null,
  type = 'notification',
  message,
  status = 'Sent',
  failureReason = null,
  provider = 'zendsms',
  partsCount = 1,
}: RecordSentSmsParams): Promise<any> {
  if (!websiteId || !recipientIdentifier) return null;
  const yearMonth = getCurrentYearMonth();
  const count = Math.max(1, parseInt(String(partsCount), 10) || 1);
  const normalizedType = String(type || 'notification').toLowerCase().trim();
  const normalizedRole = String(recipientType || 'other').toLowerCase().trim();

  let insertedRow = null;
  try {
    const insertRes = await queryDb(
      `INSERT INTO website_sent_sms (
        website_id, recipient_type, recipient_id, recipient_identifier,
        recipient_name, type, message, status, failure_reason,
        provider, parts_count, year_month
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        websiteId,
        normalizedRole,
        recipientId ? Number(recipientId) : null,
        String(recipientIdentifier).trim(),
        recipientName ? String(recipientName).trim() : null,
        normalizedType,
        String(message || '').trim(),
        String(status || 'Sent'),
        failureReason ? String(failureReason) : null,
        String(provider || 'zendsms'),
        count,
        yearMonth,
      ]
    );
    insertedRow = insertRes.rows[0] || null;
  } catch (err: any) {
    console.error('Error inserting into website_sent_sms:', err.message);
  }

  try {
    await queryDb(
      `INSERT INTO website_monthly_usages (website_id, year_month, mail_count, sms_count)
       VALUES ($1, $2, 0, $3)
       ON CONFLICT (website_id, year_month)
       DO UPDATE SET
         sms_count = website_monthly_usages.sms_count + EXCLUDED.sms_count,
         updated_at = CURRENT_TIMESTAMP`,
      [websiteId, yearMonth, count]
    );
  } catch (err: any) {
    console.error('Error updating monthly usage for SMS:', err.message);
  }

  try {
    const client = getRedisClient();
    if (client && isRedisConnected()) {
      const monthKey = `tenant:${websiteId}:sms:${yearMonth}`;
      const roleKey = `tenant:${websiteId}:sms:${yearMonth}:roles`;
      const typeKey = `tenant:${websiteId}:sms:${yearMonth}:types`;

      await Promise.all([
        client.incrby(monthKey, count),
        client.hincrby(roleKey, normalizedRole, count),
        client.hincrby(typeKey, normalizedType, count),
        client.expire(monthKey, 60 * 24 * 60 * 60),
        client.expire(roleKey, 60 * 24 * 60 * 60),
        client.expire(typeKey, 60 * 24 * 60 * 60),
      ]);
    }
  } catch { }

  return insertedRow;
}

export interface RecordSentMailParams {
  websiteId: string | number;
  recipientType?: string;
  recipientId?: string | number | null;
  recipientIdentifier: string;
  recipientName?: string | null;
  type?: string;
  subject?: string;
  content?: string | null;
  status?: string;
  failureReason?: string | null;
  provider?: string;
}

export async function recordSentMail({
  websiteId,
  recipientType = 'other',
  recipientId = null,
  recipientIdentifier,
  recipientName = null,
  type = 'notification',
  subject,
  content = null,
  status = 'Sent',
  failureReason = null,
  provider = 'brevo',
}: RecordSentMailParams): Promise<any> {
  if (!websiteId || !recipientIdentifier) return null;
  const yearMonth = getCurrentYearMonth();
  const normalizedType = String(type || 'notification').toLowerCase().trim();
  const normalizedRole = String(recipientType || 'other').toLowerCase().trim();

  let insertedRow = null;
  try {
    const insertRes = await queryDb(
      `INSERT INTO website_sent_mails (
        website_id, recipient_type, recipient_id, recipient_identifier,
        recipient_name, type, subject, content, status, failure_reason,
        provider, year_month
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        websiteId,
        normalizedRole,
        recipientId ? Number(recipientId) : null,
        String(recipientIdentifier).trim(),
        recipientName ? String(recipientName).trim() : null,
        normalizedType,
        String(subject || 'Institutional Notification').trim(),
        content ? String(content).trim() : null,
        String(status || 'Sent'),
        failureReason ? String(failureReason) : null,
        String(provider || 'brevo'),
        yearMonth,
      ]
    );
    insertedRow = insertRes.rows[0] || null;
  } catch (err: any) {
    console.error('Error inserting into website_sent_mails:', err.message);
  }

  try {
    await queryDb(
      `INSERT INTO website_monthly_usages (website_id, year_month, mail_count, sms_count)
       VALUES ($1, $2, 1, 0)
       ON CONFLICT (website_id, year_month)
       DO UPDATE SET
         mail_count = website_monthly_usages.mail_count + EXCLUDED.mail_count,
         updated_at = CURRENT_TIMESTAMP`,
      [websiteId, yearMonth]
    );
  } catch (err: any) {
    console.error('Error updating monthly usage for Mail:', err.message);
  }

  try {
    const client = getRedisClient();
    if (client && isRedisConnected()) {
      const monthKey = `tenant:${websiteId}:mail:${yearMonth}`;
      const roleKey = `tenant:${websiteId}:mail:${yearMonth}:roles`;
      const typeKey = `tenant:${websiteId}:mail:${yearMonth}:types`;

      await Promise.all([
        client.incrby(monthKey, 1),
        client.hincrby(roleKey, normalizedRole, 1),
        client.hincrby(typeKey, normalizedType, 1),
        client.expire(monthKey, 60 * 24 * 60 * 60),
        client.expire(roleKey, 60 * 24 * 60 * 60),
        client.expire(typeKey, 60 * 24 * 60 * 60),
      ]);
    }
  } catch { }

  return insertedRow;
}

export async function getMonthlySmsAnalytics(websiteId: string | number, targetYearMonth: string | null = null): Promise<any> {
  const yearMonth = targetYearMonth || getCurrentYearMonth();
  const limits = await getWebsiteMonthlyUsageAndLimits(websiteId);
  const monthlyQuota = limits.monthlySms || 200;
  const packageName = limits.packageName || 'Standard';

  let usedSms = 0;
  let roleBreakdown: Record<string, number> = { student: 0, teacher: 0, officer: 0, staff: 0, applicant: 0, other: 0 };
  let typeBreakdown: Record<string, number> = {};
  let redisUsed = false;

  try {
    const client = getRedisClient();
    if (client && isRedisConnected()) {
      const monthKey = `tenant:${websiteId}:sms:${yearMonth}`;
      const roleKey = `tenant:${websiteId}:sms:${yearMonth}:roles`;
      const typeKey = `tenant:${websiteId}:sms:${yearMonth}:types`;

      const [cachedCount, cachedRoles, cachedTypes] = await Promise.all([
        client.get(monthKey),
        client.hgetall(roleKey),
        client.hgetall(typeKey),
      ]);

      if (cachedCount !== null) {
        usedSms = parseInt(cachedCount, 10) || 0;
        if (cachedRoles && typeof cachedRoles === 'object') {
          for (const [r, cnt] of Object.entries(cachedRoles)) {
            roleBreakdown[r] = (roleBreakdown[r] || 0) + (parseInt(cnt, 10) || 0);
          }
        }
        if (cachedTypes && typeof cachedTypes === 'object') {
          for (const [t, cnt] of Object.entries(cachedTypes)) {
            typeBreakdown[t] = parseInt(cnt, 10) || 0;
          }
        }
        redisUsed = true;
      }
    }
  } catch { }

  if (!redisUsed) {
    try {
      const dbUsageRes = await queryDb(
        `SELECT sms_count FROM website_monthly_usages WHERE website_id = $1 AND year_month = $2 LIMIT 1`,
        [websiteId, yearMonth]
      );
      usedSms = parseInt(dbUsageRes.rows[0]?.sms_count, 10) || 0;

      const roleRes = await queryDb(
        `SELECT recipient_type, SUM(parts_count) as total
         FROM website_sent_sms
         WHERE website_id = $1 AND year_month = $2
         GROUP BY recipient_type`,
        [websiteId, yearMonth]
      );
      roleRes.rows.forEach((r: any) => {
        const key = r.recipient_type || 'other';
        roleBreakdown[key] = (roleBreakdown[key] || 0) + (parseInt(r.total, 10) || 0);
      });

      const typeRes = await queryDb(
        `SELECT type, SUM(parts_count) as total
         FROM website_sent_sms
         WHERE website_id = $1 AND year_month = $2
         GROUP BY type`,
        [websiteId, yearMonth]
      );
      typeRes.rows.forEach((t: any) => {
        typeBreakdown[t.type] = parseInt(t.total, 10) || 0;
      });

      try {
        const client = getRedisClient();
        if (client && isRedisConnected()) {
          const monthKey = `tenant:${websiteId}:sms:${yearMonth}`;
          const roleKey = `tenant:${websiteId}:sms:${yearMonth}:roles`;
          const typeKey = `tenant:${websiteId}:sms:${yearMonth}:types`;

          await client.set(monthKey, usedSms, 'EX', 60 * 24 * 60 * 60);
          const roleEntries = Object.entries(roleBreakdown).filter(([_, v]) => v > 0);
          if (roleEntries.length > 0) {
            await client.hset(roleKey, Object.fromEntries(roleEntries));
            await client.expire(roleKey, 60 * 24 * 60 * 60);
          }
          const typeEntries = Object.entries(typeBreakdown).filter(([_, v]) => v > 0);
          if (typeEntries.length > 0) {
            await client.hset(typeKey, Object.fromEntries(typeEntries));
            await client.expire(typeKey, 60 * 24 * 60 * 60);
          }
        }
      } catch { }
    } catch (err: any) {
      console.error('Error fetching SMS analytics from DB:', err.message);
    }
  }

  const remainingSms = Math.max(0, monthlyQuota - usedSms);
  const usagePercentage = monthlyQuota > 0 ? Math.min(100, Math.round((usedSms / monthlyQuota) * 100)) : 0;

  return {
    yearMonth,
    packageName,
    monthlyQuota,
    usedSms,
    remainingSms,
    usagePercentage,
    roleBreakdown,
    typeBreakdown,
    redisConnected: isRedisConnected(),
  };
}

export async function getMonthlyMailAnalytics(websiteId: string | number, targetYearMonth: string | null = null): Promise<any> {
  const yearMonth = targetYearMonth || getCurrentYearMonth();
  const limits = await getWebsiteMonthlyUsageAndLimits(websiteId);
  const monthlyQuota = limits.monthlyMail || 1000;
  const packageName = limits.packageName || 'Standard';

  let usedMail = 0;
  let roleBreakdown: Record<string, number> = { student: 0, teacher: 0, officer: 0, staff: 0, applicant: 0, other: 0 };
  let typeBreakdown: Record<string, number> = {};
  let redisUsed = false;

  try {
    const client = getRedisClient();
    if (client && isRedisConnected()) {
      const monthKey = `tenant:${websiteId}:mail:${yearMonth}`;
      const roleKey = `tenant:${websiteId}:mail:${yearMonth}:roles`;
      const typeKey = `tenant:${websiteId}:mail:${yearMonth}:types`;

      const [cachedCount, cachedRoles, cachedTypes] = await Promise.all([
        client.get(monthKey),
        client.hgetall(roleKey),
        client.hgetall(typeKey),
      ]);

      if (cachedCount !== null) {
        usedMail = parseInt(cachedCount, 10) || 0;
        if (cachedRoles && typeof cachedRoles === 'object') {
          for (const [r, cnt] of Object.entries(cachedRoles)) {
            roleBreakdown[r] = (roleBreakdown[r] || 0) + (parseInt(cnt, 10) || 0);
          }
        }
        if (cachedTypes && typeof cachedTypes === 'object') {
          for (const [t, cnt] of Object.entries(cachedTypes)) {
            typeBreakdown[t] = parseInt(cnt, 10) || 0;
          }
        }
        redisUsed = true;
      }
    }
  } catch { }

  if (!redisUsed) {
    try {
      const dbUsageRes = await queryDb(
        `SELECT mail_count FROM website_monthly_usages WHERE website_id = $1 AND year_month = $2 LIMIT 1`,
        [websiteId, yearMonth]
      );
      usedMail = parseInt(dbUsageRes.rows[0]?.mail_count, 10) || 0;

      const roleRes = await queryDb(
        `SELECT recipient_type, COUNT(*) as total
         FROM website_sent_mails
         WHERE website_id = $1 AND year_month = $2
         GROUP BY recipient_type`,
        [websiteId, yearMonth]
      );
      roleRes.rows.forEach((r: any) => {
        const key = r.recipient_type || 'other';
        roleBreakdown[key] = (roleBreakdown[key] || 0) + (parseInt(r.total, 10) || 0);
      });

      const typeRes = await queryDb(
        `SELECT type, COUNT(*) as total
         FROM website_sent_mails
         WHERE website_id = $1 AND year_month = $2
         GROUP BY type`,
        [websiteId, yearMonth]
      );
      typeRes.rows.forEach((t: any) => {
        typeBreakdown[t.type] = parseInt(t.total, 10) || 0;
      });

      try {
        const client = getRedisClient();
        if (client && isRedisConnected()) {
          const monthKey = `tenant:${websiteId}:mail:${yearMonth}`;
          const roleKey = `tenant:${websiteId}:mail:${yearMonth}:roles`;
          const typeKey = `tenant:${websiteId}:mail:${yearMonth}:types`;

          await client.set(monthKey, usedMail, 'EX', 60 * 24 * 60 * 60);
          const roleEntries = Object.entries(roleBreakdown).filter(([_, v]) => v > 0);
          if (roleEntries.length > 0) {
            await client.hset(roleKey, Object.fromEntries(roleEntries));
            await client.expire(roleKey, 60 * 24 * 60 * 60);
          }
          const typeEntries = Object.entries(typeBreakdown).filter(([_, v]) => v > 0);
          if (typeEntries.length > 0) {
            await client.hset(typeKey, Object.fromEntries(typeEntries));
            await client.expire(typeKey, 60 * 24 * 60 * 60);
          }
        }
      } catch { }
    } catch (err: any) {
      console.error('Error fetching Mail analytics from DB:', err.message);
    }
  }

  const remainingMail = Math.max(0, monthlyQuota - usedMail);
  const usagePercentage = monthlyQuota > 0 ? Math.min(100, Math.round((usedMail / monthlyQuota) * 100)) : 0;

  return {
    yearMonth,
    packageName,
    monthlyQuota,
    usedMail,
    remainingMail,
    usagePercentage,
    roleBreakdown,
    typeBreakdown,
    redisConnected: isRedisConnected(),
  };
}

export function hashSessionToken(token: string): string {
  return createHash('sha1').update(String(token || '')).digest('hex').slice(0, 24);
}

export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  const ttl = Math.max(1, Number(ttlSeconds) || 300);
  try {
    const client = await ensureRedisReady();
    if (client && isRedisConnected()) {
      const cached = await client.get(key);
      if (cached !== null && cached !== undefined) {
        try {
          return JSON.parse(cached) as T;
        } catch {
          return cached as unknown as T;
        }
      }
    } else {
      const memCached = l1Get(key);
      if (memCached !== null) {
        try {
          return JSON.parse(memCached) as T;
        } catch {
          return memCached as unknown as T;
        }
      }
    }
  } catch {}

  const state = getState();
  const existingPromise = state.inFlight.get(key);
  if (existingPromise) {
    return existingPromise as Promise<T>;
  }

  const runPromise = (async () => {
    const result = await fetcher();
    if (result !== undefined && result !== null) {
      const payload = typeof result === 'string' ? result : JSON.stringify(result);
      l1Set(key, payload, ttl);
      try {
        const client = await ensureRedisReady();
        if (client && isRedisConnected()) {
          await client.set(key, payload, 'EX', ttl);
        }
      } catch {}
    }
    return result;
  })().finally(() => {
    state.inFlight.delete(key);
  });

  state.inFlight.set(key, runPromise);
  return runPromise;
}

export async function invalidateCache(patternOrKey: string): Promise<void> {
  l1Delete(patternOrKey);
  try {
    const client = await ensureRedisReady();
    if (!client || !isRedisConnected()) return;
    if (patternOrKey.includes('*')) {
      const keys = await client.keys(patternOrKey);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } else {
      await client.del(patternOrKey);
    }
  } catch {}
}

export async function shouldTouchSessionActivity(
  scope: string,
  token: string,
  intervalSeconds: number = 300
): Promise<boolean> {
  if (!token) return false;
  const key = `sess:touch:${scope}:${hashSessionToken(token)}`;
  const cached = l1Get(key);
  if (cached !== null) return false;
  try {
    const client = await ensureRedisReady();
    if (client && isRedisConnected()) {
      const res = await client.set(key, '1', 'EX', intervalSeconds, 'NX');
      if (res === null) {
        l1Set(key, '1', Math.min(intervalSeconds, 60));
        return false;
      }
      l1Set(key, '1', intervalSeconds);
      return true;
    }
  } catch {}
  l1Set(key, '1', intervalSeconds);
  return true;
}

function registerL1Tag(tagKey: string, sessionKey: string): void {
  const state = getState();
  let set = state.l1TagIndex.get(tagKey);
  if (!set) {
    set = new Set<string>();
    state.l1TagIndex.set(tagKey, set);
  }
  set.add(sessionKey);
}

export async function fetchPanelSession<T>(
  panel: 'developer' | 'creator' | 'staff' | 'teacher' | 'student',
  token: string,
  indexTags: string[],
  fetcher: () => Promise<T | null>,
  ttlSeconds: number = 180
): Promise<T | null> {
  if (!token) return null;
  const tokenHash = hashSessionToken(token);
  const sessionKey = `auth:panel:${panel}:tok:${tokenHash}`;
  const result = await fetchWithCache<T | null>(sessionKey, fetcher, ttlSeconds);
  if (result) {
    const normalizedTags = (indexTags || []).filter(Boolean);
    for (const tag of normalizedTags) {
      const tagKey = `auth:panel:${panel}:tag:${tag}`;
      registerL1Tag(tagKey, sessionKey);
      try {
        const client = getRedisClient();
        if (client && isRedisConnected()) {
          client.sadd(tagKey, sessionKey).catch(() => {});
          client.expire(tagKey, Math.max(ttlSeconds * 2, 600)).catch(() => {});
        }
      } catch {}
    }
  }
  return result;
}

export async function invalidatePanelSessionByToken(
  panel: 'developer' | 'creator' | 'staff' | 'teacher' | 'student',
  token: string
): Promise<void> {
  if (!token) return;
  const key = `auth:panel:${panel}:tok:${hashSessionToken(token)}`;
  await invalidateCache(key);
}

export async function invalidatePanelSessionsByTag(
  panel: 'developer' | 'creator' | 'staff' | 'teacher' | 'student',
  tag: string
): Promise<void> {
  if (!tag) return;
  const state = getState();
  const tagKey = `auth:panel:${panel}:tag:${tag}`;
  const l1Keys = state.l1TagIndex.get(tagKey);
  if (l1Keys) {
    for (const k of l1Keys) {
      state.l1Cache.delete(k);
    }
    state.l1TagIndex.delete(tagKey);
  }
  try {
    const client = await ensureRedisReady();
    if (client && isRedisConnected()) {
      const members = await client.smembers(tagKey);
      if (members && members.length > 0) {
        for (const k of members) {
          state.l1Cache.delete(k);
        }
        await client.del(...members, tagKey);
      } else {
        await client.del(tagKey);
      }
    }
  } catch {}
}

export async function clearPanelSessions(
  panel: 'developer' | 'creator' | 'staff' | 'teacher' | 'student'
): Promise<void> {
  await invalidateCache(`auth:panel:${panel}:*`);
}

export async function fetchCreatorCredential(identifier: string, fetcher: () => Promise<any>): Promise<any> {
  const clean = String(identifier || '').trim().toLowerCase();
  const cacheKey = `auth:creator:ident:${clean}`;
  return fetchWithCache(cacheKey, fetcher, 300);
}

export async function fetchCreatorSessionById(id: number | string, fetcher: () => Promise<any>): Promise<any> {
  const cacheKey = `auth:creator:id:${id}`;
  return fetchWithCache(cacheKey, fetcher, 300);
}

export async function invalidateCreatorCache(id?: number | string, identifier?: string): Promise<void> {
  if (id) await invalidateCache(`auth:creator:id:${id}`);
  if (identifier) await invalidateCache(`auth:creator:ident:${String(identifier).trim().toLowerCase()}`);
  await invalidateCache('auth:creator:*');
}

export async function fetchDeveloperCredential(identifier: string, fetcher: () => Promise<any>): Promise<any> {
  const clean = String(identifier || '').trim().toLowerCase();
  const cacheKey = `auth:developer:ident:${clean}`;
  return fetchWithCache(cacheKey, fetcher, 300);
}

export async function fetchDeveloperSessionById(id: number | string, fetcher: () => Promise<any>): Promise<any> {
  const cacheKey = `auth:developer:id:${id}`;
  return fetchWithCache(cacheKey, fetcher, 300);
}

export async function invalidateDeveloperCache(id?: number | string, identifier?: string): Promise<void> {
  if (id) await invalidateCache(`auth:developer:id:${id}`);
  if (identifier) await invalidateCache(`auth:developer:ident:${String(identifier).trim().toLowerCase()}`);
  await invalidateCache('auth:developer:*');
}

export async function fetchDeveloperPermissions(
  devId: number | string,
  roleId: number | string | null,
  fetcher: () => Promise<any>
): Promise<any> {
  const cacheKey = `auth:dev:perms:${devId}:${roleId || 'norole'}`;
  return fetchWithCache(cacheKey, fetcher, 300);
}

export async function fetchDeveloperLoginSessionActive(
  devId: number | string,
  token: string,
  fetcher: () => Promise<{ active: boolean } | null>
): Promise<{ active: boolean } | null> {
  const tokenHash = hashSessionToken(token);
  const cacheKey = `auth:dev:sess:${devId}:${tokenHash}`;
  return fetchWithCache(cacheKey, fetcher, 180);
}

export async function invalidateDeveloperLoginSessionCache(devId?: number | string, token?: string): Promise<void> {
  if (devId && token) {
    await invalidateCache(`auth:dev:sess:${devId}:${hashSessionToken(token)}`);
  } else if (devId) {
    await invalidateCache(`auth:dev:sess:${devId}:*`);
  } else if (token) {
    await invalidateCache(`auth:dev:sess:*:${hashSessionToken(token)}`);
  } else {
    await invalidateCache('auth:dev:sess:*');
  }
}

export async function fetchActiveModuleSlugs(fetcher: () => Promise<string[]>): Promise<string[]> {
  return fetchWithCache('marketing:modules:active_slugs', fetcher, 300);
}

export async function invalidateDeveloperPermissionsCache(devId?: number | string): Promise<void> {
  if (devId) {
    await Promise.all([
      invalidateCache(`auth:developer:id:${devId}`),
      invalidateCache(`auth:dev:perms:${devId}:*`),
      invalidateCache(`dev:modules:allowed:${devId}:*`),
      invalidateCache(`dev:modules:search:${devId}:*`),
      invalidatePanelSessionsByTag('developer', `dev:${devId}`),
    ]);
  } else {
    await Promise.all([
      invalidateCache('auth:developer:*'),
      invalidateCache('auth:dev:perms:*'),
      invalidateCache('dev:modules:*'),
      invalidateCache('marketing:modules:*'),
      clearPanelSessions('developer'),
    ]);
  }
}

function getDeveloperPermissionHash(user: any): string {
  const perms = Array.isArray(user?.permissions)
    ? [...user.permissions].map((p) => String(p).toLowerCase().trim()).sort()
    : [];
  const raw = `${user?.id || 'anon'}:${user?.roleId || 'norole'}:${perms.join(',')}`;
  return createHash('sha1').update(raw).digest('hex').slice(0, 12);
}

/**
 * Searches the developer's allowed modules using Redis-backed per-user module indexes and query caches,
 * falling back to in-memory filtering if Redis is unavailable.
 */
export async function searchDeveloperModulesInRedis(
  user: any,
  query: string = ''
): Promise<{ modules: AllowedDeveloperModule[]; source: 'redis' | 'memory'; cached: boolean }> {
  const normalizedQuery = String(query || '').toLowerCase().trim().replace(/\s+/g, ' ');
  const userId = user?.id || 'anon';
  const permHash = getDeveloperPermissionHash(user);
  const allowedKey = `dev:modules:allowed:${userId}:${permHash}`;
  const queryKeySuffix = normalizedQuery
    ? createHash('sha1').update(normalizedQuery).digest('hex').slice(0, 16)
    : '_all';
  const searchKey = `dev:modules:search:${userId}:${permHash}:${queryKeySuffix}`;

  const state = getState();
  const l1Search = l1Get(searchKey);
  if (l1Search && !isRedisConnected()) {
    try {
      const parsed = JSON.parse(l1Search) as AllowedDeveloperModule[];
      if (Array.isArray(parsed)) {
        return { modules: parsed, source: 'memory', cached: true };
      }
    } catch {}
  }

  try {
    const client = await ensureRedisReady();
    if (client && isRedisConnected()) {
      const cachedSearch = await client.get(searchKey);
      if (cachedSearch) {
        try {
          const parsed = JSON.parse(cachedSearch) as AllowedDeveloperModule[];
          if (Array.isArray(parsed)) {
            l1Set(searchKey, cachedSearch, 120);
            return { modules: parsed, source: 'redis', cached: true };
          }
        } catch { }
      }

      let allowedModules: AllowedDeveloperModule[] | null = null;
      const cachedAllowed = await client.get(allowedKey);
      if (cachedAllowed) {
        try {
          const parsed = JSON.parse(cachedAllowed) as AllowedDeveloperModule[];
          if (Array.isArray(parsed)) {
            allowedModules = parsed;
          }
        } catch { }
      }

      if (!allowedModules) {
        allowedModules = getAllowedDeveloperLinks(user);
        const payload = JSON.stringify(allowedModules);
        l1Set(allowedKey, payload, 300);
        await client.set(allowedKey, payload, 'EX', 300);
      }

      const filtered = filterDeveloperModules(allowedModules, normalizedQuery);
      const filteredPayload = JSON.stringify(filtered);
      l1Set(searchKey, filteredPayload, 120);
      await client.set(searchKey, filteredPayload, 'EX', 120);
      return { modules: filtered, source: 'redis', cached: false };
    }
  } catch { }

  let allowed: AllowedDeveloperModule[] | null = null;
  const l1Allowed = l1Get(allowedKey);
  if (l1Allowed) {
    try {
      const parsed = JSON.parse(l1Allowed) as AllowedDeveloperModule[];
      if (Array.isArray(parsed)) allowed = parsed;
    } catch {}
  }
  if (!allowed) {
    allowed = getAllowedDeveloperLinks(user);
    l1Set(allowedKey, JSON.stringify(allowed), 300);
  }
  const filteredMem = filterDeveloperModules(allowed, normalizedQuery);
  l1Set(searchKey, JSON.stringify(filteredMem), 120);
  return {
    modules: filteredMem,
    source: state.l1Cache.has(allowedKey) ? 'memory' : 'memory',
    cached: false,
  };
}

export async function fetchModulesList(fetcher: () => Promise<any>): Promise<any> {
  const cacheKey = 'marketing:modules:active';
  return fetchWithCache(cacheKey, fetcher, 300);
}

export async function invalidateModulesCache(): Promise<void> {
  await invalidateCache('marketing:modules:*');
}

export async function fetchPackagesList(fetcher: () => Promise<any>): Promise<any> {
  const cacheKey = 'marketing:packages:public';
  return fetchWithCache(cacheKey, fetcher, 300);
}

export async function fetchPackageByIdOrSlug(idOrSlug: string | number, fetcher: () => Promise<any>): Promise<any> {
  const clean = String(idOrSlug).trim().toLowerCase();
  const cacheKey = `marketing:packages:single:${clean}`;
  return fetchWithCache(cacheKey, fetcher, 300);
}

export async function invalidatePackagesCache(): Promise<void> {
  await invalidateCache('marketing:packages:*');
}

export async function fetchCreatorWishlist(creatorId: number | string, fetcher: () => Promise<any>): Promise<any> {
  const cacheKey = `marketing:wishlist:${creatorId}`;
  return fetchWithCache(cacheKey, fetcher, 300);
}

export async function invalidateWishlistCache(creatorId: number | string): Promise<void> {
  await invalidateCache(`marketing:wishlist:${creatorId}`);
  await invalidateCache('marketing:wishlist:*');
}

export async function fetchPublicPromos(fetcher: () => Promise<any>): Promise<any> {
  const cacheKey = 'marketing:promos:public';
  return fetchWithCache(cacheKey, fetcher, 300);
}

export async function fetchPromoByCode(code: string, fetcher: () => Promise<any>): Promise<any> {
  const clean = String(code || '').trim().toUpperCase();
  const cacheKey = `marketing:promos:code:${clean}`;
  return fetchWithCache(cacheKey, fetcher, 300);
}

export async function invalidatePromosCache(): Promise<void> {
  await invalidateCache('marketing:promos:*');
}
