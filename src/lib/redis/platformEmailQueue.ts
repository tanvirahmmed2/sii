import { createHash } from 'crypto';
import { queryDb } from '../database/db';
import { buildStyledEmail, sendEmail } from '../database/mailer';
import { getCurrentYearMonth } from '../database/usageLimiter';
import { getRedisClient, isRedisConnected, invalidateCache } from './redisClient';

export type EmailAudience = 'creators' | 'subscribers' | 'developers' | 'leads';

export interface AudienceRecipient {
  id: number | null;
  name: string;
  email: string;
  meta: string;
  is_active: boolean;
  status: string;
  created_at?: string | null;
}

export interface EmailCampaignRecord {
  id: string;
  audience: EmailAudience;
  subject: string;
  purpose: string;
  total: number;
  sent: number;
  failed: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  engine: 'redis' | 'memory';
  created_by: string;
  created_at: string;
  completed_at?: string | null;
}

const memoryCampaignStore = new Map<string, EmailCampaignRecord>();
const memoryCampaignHistory = new Map<EmailAudience, string[]>();

const AUDIENCE_USER_TYPE_MAP: Record<EmailAudience, string> = {
  creators: 'creator',
  subscribers: 'subscriber',
  developers: 'developer',
  leads: 'lead',
};

export function normalizeAudience(value: string | null | undefined): EmailAudience | null {
  const clean = String(value || '').toLowerCase().trim();
  if (clean === 'creators' || clean === 'creator') return 'creators';
  if (clean === 'subscribers' || clean === 'subscriber') return 'subscribers';
  if (clean === 'developers' || clean === 'developer') return 'developers';
  if (clean === 'leads' || clean === 'lead') return 'leads';
  return null;
}

export function getSingularAudienceUserType(audience: EmailAudience): string {
  return AUDIENCE_USER_TYPE_MAP[audience];
}

export async function fetchAudienceRecipients(
  audience: EmailAudience,
  forceRefresh: boolean = false
): Promise<{ recipients: AudienceRecipient[]; source: 'redis' | 'database' }> {
  const cacheKey = `email:audience:${audience}:recipients`;

  if (!forceRefresh) {
    try {
      const client = getRedisClient();
      if (client && isRedisConnected()) {
        const cached = await client.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            return { recipients: parsed, source: 'redis' };
          }
        }
      }
    } catch {}
  }

  let rows: any[] = [];
  if (audience === 'creators') {
    const res = await queryDb(
      `SELECT id, name, email, phone, country, is_active, email_verified, created_at
       FROM creators
       ORDER BY id DESC`
    ).catch(() => ({ rows: [] }));
    rows = res.rows.map((r: any) => ({
      id: Number(r.id),
      name: r.name || r.email,
      email: String(r.email || '').trim().toLowerCase(),
      meta: [r.phone, r.country].filter(Boolean).join(' · ') || 'Creator account',
      is_active: r.is_active !== false,
      status: r.is_active === false ? 'INACTIVE' : r.email_verified ? 'VERIFIED' : 'ACTIVE',
      created_at: r.created_at || null,
    }));
  } else if (audience === 'subscribers') {
    const res = await queryDb(
      `SELECT id, name, email, source, is_active, subscribed_at AS created_at
       FROM subscribers
       ORDER BY id DESC`
    ).catch(() => ({ rows: [] }));
    rows = res.rows.map((r: any) => ({
      id: Number(r.id),
      name: r.name || r.email,
      email: String(r.email || '').trim().toLowerCase(),
      meta: r.source || 'website',
      is_active: r.is_active !== false,
      status: r.is_active === false ? 'UNSUBSCRIBED' : 'SUBSCRIBED',
      created_at: r.created_at || null,
    }));
  } else if (audience === 'developers') {
    const res = await queryDb(
      `SELECT d.id, d.name, d.email, d.phone, d.is_active, COALESCE(r.name, 'Developer') AS role_name, d.created_at
       FROM developers d
       LEFT JOIN developer_roles r ON d.role_id = r.id
       ORDER BY d.id DESC`
    ).catch(() => ({ rows: [] }));
    rows = res.rows.map((r: any) => ({
      id: Number(r.id),
      name: r.name || r.email,
      email: String(r.email || '').trim().toLowerCase(),
      meta: r.role_name || 'Developer',
      is_active: r.is_active !== false,
      status: r.is_active === false ? 'INACTIVE' : 'ACTIVE',
      created_at: r.created_at || null,
    }));
  } else if (audience === 'leads') {
    const res = await queryDb(
      `SELECT id, name, email, phone, company, source, status, created_at
       FROM leads
       ORDER BY id DESC`
    ).catch(() => ({ rows: [] }));
    rows = res.rows.map((r: any) => {
      const leadStatus = String(r.status || 'NEW').toUpperCase();
      return {
        id: Number(r.id),
        name: r.name || r.email,
        email: String(r.email || '').trim().toLowerCase(),
        meta: [r.company, r.source].filter(Boolean).join(' · ') || 'Lead inquiry',
        is_active: !['LOST', 'SPAM', 'ARCHIVED', 'UNSUBSCRIBED'].includes(leadStatus),
        status: leadStatus,
        created_at: r.created_at || null,
      };
    });
  }

  const validRows = rows.filter((r) => r.email && r.email.includes('@'));

  try {
    const client = getRedisClient();
    if (client && isRedisConnected()) {
      await client.set(cacheKey, JSON.stringify(validRows), 'EX', 120);
    }
  } catch {}

  return { recipients: validRows, source: 'database' };
}

export async function fetchAudienceEmailLogs(
  audience: EmailAudience,
  limit: number = 100
): Promise<any[]> {
  const userType = getSingularAudienceUserType(audience);
  const cacheKey = `email:audience:${audience}:logs`;

  try {
    const client = getRedisClient();
    if (client && isRedisConnected()) {
      const cached = await client.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {}

  const res = await queryDb(
    `SELECT id, recipient, recipient_name, user_type, user_id, purpose, subject, content,
            provider, status, message_id, failure_reason, created_at
     FROM email_logs
     WHERE LOWER(user_type) = $1
     ORDER BY id DESC
     LIMIT $2`,
    [userType, Math.min(Math.max(1, limit), 200)]
  ).catch(() => ({ rows: [] }));

  try {
    const client = getRedisClient();
    if (client && isRedisConnected()) {
      await client.set(cacheKey, JSON.stringify(res.rows), 'EX', 60);
    }
  } catch {}

  return res.rows;
}

export async function getRecentCampaigns(audience: EmailAudience): Promise<EmailCampaignRecord[]> {
  const historyKey = `email:campaigns:recent:${audience}`;
  try {
    const client = getRedisClient();
    if (client && isRedisConnected()) {
      const ids = await client.lrange(historyKey, 0, 19);
      if (ids.length > 0) {
        const results: EmailCampaignRecord[] = [];
        for (const id of ids) {
          const data = await client.hgetall(`email:campaign:${id}`);
          if (data && data.id) {
            results.push({
              id: data.id,
              audience: (data.audience as EmailAudience) || audience,
              subject: data.subject || '',
              purpose: data.purpose || 'broadcast',
              total: Number(data.total || 0),
              sent: Number(data.sent || 0),
              failed: Number(data.failed || 0),
              status: (data.status as EmailCampaignRecord['status']) || 'completed',
              engine: 'redis',
              created_by: data.created_by || 'Developer',
              created_at: data.created_at || new Date().toISOString(),
              completed_at: data.completed_at || null,
            });
          }
        }
        return results;
      }
    }
  } catch {}

  const memIds = memoryCampaignHistory.get(audience) || [];
  return memIds
    .map((id) => memoryCampaignStore.get(id))
    .filter((c): c is EmailCampaignRecord => Boolean(c));
}

export async function getAudienceMonthlyStats(audience: EmailAudience): Promise<{
  sentThisMonth: number;
  failedThisMonth: number;
  redisConnected: boolean;
}> {
  const yearMonth = getCurrentYearMonth();
  const statsKey = `email:stats:${audience}:${yearMonth}`;
  const redisUp = isRedisConnected();

  if (redisUp) {
    try {
      const client = getRedisClient();
      if (client) {
        const data = await client.hgetall(statsKey);
        if (data && (data.sent !== undefined || data.failed !== undefined)) {
          return {
            sentThisMonth: Number(data.sent || 0),
            failedThisMonth: Number(data.failed || 0),
            redisConnected: true,
          };
        }
      }
    } catch {}
  }

  const userType = getSingularAudienceUserType(audience);
  const res = await queryDb(
    `SELECT
       COUNT(*) FILTER (WHERE LOWER(status) IN ('sent', 'simulated'))::int AS sent_count,
       COUNT(*) FILTER (WHERE LOWER(status) = 'failed')::int AS failed_count
     FROM email_logs
     WHERE LOWER(user_type) = $1
       AND TO_CHAR(created_at, 'YYYY-MM') = $2`,
    [userType, yearMonth]
  ).catch(() => ({ rows: [{ sent_count: 0, failed_count: 0 }] }));

  const sentThisMonth = Number(res.rows[0]?.sent_count || 0);
  const failedThisMonth = Number(res.rows[0]?.failed_count || 0);

  if (redisUp) {
    try {
      const client = getRedisClient();
      if (client) {
        await client.hset(statsKey, {
          sent: String(sentThisMonth),
          failed: String(failedThisMonth),
        });
        await client.expire(statsKey, 60 * 24 * 60 * 60);
      }
    } catch {}
  }

  return {
    sentThisMonth,
    failedThisMonth,
    redisConnected: redisUp,
  };
}

export async function invalidateAudienceEmailCache(audience?: EmailAudience): Promise<void> {
  if (audience) {
    await Promise.all([
      invalidateCache(`email:audience:${audience}:recipients`),
      invalidateCache(`email:audience:${audience}:logs`),
    ]);
  } else {
    await invalidateCache('email:audience:*');
  }
}

export interface DispatchAudienceEmailParams {
  audience: EmailAudience;
  recipients: Array<{ id?: number | null; name?: string | null; email: string }>;
  subject: string;
  message: string;
  purpose?: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  createdBy?: string;
  ip?: string | null;
}

export async function dispatchAudienceEmailCampaign({
  audience,
  recipients,
  subject,
  message,
  purpose = 'broadcast',
  ctaLabel = null,
  ctaUrl = null,
  createdBy = 'Developer',
  ip = null,
}: DispatchAudienceEmailParams): Promise<{
  campaign: EmailCampaignRecord;
  sentCount: number;
  failedCount: number;
  errors: Array<{ email: string; error: string }>;
}> {
  const uniqueMap = new Map<string, { id: number | null; name: string; email: string }>();
  for (const r of recipients) {
    const cleanEmail = String(r.email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) continue;
    if (!uniqueMap.has(cleanEmail)) {
      uniqueMap.set(cleanEmail, {
        id: r.id ? Number(r.id) : null,
        name: r.name ? String(r.name).trim() : cleanEmail,
        email: cleanEmail,
      });
    }
  }

  const dedupedRecipients = Array.from(uniqueMap.values());
  const campaignId = `mail_${audience}_${Date.now()}_${createHash('sha1').update(`${subject}:${dedupedRecipients.length}:${Math.random()}`).digest('hex').slice(0, 8)}`;
  const createdAt = new Date().toISOString();
  const client = getRedisClient();
  const usingRedis = Boolean(client && isRedisConnected());

  const campaign: EmailCampaignRecord = {
    id: campaignId,
    audience,
    subject: subject.trim(),
    purpose,
    total: dedupedRecipients.length,
    sent: 0,
    failed: 0,
    status: 'processing',
    engine: usingRedis ? 'redis' : 'memory',
    created_by: createdBy,
    created_at: createdAt,
    completed_at: null,
  };

  const campaignKey = `email:campaign:${campaignId}`;
  const queueKey = `email:queue:${campaignId}`;
  const historyKey = `email:campaigns:recent:${audience}`;
  const yearMonth = getCurrentYearMonth();
  const statsKey = `email:stats:${audience}:${yearMonth}`;

  if (usingRedis && client) {
    try {
      await client.hset(campaignKey, {
        id: campaign.id,
        audience: campaign.audience,
        subject: campaign.subject,
        purpose: campaign.purpose,
        total: String(campaign.total),
        sent: '0',
        failed: '0',
        status: 'processing',
        engine: 'redis',
        created_by: campaign.created_by,
        created_at: campaign.created_at,
      });
      await client.expire(campaignKey, 7 * 24 * 60 * 60);

      if (dedupedRecipients.length > 0) {
        const serializedItems = dedupedRecipients.map((item) => JSON.stringify(item));
        await client.rpush(queueKey, ...serializedItems);
        await client.expire(queueKey, 24 * 60 * 60);
      }

      await client.lpush(historyKey, campaignId);
      await client.ltrim(historyKey, 0, 24);
      await client.expire(historyKey, 30 * 24 * 60 * 60);
    } catch {}
  } else {
    memoryCampaignStore.set(campaignId, { ...campaign });
    const existingList = memoryCampaignHistory.get(audience) || [];
    memoryCampaignHistory.set(audience, [campaignId, ...existingList].slice(0, 25));
  }

  const userType = getSingularAudienceUserType(audience);
  const paragraphs = message
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  let sentCount = 0;
  let failedCount = 0;
  const errors: Array<{ email: string; error: string }> = [];

  const popNextRecipient = async (): Promise<{ id: number | null; name: string; email: string } | null> => {
    if (usingRedis && client) {
      try {
        const raw = await client.lpop(queueKey);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return null;
  };

  if (usingRedis && client && dedupedRecipients.length > 0) {
    while (true) {
      const target = await popNextRecipient();
      if (!target) break;
      try {
        const html = buildStyledEmail({
          title: subject.trim(),
          recipientName: target.name,
          bodyParagraphs: paragraphs.length > 0 ? paragraphs : [message.trim()],
          actionUrl: ctaUrl ? ctaUrl.trim() : null,
          actionText: ctaLabel ? ctaLabel.trim() : null,
          footerNote: `Dispatched via Platform ${audience.charAt(0).toUpperCase() + audience.slice(1)} Communications`,
        });
        await sendEmail({
          to: target.email,
          toName: target.name,
          subject: subject.trim(),
          html,
          text: message.trim(),
          recipientType: userType,
          recipientId: target.id,
          purpose,
          ip,
        });
        sentCount++;
        try {
          await Promise.all([
            client.hincrby(campaignKey, 'sent', 1),
            client.hincrby(statsKey, 'sent', 1),
            client.expire(statsKey, 60 * 24 * 60 * 60),
          ]);
        } catch {}
      } catch (err: any) {
        failedCount++;
        errors.push({ email: target.email, error: err?.message || 'Failed to send email' });
        try {
          await Promise.all([
            client.hincrby(campaignKey, 'failed', 1),
            client.hincrby(statsKey, 'failed', 1),
            client.expire(statsKey, 60 * 24 * 60 * 60),
          ]);
        } catch {}
      }
    }
  } else {
    for (const target of dedupedRecipients) {
      try {
        const html = buildStyledEmail({
          title: subject.trim(),
          recipientName: target.name,
          bodyParagraphs: paragraphs.length > 0 ? paragraphs : [message.trim()],
          actionUrl: ctaUrl ? ctaUrl.trim() : null,
          actionText: ctaLabel ? ctaLabel.trim() : null,
          footerNote: `Dispatched via Platform ${audience.charAt(0).toUpperCase() + audience.slice(1)} Communications`,
        });
        await sendEmail({
          to: target.email,
          toName: target.name,
          subject: subject.trim(),
          html,
          text: message.trim(),
          recipientType: userType,
          recipientId: target.id,
          purpose,
          ip,
        });
        sentCount++;
      } catch (err: any) {
        failedCount++;
        errors.push({ email: target.email, error: err?.message || 'Failed to send email' });
      }
    }
  }

  const completedAt = new Date().toISOString();
  const finalStatus: EmailCampaignRecord['status'] =
    sentCount === 0 && failedCount > 0 ? 'failed' : 'completed';

  campaign.sent = sentCount;
  campaign.failed = failedCount;
  campaign.status = finalStatus;
  campaign.completed_at = completedAt;

  if (usingRedis && client) {
    try {
      await client.hset(campaignKey, {
        sent: String(sentCount),
        failed: String(failedCount),
        status: finalStatus,
        completed_at: completedAt,
      });
    } catch {}
  } else {
    memoryCampaignStore.set(campaignId, { ...campaign });
  }

  await invalidateAudienceEmailCache(audience);

  return {
    campaign,
    sentCount,
    failedCount,
    errors,
  };
}
