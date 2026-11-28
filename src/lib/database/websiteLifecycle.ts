import { queryDb } from './db';
import { purgeWebsite } from './websitePurge';
import { invalidateWebsiteCache } from '../middleware/websiteResolver';

export const ALL_SUBSCRIPTION_STATUSES = [
  'active',
  'inactive',
  'suspended',
  'trailing',
  'past_due',
  'cancelled',
  'expired',
] as const;

let lastSyncMs = 0;
let activeSyncPromise: Promise<any> | null = null;

export function isSubscriptionActiveRecord(sub: any): boolean {
  if (!sub) return false;
  const st = String(sub.status || sub.subscription_status || '').toLowerCase().trim();
  if (st !== 'active') return false;
  const periodEnd = sub.current_period_end || sub.subscription_period_end;
  if (periodEnd) {
    const endDate = new Date(periodEnd);
    if (!Number.isNaN(endDate.getTime()) && endDate.getTime() <= Date.now()) {
      return false;
    }
  }
  return true;
}

export async function syncExpiredSubscriptionsAndMaintenance() {
  try {
    await queryDb(
      `UPDATE subscriptions
       SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
       WHERE LOWER(COALESCE(status, '')) = 'active'
         AND current_period_end IS NOT NULL
         AND current_period_end <= CURRENT_TIMESTAMP`
    );

    const lockedSites = await queryDb(
      `UPDATE websites w
       SET is_maintenance_mode = TRUE,
           updated_at = CURRENT_TIMESTAMP
       WHERE NOT COALESCE(w.is_maintenance_mode, FALSE)
         AND (
           w.subscription_id IS NULL
           OR NOT EXISTS (
             SELECT 1 FROM subscriptions s WHERE s.id = w.subscription_id
           )
           OR EXISTS (
             SELECT 1 FROM subscriptions s
             WHERE s.id = w.subscription_id
               AND (
                 LOWER(COALESCE(s.status, '')) <> 'active'
                 OR (s.current_period_end IS NOT NULL AND s.current_period_end <= CURRENT_TIMESTAMP)
               )
           )
         )
       RETURNING w.id`
    );

    for (const row of lockedSites.rows || []) {
      await invalidateWebsiteCache(row.id).catch(() => {});
    }
    return { lockedCount: lockedSites.rows?.length || 0 };
  } catch (err) {
    console.error('Lifecycle subscription sync error:', err);
    return { lockedCount: 0 };
  }
}

export async function processExpiredScheduledDeletions() {
  try {
    const dueSites = await queryDb(
      `SELECT id FROM websites
       WHERE deletion_scheduled_at IS NOT NULL
         AND deletion_scheduled_at <= CURRENT_TIMESTAMP
       ORDER BY deletion_scheduled_at ASC
       LIMIT 20`
    );

    let purgedCount = 0;
    for (const site of dueSites.rows || []) {
      try {
        await purgeWebsite(null, { websiteId: Number(site.id) });
        await invalidateWebsiteCache(site.id).catch(() => {});
        purgedCount++;
      } catch (purgeErr) {
        console.error(`Failed scheduled purge for website #${site.id}:`, purgeErr);
      }
    }
    return { purgedCount };
  } catch (err) {
    console.error('Lifecycle scheduled deletion error:', err);
    return { purgedCount: 0 };
  }
}

export async function ensureLifecycleSynced(force: boolean = false) {
  const now = Date.now();
  if (!force && activeSyncPromise) {
    return activeSyncPromise;
  }
  if (!force && now - lastSyncMs < 60_000) {
    return { skipped: true };
  }
  lastSyncMs = now;
  activeSyncPromise = (async () => {
    const subRes = await syncExpiredSubscriptionsAndMaintenance();
    const delRes = await processExpiredScheduledDeletions();
    return { ...subRes, ...delRes };
  })().finally(() => {
    activeSyncPromise = null;
  });
  return activeSyncPromise;
}

export async function enforceSubscriptionMaintenanceForWebsite(websiteId: number) {
  const res = await queryDb(
    `SELECT w.id, w.is_maintenance_mode, w.subscription_id,
            s.status AS sub_status, s.current_period_end AS sub_period_end
     FROM websites w
     LEFT JOIN subscriptions s ON s.id = w.subscription_id
     WHERE w.id = $1
     LIMIT 1`,
    [websiteId]
  );
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  const active =
    Boolean(row.subscription_id) &&
    isSubscriptionActiveRecord({ status: row.sub_status, current_period_end: row.sub_period_end });
  if (!active && !row.is_maintenance_mode) {
    await queryDb(
      `UPDATE websites SET is_maintenance_mode = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [websiteId]
    );
    await invalidateWebsiteCache(websiteId).catch(() => {});
  }
  return { websiteId, isSubscriptionActive: active };
}

export async function scheduleWebsiteDeletion(
  websiteId: number,
  requestedBy: 'creator' | 'developer',
  creatorId?: number
) {
  const params: any[] = [requestedBy, websiteId];
  let whereSql = `id = $2`;
  if (creatorId !== undefined) {
    params.push(creatorId);
    whereSql += ` AND creator_id = $3`;
  }
  const upd = await queryDb(
    `UPDATE websites
     SET deletion_requested_at = COALESCE(deletion_requested_at, CURRENT_TIMESTAMP),
         deletion_scheduled_at = COALESCE(deletion_scheduled_at, CURRENT_TIMESTAMP + INTERVAL '30 days'),
         deletion_requested_by = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE ${whereSql}
     RETURNING *`,
    params
  );
  if (upd.rows.length === 0) {
    return null;
  }
  await invalidateWebsiteCache(websiteId).catch(() => {});
  return upd.rows[0];
}

export async function cancelWebsiteDeletion(websiteId: number, creatorId?: number) {
  const params: any[] = [websiteId];
  let whereSql = `id = $1`;
  if (creatorId !== undefined) {
    params.push(creatorId);
    whereSql += ` AND creator_id = $2`;
  }
  const upd = await queryDb(
    `UPDATE websites
     SET deletion_requested_at = NULL,
         deletion_scheduled_at = NULL,
         deletion_requested_by = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE ${whereSql}
     RETURNING *`,
    params
  );
  if (upd.rows.length === 0) {
    return null;
  }
  await invalidateWebsiteCache(websiteId).catch(() => {});
  return upd.rows[0];
}
