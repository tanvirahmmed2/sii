import { query, queryDb } from '../database/db';
import { ensureLifecycleSynced, isSubscriptionActiveRecord } from '../database/websiteLifecycle';
import {
  getWebsiteDomain,
  DEFAULT_CACHE_TTL_MS,
  DEFAULT_NEGATIVE_CACHE_TTL_MS,
  DEFAULT_REDIS_TTL_SEC,
  DEFAULT_REDIS_NEGATIVE_TTL_SEC,
  QUERY_TIMEOUT_MS,
} from '../database/secret';
import {
  getRedisClient,
  isRedisConnected,
  fetchWebsiteModulesCache,
  invalidateWebsiteModulesCache,
} from '../redis/redisClient';
import { expandModuleKeys } from '../modules/moduleMappings';
import { normalizeAcademicConfig } from '../modules/academicConfig';

interface CacheEntry {
  website: any;
  expiresAt: number;
}

const websiteCache = new Map<string, CacheEntry>();
const inFlightResolutions = new Map<string, Promise<any>>();

async function getCachedWebsiteFromRedis(cleanId: string): Promise<any> {
  try {
    const client = getRedisClient();
    if (!client || !isRedisConnected()) return null;
    const raw = await client.get(`website:resolve:${cleanId}`);
    if (!raw) return null;
    if (raw === '__NULL__') return '__NULL__';
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function saveWebsiteToRedis(cleanId: string, website: any, ttlSec: number = DEFAULT_REDIS_TTL_SEC): Promise<void> {
  try {
    const client = getRedisClient();
    if (!client || !isRedisConnected()) return;
    if (website) {
      const serialized = JSON.stringify(website);
      const aliasKeys = new Set<string>();
      aliasKeys.add(cleanId);
      if (website.id) aliasKeys.add(String(website.id).toLowerCase());
      if (website.slug) aliasKeys.add(String(website.slug).toLowerCase());
      if (website.subdomain) aliasKeys.add(String(website.subdomain).toLowerCase());
      if (website.domain) aliasKeys.add(String(website.domain).toLowerCase());
      if (website.custom_domain) aliasKeys.add(String(website.custom_domain).toLowerCase());

      const pipeline = client.pipeline();
      for (const alias of aliasKeys) {
        pipeline.set(`website:resolve:${alias}`, serialized, 'EX', ttlSec);
      }
      if (website.id) {
        const aliasSetKey = `website:aliases:${website.id}`;
        pipeline.sadd(aliasSetKey, ...Array.from(aliasKeys));
        pipeline.expire(aliasSetKey, ttlSec);
      }
      await pipeline.exec();
    } else {
      await client.set(`website:resolve:${cleanId}`, '__NULL__', 'EX', DEFAULT_REDIS_NEGATIVE_TTL_SEC);
    }
  } catch { }
}

async function removeWebsiteFromRedis(identifier?: string | number | null): Promise<void> {
  try {
    const client = getRedisClient();
    if (!client || !isRedisConnected()) return;

    if (!identifier) {
      const keys = await client.keys('website:resolve:*');
      const aliasSets = await client.keys('website:aliases:*');
      const allKeys = [...keys, ...aliasSets];
      if (allKeys.length > 0) {
        const pipeline = client.pipeline();
        for (const k of allKeys) {
          pipeline.del(k);
        }
        await pipeline.exec();
      }
      return;
    }

    const cleanId = String(identifier).trim().toLowerCase();
    const isNum = /^[0-9]+$/.test(cleanId);
    let targetWebsiteId: string | null = isNum ? cleanId : null;

    if (!targetWebsiteId) {
      const cached = await client.get(`website:resolve:${cleanId}`);
      if (cached && cached !== '__NULL__') {
        try {
          const parsed = JSON.parse(cached);
          if (parsed?.id) targetWebsiteId = String(parsed.id);
        } catch { }
      }
    }

    const keysToDelete = new Set<string>();
    keysToDelete.add(`website:resolve:${cleanId}`);

    if (targetWebsiteId) {
      const aliasSetKey = `website:aliases:${targetWebsiteId}`;
      const aliases = await client.smembers(aliasSetKey);
      if (Array.isArray(aliases)) {
        aliases.forEach((alias: string) => keysToDelete.add(`website:resolve:${alias}`));
      }
      keysToDelete.add(aliasSetKey);
    }

    const toDelArray = Array.from(keysToDelete);
    if (toDelArray.length > 0) {
      await client.del(...toDelArray);
    }
  } catch { }
}

async function removeWebsiteAliasesFromRedis(aliases: string[], websiteId?: string | number | null): Promise<void> {
  try {
    const client = getRedisClient();
    if (!client || !isRedisConnected()) return;
    const keysToDelete = new Set<string>();
    for (const a of aliases) {
      if (a) keysToDelete.add(`website:resolve:${String(a).trim().toLowerCase()}`);
    }
    if (websiteId) {
      const aliasSetKey = `website:aliases:${websiteId}`;
      const members = await client.smembers(aliasSetKey).catch(() => []);
      if (Array.isArray(members)) {
        for (const m of members) keysToDelete.add(`website:resolve:${m}`);
      }
      keysToDelete.add(aliasSetKey);
    }
    const arr = Array.from(keysToDelete);
    if (arr.length > 0) {
      await client.del(...arr);
    }
  } catch { }
}

export async function extractWebsiteIdentifier(request: any, context?: any): Promise<string | null> {
  if (typeof context === 'string' && context.trim()) {
    const raw = context.trim().toLowerCase().split(':')[0];
    return getWebsiteDomain(raw) || raw;
  }

  if (context?.params) {
    try {
      const resolvedParams = typeof context.params.then === 'function'
        ? await context.params
        : context.params;

      const candidate = resolvedParams?.domain || resolvedParams?.slug || resolvedParams?.websiteId || resolvedParams?.tenant;
      if (candidate) {
        const raw = String(candidate).trim().toLowerCase().split(':')[0];
        return getWebsiteDomain(raw) || raw;
      }
    } catch { }
  }

  if (request) {
    const url = request.nextUrl || (request.url ? new URL(request.url, 'http://localhost') : null);
    if (url?.searchParams) {
      const queryParam =
        url.searchParams.get('domain') ||
        url.searchParams.get('slug') ||
        url.searchParams.get('subdomain') ||
        url.searchParams.get('websiteId') ||
        url.searchParams.get('tenant');
      if (queryParam) {
        const raw = queryParam.trim().toLowerCase().split(':')[0];
        return getWebsiteDomain(raw) || raw;
      }
    }

    const headerDomain =
      request.headers?.get?.('x-website-domain') ||
      request.headers?.get?.('x-domain');
    if (headerDomain) {
      const raw = headerDomain.trim().toLowerCase().split(':')[0];
      return getWebsiteDomain(raw) || raw;
    }

    const cookieDomain =
      request.cookies?.get?.('x-website-domain')?.value ||
      request.cookies?.get?.('x-domain')?.value ||
      request.cookies?.get?.('website_slug')?.value;
    if (cookieDomain) {
      const raw = cookieDomain.trim().toLowerCase().split(':')[0];
      return getWebsiteDomain(raw) || raw;
    }

    const referer = request.headers?.get?.('referer');
    if (referer) {
      const refMatch = referer.match(/\/(?:websites|website|webite)\/([^/?#]+)/i);
      if (refMatch && refMatch[1]) {
        return decodeURIComponent(refMatch[1]).trim().toLowerCase().split(':')[0];
      }
      try {
        const refUrl = new URL(referer);
        const refTenant = getWebsiteDomain(refUrl.host);
        if (refTenant) {
          return refTenant;
        }
        const pathParts = refUrl.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          const first = pathParts[0].toLowerCase();
          const reserved = ['creator', 'api', '_next', 'marketing', 'auth', 'admin', 'developer', 'static', 'favicon.ico'];
          if (!reserved.includes(first)) {
            return first;
          }
        }
      } catch { }
    }

    const hostTenant = getWebsiteDomain(request);
    if (hostTenant) {
      return hostTenant;
    }
  }

  return null;
}

async function fetchWebsiteFromDb(cleanId: string): Promise<any> {
  const isNum = /^[0-9]+$/.test(cleanId);
  const noWww = cleanId.replace(/^www\./, '');
  const subPrefix = cleanId.includes('.') ? cleanId.split('.')[0] : cleanId;

  const sql = `
    SELECT w.id, w.creator_id, w.subscription_id, w.name, w.slug,
           COALESCE(
             (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.is_primary = TRUE LIMIT 1),
             (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'subdomain' LIMIT 1),
             w.slug
           ) AS subdomain,
           COALESCE(
             (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.is_primary = TRUE LIMIT 1),
             (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'subdomain' LIMIT 1),
             w.slug
           ) AS domain,
           (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'custom_domain' LIMIT 1) AS custom_domain,
           (SELECT COALESCE(wd.is_verified, FALSE) FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'custom_domain' LIMIT 1) AS custom_domain_verified,
           w.institution_type, w.eiin_number, w.contact_email, w.contact_phone, w.address,
           w.facebook_url, w.twitter_url, w.instagram_url, w.youtube_url, w.linkedin_url,
           w.primary_color, w.secondary_color, w.theme, w.status, w.is_maintenance_mode,
           COALESCE(w.maintenance_message, 'Our campus portal is temporarily under scheduled maintenance. Please check back shortly.') AS maintenance_message,
           COALESCE(w.currency, 'BDT') AS currency,
           w.logo, w.logo_id, w.favicon, w.favicon_id,
           (w.status = 'active') AS is_active,
           (w.status = 'active' AND w.is_maintenance_mode = false) AS is_published
    FROM websites w
    WHERE LOWER(w.slug) = $1 
       OR LOWER(w.slug) = $2
       OR LOWER(w.slug) = $6
       OR ($4 = true AND w.id = $5::bigint)
       OR EXISTS (
            SELECT 1 FROM website_domains wd 
            WHERE wd.website_id = w.id 
              AND (
                LOWER(wd.domain) = $1 
                OR LOWER(wd.domain) = $2 
                OR LOWER(wd.domain) = $6
                OR SPLIT_PART(LOWER(wd.domain), '.', 1) = $1
                OR SPLIT_PART(LOWER(wd.domain), '.', 1) = $2
                OR SPLIT_PART(LOWER(wd.domain), '.', 1) = $6
                OR LOWER(wd.domain) = 'www.' || $2
                OR LOWER(REPLACE(wd.domain, 'www.', '')) = $2
                OR LOWER(wd.domain) LIKE $3
              )
          )
    LIMIT 1
  `;
  const params: any[] = [cleanId, noWww, `${cleanId}.%`, isNum, isNum ? Number(cleanId) : -1, subPrefix];

  let timeoutId: any;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Website resolution timed out after ${QUERY_TIMEOUT_MS}ms for identifier: "${cleanId}"`));
    }, QUERY_TIMEOUT_MS);
  });

  try {
    const res: any = await Promise.race([
      query(sql, params),
      timeoutPromise
    ]);
    clearTimeout(timeoutId);

    if (!res || !res.rows || res.rows.length === 0) {
      return null;
    }

    const website = res.rows[0];

    website.primary_color = website.primary_color || '#1e40af';
    website.secondary_color = website.secondary_color || '#0ea5e9';

    let allowedControlModules: any[] = [];
    let allowedControlModulePaths: string[] = [];
    let allowedControlModuleSlugs: string[] = [];
    let allowedHomeModules: any[] = [];
    let allowedHomeModulePaths: string[] = [];
    let allowedHomeModuleSlugs: string[] = [];
    let packageInfo: any = null;

    try {
      const moduleBundle = await fetchWebsiteModulesCache(website.id, async () => {
        const pkgRes = await query(
          `SELECT p.id AS package_id, p.name AS package_name, p.slug AS package_slug,
                  p.short_description, p.description, p.tagline,
                  p.bdt_per_month, p.usd_per_month, p.eur_per_month, p.gbp_per_month, p.aud_per_month, p.cad_per_month, p.discount_percentage,
                  p.max_students, p.max_teachers, p.max_staff, p.max_storage_mb,
                  p.is_available_student_panel, p.is_available_teacher_panel, p.is_available_custom_domain,
                  p.features, p.grace_period,
                  s.id AS subscription_id, s.status AS subscription_status,
                  s.billing_cycle AS subscription_billing_cycle, s.current_period_end AS subscription_period_end,
                  COALESCE(
                    (
                      SELECT json_agg(
                        json_build_object(
                          'id', cm.id,
                          'slug', cm.slug,
                          'name', cm.name,
                          'path', cm.path,
                          'category', cm.category,
                          'description', cm.description,
                          'icon', cm.icon,
                          'is_active', cm.is_active
                        ) ORDER BY cm.display_order ASC, cm.id ASC
                      )
                      FROM package_control_modules pcm
                      JOIN website_control_modules cm ON cm.id = pcm.control_module_id
                      WHERE pcm.package_id = p.id AND cm.is_active = TRUE
                    ),
                    '[]'::json
                  ) AS allowed_control_modules,
                  COALESCE(
                    (
                      SELECT array_agg(DISTINCT cm.path ORDER BY cm.path ASC)
                      FROM package_control_modules pcm
                      JOIN website_control_modules cm ON cm.id = pcm.control_module_id
                      WHERE pcm.package_id = p.id AND cm.is_active = TRUE
                    ),
                    ARRAY[]::varchar[]
                  ) AS allowed_control_module_paths,
                  COALESCE(
                    (
                      SELECT array_agg(DISTINCT cm.slug ORDER BY cm.slug ASC)
                      FROM package_control_modules pcm
                      JOIN website_control_modules cm ON cm.id = pcm.control_module_id
                      WHERE pcm.package_id = p.id AND cm.is_active = TRUE
                    ),
                    ARRAY[]::varchar[]
                  ) AS allowed_control_module_slugs,
                  COALESCE(
                    (
                      SELECT json_agg(
                        json_build_object(
                          'id', hm.id,
                          'slug', hm.slug,
                          'name', hm.name,
                          'path', hm.path,
                          'category', hm.category,
                          'description', hm.description,
                          'icon', hm.icon,
                          'is_active', hm.is_active
                        ) ORDER BY hm.display_order ASC, hm.id ASC
                      )
                      FROM package_home_modules phm
                      JOIN website_home_modules hm ON hm.id = phm.home_module_id
                      WHERE phm.package_id = p.id AND hm.is_active = TRUE
                    ),
                    '[]'::json
                  ) AS allowed_home_modules,
                  COALESCE(
                    (
                      SELECT array_agg(DISTINCT hm.path ORDER BY hm.path ASC)
                      FROM package_home_modules phm
                      JOIN website_home_modules hm ON hm.id = phm.home_module_id
                      WHERE phm.package_id = p.id AND hm.is_active = TRUE
                    ),
                    ARRAY[]::varchar[]
                  ) AS allowed_home_module_paths,
                  COALESCE(
                    (
                      SELECT array_agg(DISTINCT hm.slug ORDER BY hm.slug ASC)
                      FROM package_home_modules phm
                      JOIN website_home_modules hm ON hm.id = phm.home_module_id
                      WHERE phm.package_id = p.id AND hm.is_active = TRUE
                    ),
                    ARRAY[]::varchar[]
                  ) AS allowed_home_module_slugs
           FROM subscriptions s
           JOIN packages p ON p.id = s.package_id
           WHERE (s.id = $1 OR s.website_id = $2)
           ORDER BY (s.id = $1) DESC, (s.status = 'active') DESC, s.id DESC
           LIMIT 1`,
          [website.subscription_id || 0, website.id]
        );

        if (pkgRes && pkgRes.rows && pkgRes.rows.length > 0) {
          const pRow = pkgRes.rows[0];
          const subIsActive = isSubscriptionActiveRecord({
            status: pRow.subscription_status,
            current_period_end: pRow.subscription_period_end,
          });
          return {
            hasSubscription: true,
            subIsActive,
            subscription_id: pRow.subscription_id,
            subscription_status: pRow.subscription_status,
            subscription_billing_cycle: pRow.subscription_billing_cycle,
            subscription_period_end: pRow.subscription_period_end,
            packageInfo: {
              id: pRow.package_id,
              name: pRow.package_name,
              slug: pRow.package_slug,
              short_description: pRow.short_description,
              description: pRow.description,
              tagline: pRow.tagline,
              bdt_per_month: pRow.bdt_per_month,
              usd_per_month: pRow.usd_per_month,
              eur_per_month: pRow.eur_per_month,
              gbp_per_month: pRow.gbp_per_month,
              aud_per_month: pRow.aud_per_month,
              cad_per_month: pRow.cad_per_month,
              monthly_price_usd: pRow.usd_per_month,
              yearly_price_usd: Number(pRow.usd_per_month || 0) * 12,
              monthly_price_bdt: pRow.bdt_per_month,
              yearly_price_bdt: Number(pRow.bdt_per_month || 0) * 12,
              monthly_price: pRow.usd_per_month,
              yearly_price: Number(pRow.usd_per_month || 0) * 12,
              discount_percentage: pRow.discount_percentage,
              max_students: pRow.max_students,
              max_teachers: pRow.max_teachers,
              max_staff: pRow.max_staff,
              max_storage_mb: pRow.max_storage_mb,
              is_available_student_panel: pRow.is_available_student_panel ?? true,
              is_available_teacher_panel: pRow.is_available_teacher_panel ?? true,
              is_available_custom_domain: pRow.is_available_custom_domain ?? false,
              features: pRow.features || [],
              grace_period: pRow.grace_period,
              subscription_id: pRow.subscription_id,
              subscription_status: pRow.subscription_status,
              subscription_billing_cycle: pRow.subscription_billing_cycle,
              subscription_period_end: pRow.subscription_period_end,
            },
            allowedControlModules: pRow.allowed_control_modules || [],
            allowedControlModulePaths: pRow.allowed_control_module_paths || [],
            allowedControlModuleSlugs: pRow.allowed_control_module_slugs || [],
            allowedHomeModules: pRow.allowed_home_modules || [],
            allowedHomeModulePaths: pRow.allowed_home_module_paths || [],
            allowedHomeModuleSlugs: pRow.allowed_home_module_slugs || [],
          };
        }

        const [fallbackControl, fallbackHome]: [any, any] = await Promise.all([
          query(`SELECT id, slug, name, path, category, description, icon, is_active FROM website_control_modules WHERE is_active = TRUE ORDER BY display_order ASC, id ASC`).catch(() => ({ rows: [] })),
          query(`SELECT id, slug, name, path, category, description, icon, is_active FROM website_home_modules WHERE is_active = TRUE ORDER BY display_order ASC, id ASC`).catch(() => ({ rows: [] }))
        ]);
        const fbControlRows = fallbackControl.rows || [];
        const fbHomeRows = fallbackHome.rows || [];
        return {
          hasSubscription: false,
          subIsActive: false,
          subscription_id: null,
          subscription_status: 'inactive',
          subscription_billing_cycle: null,
          subscription_period_end: null,
          packageInfo: null,
          allowedControlModules: fbControlRows,
          allowedControlModulePaths: fbControlRows.map((m: any) => m.path).filter(Boolean),
          allowedControlModuleSlugs: fbControlRows.map((m: any) => m.slug).filter(Boolean),
          allowedHomeModules: fbHomeRows,
          allowedHomeModulePaths: fbHomeRows.map((m: any) => m.path).filter(Boolean),
          allowedHomeModuleSlugs: fbHomeRows.map((m: any) => m.slug).filter(Boolean),
        };
      });

      if (moduleBundle) {
        if (moduleBundle.hasSubscription) {
          if (!moduleBundle.subIsActive) {
            website.is_maintenance_mode = true;
            website.is_published = false;
          }
          website.subscription_id = moduleBundle.subscription_id;
          website.subscription_status = moduleBundle.subscription_status;
          website.subscription_billing_cycle = moduleBundle.subscription_billing_cycle;
          website.subscription_period_end = moduleBundle.subscription_period_end;
          website.subscription_is_active = Boolean(moduleBundle.subIsActive);
        } else {
          website.is_maintenance_mode = true;
          website.is_published = false;
          website.subscription_status = 'inactive';
          website.subscription_is_active = false;
        }
        packageInfo = moduleBundle.packageInfo || null;
        allowedControlModules = moduleBundle.allowedControlModules || [];
        allowedControlModulePaths = moduleBundle.allowedControlModulePaths || [];
        allowedControlModuleSlugs = moduleBundle.allowedControlModuleSlugs || [];
        allowedHomeModules = moduleBundle.allowedHomeModules || [];
        allowedHomeModulePaths = moduleBundle.allowedHomeModulePaths || [];
        allowedHomeModuleSlugs = moduleBundle.allowedHomeModuleSlugs || [];
      }
    } catch (e: any) {
      console.warn('[websiteResolver] Error loading package modules:', e.message);
    }

    website.package = packageInfo;
    website.package_id = packageInfo?.id || null;
    website.package_name = packageInfo?.name || null;
    website.package_slug = packageInfo?.slug || null;

    website.is_available_student_panel = packageInfo ? Boolean(packageInfo.is_available_student_panel) : true;
    website.is_available_teacher_panel = packageInfo ? Boolean(packageInfo.is_available_teacher_panel) : true;
    website.is_available_custom_domain = packageInfo ? Boolean(packageInfo.is_available_custom_domain) : false;

    website.is_published = website.status === 'active' && !website.is_maintenance_mode;
    ensureLifecycleSynced().catch(() => {});

    website.allowed_control_modules = allowedControlModules;
    website.allowed_control_module_paths = allowedControlModulePaths;
    website.allowed_control_module_slugs = allowedControlModuleSlugs;

    website.allowed_home_modules = allowedHomeModules;
    website.allowed_home_module_paths = allowedHomeModulePaths;
    website.allowed_home_module_slugs = allowedHomeModuleSlugs;

    website.allowed_modules = allowedControlModules;
    website.allowed_module_slugs = allowedControlModuleSlugs;
    website.allowedModules = allowedControlModuleSlugs;

    try {
      const cfgRes = await query(`SELECT * FROM website_academic_configs WHERE website_id = $1 LIMIT 1`, [website.id]).catch(() => ({ rows: [] }));
      const rawCfg = cfgRes?.rows?.[0];
      website.academic_config = normalizeAcademicConfig(rawCfg);
      website.academicConfig = website.academic_config;
    } catch { }

    const settingsCopy = { ...website };
    website.settings = settingsCopy;
    website.website_settings = settingsCopy;

    return website;
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error(`[websiteResolver] Error querying website for "${cleanId}":`, err.message || err);
    return null;
  }
}

export async function resolveWebsite(identifier: string | number, options: any = {}): Promise<any> {
  if (!identifier) return null;

  const cleanId = String(identifier).trim().toLowerCase().split(':')[0];
  if (!cleanId) return null;

  const now = Date.now();
  const bypassCache = options.bypassCache === true;

  if (!bypassCache && websiteCache.has(cleanId)) {
    const cached = websiteCache.get(cleanId);
    if (cached && now < cached.expiresAt) {
      return cached.website;
    }
    websiteCache.delete(cleanId);
  }

  if (!bypassCache) {
    const redisData = await getCachedWebsiteFromRedis(cleanId);
    if (redisData === '__NULL__') {
      websiteCache.set(cleanId, {
        website: null,
        expiresAt: now + DEFAULT_NEGATIVE_CACHE_TTL_MS,
      });
      return null;
    }
    if (redisData && typeof redisData === 'object') {
      const ttl = options.ttlMs || DEFAULT_CACHE_TTL_MS;
      const entry = { website: redisData, expiresAt: now + ttl };
      websiteCache.set(cleanId, entry);
      if (redisData.slug) websiteCache.set(String(redisData.slug).toLowerCase(), entry);
      if (redisData.subdomain) websiteCache.set(String(redisData.subdomain).toLowerCase(), entry);
      if (redisData.custom_domain) websiteCache.set(String(redisData.custom_domain).toLowerCase(), entry);
      if (redisData.id) websiteCache.set(String(redisData.id), entry);
      return redisData;
    }
  }

  if (!bypassCache && inFlightResolutions.has(cleanId)) {
    return inFlightResolutions.get(cleanId);
  }

  const resolutionPromise = (async () => {
    try {
      const website = await fetchWebsiteFromDb(cleanId);
      const ttl = website
        ? (options.ttlMs || DEFAULT_CACHE_TTL_MS)
        : DEFAULT_NEGATIVE_CACHE_TTL_MS;

      const cacheEntry: CacheEntry = {
        website,
        expiresAt: Date.now() + ttl,
      };

      websiteCache.set(cleanId, cacheEntry);

      if (website) {
        if (website.slug) websiteCache.set(String(website.slug).toLowerCase(), cacheEntry);
        if (website.subdomain) websiteCache.set(String(website.subdomain).toLowerCase(), cacheEntry);
        if (website.custom_domain) websiteCache.set(String(website.custom_domain).toLowerCase(), cacheEntry);
        if (website.id) websiteCache.set(String(website.id), cacheEntry);
        const redisTtl = Math.max(30, Math.floor((options.ttlMs || DEFAULT_CACHE_TTL_MS * 5) / 1000));
        await saveWebsiteToRedis(cleanId, website, redisTtl);
      } else {
        await saveWebsiteToRedis(cleanId, null);
      }

      return website;
    } finally {
      inFlightResolutions.delete(cleanId);
    }
  })();

  inFlightResolutions.set(cleanId, resolutionPromise);
  return resolutionPromise;
}

export async function resolveWebsiteFromRequest(request: any, context?: any, options: any = {}): Promise<any> {
  try {
    const identifier = await extractWebsiteIdentifier(request, context);
    if (!identifier) return null;
    return await resolveWebsite(identifier, options);
  } catch (error) {
    console.error('[websiteResolver] resolveWebsiteFromRequest error:', error);
    return null;
  }
}

export async function getWebsiteById(id: string | number, options: any = {}): Promise<any> {
  if (!id) return null;
  return resolveWebsite(id, options);
}

export async function getWebsiteBySlug(slug: string, options: any = {}): Promise<any> {
  if (!slug) return null;
  return resolveWebsite(slug, options);
}

export async function getWebsiteByDomain(domain: string, options: any = {}): Promise<any> {
  if (!domain) return null;
  return resolveWebsite(domain, options);
}

export function getWebsiteFromCache(identifier: string | number): any {
  if (!identifier) return null;
  const cleanId = String(identifier).trim().toLowerCase().split(':')[0];
  const cached = websiteCache.get(cleanId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.website;
  }
  return null;
}

export async function getWebsiteFromCacheAsync(identifier: string | number): Promise<any> {
  const fromMemory = getWebsiteFromCache(identifier);
  if (fromMemory) return fromMemory;
  if (!identifier) return null;
  const cleanId = String(identifier).trim().toLowerCase().split(':')[0];
  const fromRedis = await getCachedWebsiteFromRedis(cleanId);
  if (fromRedis && fromRedis !== '__NULL__') {
    return fromRedis;
  }
  return null;
}

export async function invalidateWebsiteCache(identifier?: string | number | null): Promise<void> {
  if (!identifier) {
    websiteCache.clear();
    await removeWebsiteFromRedis();
    await invalidateWebsiteModulesCache();
    return;
  }
  const cleanId = String(identifier).trim().toLowerCase();
  const aliases = new Set<string>([cleanId]);
  websiteCache.delete(cleanId);

  let matchedWebsiteId: any = /^[0-9]+$/.test(cleanId) ? Number(cleanId) : null;
  for (const [key, entry] of websiteCache.entries()) {
    const w = entry?.website;
    if (
      w &&
      (String(w.id) === cleanId ||
        String(w.slug).toLowerCase() === cleanId ||
        String(w.subdomain).toLowerCase() === cleanId ||
        String(w.custom_domain).toLowerCase() === cleanId)
    ) {
      matchedWebsiteId = w.id;
      aliases.add(key);
      if (w.id) aliases.add(String(w.id));
      if (w.slug) aliases.add(String(w.slug).toLowerCase());
      if (w.subdomain) aliases.add(String(w.subdomain).toLowerCase());
      if (w.custom_domain) aliases.add(String(w.custom_domain).toLowerCase());
      websiteCache.delete(key);
    } else if (!w && key === cleanId) {
      websiteCache.delete(key);
    }
  }

  try {
    const isNum = /^[0-9]+$/.test(cleanId);
    const dbAliases = await query(
      `SELECT w.id, w.slug, wd.domain
       FROM websites w
       LEFT JOIN website_domains wd ON wd.website_id = w.id
       WHERE ($1 = true AND w.id = $2::bigint)
          OR LOWER(w.slug) = $3
          OR EXISTS (SELECT 1 FROM website_domains wd2 WHERE wd2.website_id = w.id AND LOWER(wd2.domain) = $3)`,
      [isNum, isNum ? Number(cleanId) : -1, cleanId]
    );
    for (const row of dbAliases.rows || []) {
      if (row.id) {
        matchedWebsiteId = row.id;
        aliases.add(String(row.id));
      }
      if (row.slug) aliases.add(String(row.slug).toLowerCase());
      if (row.domain) aliases.add(String(row.domain).toLowerCase());
    }
  } catch { }

  for (const a of aliases) {
    websiteCache.delete(a);
  }

  await removeWebsiteFromRedis(matchedWebsiteId || cleanId);
  await removeWebsiteAliasesFromRedis(Array.from(aliases), matchedWebsiteId);
  await invalidateWebsiteModulesCache(matchedWebsiteId || cleanId);
}

export async function clearWebsiteCache(): Promise<void> {
  websiteCache.clear();
  inFlightResolutions.clear();
  await removeWebsiteFromRedis();
  await invalidateWebsiteModulesCache();
}

export async function hasTenantModuleAllowance(websiteOrId: any, moduleSlug: string): Promise<boolean> {
  if (!websiteOrId || !moduleSlug) return false;

  const targetSlug = String(moduleSlug).trim().toLowerCase();
  const candidates = expandModuleKeys(targetSlug);

  const checkWebsite = (w: any): boolean => {
    const controlSlugs = Array.isArray(w?.allowed_control_module_slugs)
      ? w.allowed_control_module_slugs
      : (Array.isArray(w?.allowed_module_slugs) ? w.allowed_module_slugs : []);
    const homeSlugs = Array.isArray(w?.allowed_home_module_slugs) ? w.allowed_home_module_slugs : [];
    const slugSet = new Set(
      [...controlSlugs, ...homeSlugs].map((s: any) => String(s || '').trim().toLowerCase()).filter(Boolean)
    );
    if (slugSet.size === 0 && Array.isArray(w?.allowed_control_modules)) {
      for (const m of w.allowed_control_modules) {
        if (m?.slug) slugSet.add(String(m.slug).trim().toLowerCase());
      }
    }
    return candidates.some((c) => slugSet.has(c));
  };

  if (typeof websiteOrId === 'object' && (Array.isArray(websiteOrId.allowed_module_slugs) || Array.isArray(websiteOrId.allowed_control_modules))) {
    return checkWebsite(websiteOrId);
  }

  const website = typeof websiteOrId === 'object' ? websiteOrId : await resolveWebsite(websiteOrId);
  if (!website) return false;

  return checkWebsite(website);
}

export async function getTenantAllowedModules(websiteOrId: any): Promise<any> {
  const website = typeof websiteOrId === 'object' ? websiteOrId : await resolveWebsite(websiteOrId);
  if (!website) {
    return { package: null, allowed_modules: [], allowed_module_slugs: [] };
  }
  return {
    package: website.package || null,
    allowed_modules: website.allowed_modules || [],
    allowed_module_slugs: website.allowed_module_slugs || [],
  };
}

const websiteResolver = {
  extractWebsiteIdentifier,
  resolveWebsite,
  resolveWebsiteFromRequest,
  getWebsiteById,
  getWebsiteBySlug,
  getWebsiteByDomain,
  getWebsiteFromCache,
  getWebsiteFromCacheAsync,
  invalidateWebsiteCache,
  clearWebsiteCache,
  hasTenantModuleAllowance,
  getTenantAllowedModules,
};

export default websiteResolver;
