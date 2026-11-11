import { query, queryDb } from '../database/db.js';
import { BASE_DOMAIN, BASE_HOST, BASE_URL, extractBaseDomain, getWebsiteDomain } from '../database/secret.js';

const DEFAULT_CACHE_TTL_MS = 60 * 1000; 
const DEFAULT_NEGATIVE_CACHE_TTL_MS = 5 * 1000; 
const QUERY_TIMEOUT_MS = 10000; 

const websiteCache = new Map();
const inFlightResolutions = new Map();

export async function extractWebsiteIdentifier(request, context) {
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
    } catch {}
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
      } catch {}
    }

    const hostTenant = getWebsiteDomain(request);
    if (hostTenant) {
      return hostTenant;
    }
  }

  return null;
}

async function fetchWebsiteFromDb(cleanId) {
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
  const params = [cleanId, noWww, `${cleanId}.%`, isNum, isNum ? Number(cleanId) : -1, subPrefix];

  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Website resolution timed out after ${QUERY_TIMEOUT_MS}ms for identifier: "${cleanId}"`));
    }, QUERY_TIMEOUT_MS);
  });

  try {
    const res = await Promise.race([
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

    let allowedControlModules = [];
    let allowedControlModulePaths = [];
    let allowedControlModuleSlugs = [];
    let allowedHomeModules = [];
    let allowedHomeModulePaths = [];
    let allowedHomeModuleSlugs = [];
    let packageInfo = null;

    try {
      const pkgRes = await query(
        `SELECT p.id AS package_id, p.name AS package_name, p.slug AS package_slug,
                p.short_description, p.description, p.tagline,
                p.monthly_price_usd, p.yearly_price_usd, p.monthly_price_bdt, p.yearly_price_bdt,
                p.monthly_price, p.yearly_price, p.discount_percentage,
                p.max_students, p.max_teachers, p.max_staff, p.max_storage_mb,
                p.monthly_mail, p.monthly_sms,
                p.is_available_student_panel, p.is_available_teacher_panel, p.is_available_custom_domain,
                p.features, p.grace_period,
                s.id AS subscription_id, s.status AS subscription_status,
                s.billing_cycle AS subscription_billing_cycle, s.current_period_end AS subscription_period_end,
                COALESCE(
                  (
                    SELECT json_agg(
                      json_build_object(
                        'id', cm.id,
                        'name', cm.name,
                        'path', cm.path,
                        'category', cm.category,
                        'description', cm.description,
                        'icon', cm.icon
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
                        'name', hm.name,
                        'path', hm.path,
                        'category', hm.category,
                        'description', hm.description,
                        'icon', hm.icon
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
        packageInfo = {
          id: pRow.package_id,
          name: pRow.package_name,
          slug: pRow.package_slug,
          short_description: pRow.short_description,
          description: pRow.description,
          tagline: pRow.tagline,
          monthly_price_usd: pRow.monthly_price_usd,
          yearly_price_usd: pRow.yearly_price_usd,
          monthly_price_bdt: pRow.monthly_price_bdt,
          yearly_price_bdt: pRow.yearly_price_bdt,
          monthly_price: pRow.monthly_price,
          yearly_price: pRow.yearly_price,
          discount_percentage: pRow.discount_percentage,
          max_students: pRow.max_students,
          max_teachers: pRow.max_teachers,
          max_staff: pRow.max_staff,
          max_storage_mb: pRow.max_storage_mb,
          monthly_mail: pRow.monthly_mail,
          monthly_sms: pRow.monthly_sms,
          is_available_student_panel: pRow.is_available_student_panel ?? true,
          is_available_teacher_panel: pRow.is_available_teacher_panel ?? true,
          is_available_custom_domain: pRow.is_available_custom_domain ?? false,
          features: pRow.features || [],
          grace_period: pRow.grace_period,
          subscription_id: pRow.subscription_id,
          subscription_status: pRow.subscription_status,
          subscription_billing_cycle: pRow.subscription_billing_cycle,
          subscription_period_end: pRow.subscription_period_end,
        };
        allowedControlModules = pRow.allowed_control_modules || [];
        allowedControlModulePaths = pRow.allowed_control_module_paths || [];
        allowedControlModuleSlugs = pRow.allowed_control_module_slugs || [];
        allowedHomeModules = pRow.allowed_home_modules || [];
        allowedHomeModulePaths = pRow.allowed_home_module_paths || [];
        allowedHomeModuleSlugs = pRow.allowed_home_module_slugs || [];
      } else {
        const [fallbackControl, fallbackHome] = await Promise.all([
          query(`SELECT id, name, path, category, description, icon FROM website_control_modules WHERE is_active = TRUE ORDER BY display_order ASC, id ASC`).catch(() => ({ rows: [] })),
          query(`SELECT id, name, path, category, description, icon FROM website_home_modules WHERE is_active = TRUE ORDER BY display_order ASC, id ASC`).catch(() => ({ rows: [] }))
        ]);
        allowedControlModules = fallbackControl.rows || [];
        allowedControlModulePaths = allowedControlModules.map((m) => m.path).filter(Boolean);
        allowedControlModuleSlugs = [];
        allowedHomeModules = fallbackHome.rows || [];
        allowedHomeModulePaths = allowedHomeModules.map((m) => m.path).filter(Boolean);
        allowedHomeModuleSlugs = [];
      }
    } catch (e) {
      console.warn('[websiteResolver] Error loading package modules:', e.message);
    }

    website.package = packageInfo;
    website.package_id = packageInfo?.id || null;
    website.package_name = packageInfo?.name || null;
    website.package_slug = packageInfo?.slug || null;

    website.is_available_student_panel = packageInfo ? Boolean(packageInfo.is_available_student_panel) : true;
    website.is_available_teacher_panel = packageInfo ? Boolean(packageInfo.is_available_teacher_panel) : true;
    website.is_available_custom_domain = packageInfo ? Boolean(packageInfo.is_available_custom_domain) : false;

    website.allowed_control_modules = allowedControlModules;
    website.allowed_control_module_paths = allowedControlModulePaths;
    website.allowed_control_module_slugs = allowedControlModuleSlugs;

    website.allowed_home_modules = allowedHomeModules;
    website.allowed_home_module_paths = allowedHomeModulePaths;
    website.allowed_home_module_slugs = allowedHomeModuleSlugs;

    website.allowed_modules = allowedControlModules;
    website.allowed_module_slugs = allowedControlModuleSlugs;
    website.allowedModules = allowedControlModuleSlugs;

    const settingsCopy = { ...website };
    website.settings = settingsCopy;
    website.website_settings = settingsCopy;

    return website;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error(`[websiteResolver] Error querying website for "${cleanId}":`, err.message || err);
    return null;
  }
}

export async function resolveWebsite(identifier, options = {}) {
  if (!identifier) return null;

  const cleanId = String(identifier).trim().toLowerCase().split(':')[0];
  if (!cleanId) return null;

  const now = Date.now();
  const bypassCache = options.bypassCache === true;

  if (!bypassCache && websiteCache.has(cleanId)) {
    const cached = websiteCache.get(cleanId);
    if (now < cached.expiresAt) {
      return cached.website;
    }
    websiteCache.delete(cleanId);
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

      const cacheEntry = {
        website,
        expiresAt: Date.now() + ttl,
      };

      websiteCache.set(cleanId, cacheEntry);

      if (website) {
        if (website.slug) websiteCache.set(String(website.slug).toLowerCase(), cacheEntry);
        if (website.subdomain) websiteCache.set(String(website.subdomain).toLowerCase(), cacheEntry);
        if (website.custom_domain) websiteCache.set(String(website.custom_domain).toLowerCase(), cacheEntry);
        if (website.id) websiteCache.set(String(website.id), cacheEntry);
      }

      return website;
    } finally {
      inFlightResolutions.delete(cleanId);
    }
  })();

  inFlightResolutions.set(cleanId, resolutionPromise);
  return resolutionPromise;
}

export async function resolveWebsiteFromRequest(request, context, options = {}) {
  try {
    const identifier = await extractWebsiteIdentifier(request, context);
    if (!identifier) return null;
    return await resolveWebsite(identifier, options);
  } catch (error) {
    console.error('[websiteResolver] resolveWebsiteFromRequest error:', error);
    return null;
  }
}

export async function getWebsiteById(id, options = {}) {
  if (!id) return null;
  return resolveWebsite(id, options);
}

export async function getWebsiteBySlug(slug, options = {}) {
  if (!slug) return null;
  return resolveWebsite(slug, options);
}

export async function getWebsiteByDomain(domain, options = {}) {
  if (!domain) return null;
  return resolveWebsite(domain, options);
}

export function getWebsiteFromCache(identifier) {
  if (!identifier) return null;
  const cleanId = String(identifier).trim().toLowerCase().split(':')[0];
  const cached = websiteCache.get(cleanId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.website;
  }
  return null;
}

export function invalidateWebsiteCache(identifier) {
  if (!identifier) {
    websiteCache.clear();
    return;
  }
  const cleanId = String(identifier).trim().toLowerCase();
  websiteCache.delete(cleanId);

  for (const [key, entry] of websiteCache.entries()) {
    const w = entry?.website;
    if (
      w &&
      (String(w.id) === cleanId ||
       String(w.slug).toLowerCase() === cleanId ||
       String(w.subdomain).toLowerCase() === cleanId ||
       String(w.custom_domain).toLowerCase() === cleanId)
    ) {
      websiteCache.delete(key);
    }
  }
}

export function clearWebsiteCache() {
  websiteCache.clear();
  inFlightResolutions.clear();
}

export async function hasTenantModuleAllowance(websiteOrId, moduleSlug) {
  if (!websiteOrId || !moduleSlug) return false;

  const targetSlug = String(moduleSlug).trim().toLowerCase();

  if (typeof websiteOrId === 'object' && Array.isArray(websiteOrId.allowed_module_slugs)) {
    return websiteOrId.allowed_module_slugs.includes(targetSlug);
  }

  const website = typeof websiteOrId === 'object' ? websiteOrId : await resolveWebsite(websiteOrId);
  if (!website) return false;

  if (Array.isArray(website.allowed_module_slugs)) {
    return website.allowed_module_slugs.includes(targetSlug);
  }

  return false;
}

export async function getTenantAllowedModules(websiteOrId) {
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
  invalidateWebsiteCache,
  clearWebsiteCache,
  hasTenantModuleAllowance,
  getTenantAllowedModules,
};

export default websiteResolver;
