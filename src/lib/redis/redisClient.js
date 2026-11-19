import Redis from 'ioredis';
import { queryDb } from '../database/db.js';
import { getCurrentYearMonth, getWebsiteMonthlyUsageAndLimits } from '../database/usageLimiter.js';

let redisInstance = null;
let isRedisAvailable = false;
let redisInitAttempted = false;

export function getRedisClient() {
  if (redisInitAttempted) return redisInstance;
  redisInitAttempted = true;
  try {
    const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    redisInstance = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    });

    redisInstance.connect().then(() => {
      isRedisAvailable = true;
    }).catch(() => {
      isRedisAvailable = false;
    });

    redisInstance.on('error', () => {
      isRedisAvailable = false;
    });

    redisInstance.on('connect', () => {
      isRedisAvailable = true;
    });
  } catch {
    redisInstance = null;
    isRedisAvailable = false;
  }
  return redisInstance;
}

export function isRedisConnected() {
  return Boolean(isRedisAvailable && redisInstance);
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
}) {
  if (!websiteId || !recipientIdentifier) return null;
  const yearMonth = getCurrentYearMonth();
  const count = Math.max(1, parseInt(partsCount, 10) || 1);
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
  } catch (err) {
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
  } catch (err) {
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
  provider = 'resend',
}) {
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
        String(provider || 'resend'),
        yearMonth,
      ]
    );
    insertedRow = insertRes.rows[0] || null;
  } catch (err) {
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
  } catch (err) {
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

export async function getMonthlySmsAnalytics(websiteId, targetYearMonth = null) {
  const yearMonth = targetYearMonth || getCurrentYearMonth();
  const limits = await getWebsiteMonthlyUsageAndLimits(websiteId);
  const monthlyQuota = limits.monthlySms || 200;
  const packageName = limits.packageName || 'Standard';

  let usedSms = 0;
  let roleBreakdown = { student: 0, teacher: 0, officer: 0, staff: 0, applicant: 0, other: 0 };
  let typeBreakdown = {};
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
      roleRes.rows.forEach((r) => {
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
      typeRes.rows.forEach((t) => {
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
    } catch (err) {
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

export async function getMonthlyMailAnalytics(websiteId, targetYearMonth = null) {
  const yearMonth = targetYearMonth || getCurrentYearMonth();
  const limits = await getWebsiteMonthlyUsageAndLimits(websiteId);
  const monthlyQuota = limits.monthlyMail || 1000;
  const packageName = limits.packageName || 'Standard';

  let usedMail = 0;
  let roleBreakdown = { student: 0, teacher: 0, officer: 0, staff: 0, applicant: 0, other: 0 };
  let typeBreakdown = {};
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
      roleRes.rows.forEach((r) => {
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
      typeRes.rows.forEach((t) => {
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
    } catch (err) {
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
