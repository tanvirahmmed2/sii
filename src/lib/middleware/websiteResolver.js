import { query, queryDb } from '../database/db.js';
import { BASE_DOMAIN, BASE_URL, extractBaseDomain } from '../database/secret.js';

// Configuration
const DEFAULT_CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL for valid websites
const DEFAULT_NEGATIVE_CACHE_TTL_MS = 5 * 1000; // 5 seconds negative cache on not-found or DB errors
const QUERY_TIMEOUT_MS = 10000; // 10s timeout prevents DNS/pooler hangs on remote connections

// In-memory cache structures
const websiteCache = new Map();
const inFlightResolutions = new Map();

// Lazy schema migration flag
let _websiteSchemaEnsured = false;

/**
 * Ensure optional website social links schema columns exist in DB in the background.
 * Non-blocking: executed asynchronously without delaying website resolution.
 */
function ensureWebsiteSchemaAsync() {
  if (_websiteSchemaEnsured) return;
  _websiteSchemaEnsured = true;
  query(`
    ALTER TABLE websites
    ADD COLUMN IF NOT EXISTS facebook_url TEXT,
    ADD COLUMN IF NOT EXISTS twitter_url TEXT,
    ADD COLUMN IF NOT EXISTS instagram_url TEXT,
    ADD COLUMN IF NOT EXISTS youtube_url TEXT,
    ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
  `).catch(() => {
    // Ignore schema errors silently (e.g., read-only replicas or permission constraints)
  });
}

/**
 * Extract website identifier (slug, subdomain, custom domain, or ID) from request or context.
 * Supports Next.js 15 async route context params, standard Next.js request, URL headers, and cookies.
 *
 * @param {Request|object|null} request
 * @param {object|string|null} context
 * @returns {Promise<string|null>}
 */
export async function extractWebsiteIdentifier(request, context) {
  // 1. Direct string context (e.g. resolveWebsite('afit'))
  if (typeof context === 'string' && context.trim()) {
    return context.trim().toLowerCase().split(':')[0];
  }

  // 2. Route Context Params (handles both Promise params for Next.js 15+ and plain objects)
  if (context?.params) {
    try {
      const resolvedParams = typeof context.params.then === 'function' 
        ? await context.params 
        : context.params;

      const candidate = resolvedParams?.domain || resolvedParams?.slug || resolvedParams?.websiteId || resolvedParams?.tenant;
      if (candidate) {
        return String(candidate).trim().toLowerCase().split(':')[0];
      }
    } catch {}
  }

  // 3. Request-based extraction
  if (request) {
    // URL Search parameters
    const url = request.nextUrl || (request.url ? new URL(request.url, 'http://localhost') : null);
    if (url?.searchParams) {
      const queryParam =
        url.searchParams.get('domain') ||
        url.searchParams.get('slug') ||
        url.searchParams.get('subdomain') ||
        url.searchParams.get('websiteId') ||
        url.searchParams.get('tenant');
      if (queryParam) {
        return queryParam.trim().toLowerCase().split(':')[0];
      }
    }

    // Direct headers set by edge middleware or proxies
    const headerDomain =
      request.headers?.get?.('x-website-domain') ||
      request.headers?.get?.('x-domain');
    if (headerDomain) {
      return headerDomain.trim().toLowerCase().split(':')[0];
    }

    // Cookies
    const cookieDomain =
      request.cookies?.get?.('x-website-domain')?.value ||
      request.cookies?.get?.('x-domain')?.value ||
      request.cookies?.get?.('website_slug')?.value;
    if (cookieDomain) {
      return cookieDomain.trim().toLowerCase().split(':')[0];
    }

    // Referer Header (useful for client-side API fetches from /[domain]/...)
    const referer = request.headers?.get?.('referer');
    if (referer) {
      const refMatch = referer.match(/\/(?:websites|website|webite)\/([^/?#]+)/i);
      if (refMatch && refMatch[1]) {
        return decodeURIComponent(refMatch[1]).trim().toLowerCase().split(':')[0];
      }
      try {
        const refUrl = new URL(referer);
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

    // Host Header (e.g. subdomain.domain.com or custom domain)
    const host =
      request.headers?.get?.('x-forwarded-host') ||
      request.headers?.get?.('host') ||
      url?.host ||
      '';
    const cleanHost = host.split(':')[0].toLowerCase();
    if (cleanHost && cleanHost !== 'localhost' && cleanHost !== '127.0.0.1') {
      const base = (BASE_DOMAIN || extractBaseDomain(BASE_URL) || '').toLowerCase();
      if (base && cleanHost.endsWith(`.${base}`)) {
        return cleanHost.replace(`.${base}`, '').trim();
      }
      if (cleanHost.endsWith('.localhost')) {
        return cleanHost.replace('.localhost', '').trim();
      }
      return cleanHost;
    }
  }

  return null;
}

/**
 * Execute raw database query with a strict timeout to avoid connection hangs.
 * Also retrieves tenant subscription package information and allowed modules.
 *
 * @param {string} cleanId
 * @returns {Promise<object|null>}
 */
async function fetchWebsiteFromDb(cleanId) {
  const isNum = /^[0-9]+$/.test(cleanId);
  const noWww = cleanId.replace(/^www\./, '');

  const sql = `
    SELECT id, creator_id, subscription_id, name, slug, subdomain, subdomain AS domain, custom_domain,
           custom_domain_verified, institution_type, eiin_number, contact_email, contact_phone, address,
           facebook_url, twitter_url, instagram_url, youtube_url, linkedin_url,
           primary_color, secondary_color, theme, status, is_maintenance_mode,
           COALESCE(maintenance_message, 'Our campus portal is temporarily under scheduled maintenance. Please check back shortly.') AS maintenance_message,
           COALESCE(currency, 'BDT') AS currency,
           logo, logo_id, favicon, favicon_id,
           (status = 'active') AS is_active,
           (status = 'active' AND is_maintenance_mode = false) AS is_published
    FROM websites 
    WHERE LOWER(slug) = $1 
       OR LOWER(slug) = $2
       OR LOWER(subdomain) = $1 
       OR LOWER(subdomain) = $2
       OR SPLIT_PART(LOWER(subdomain), '.', 1) = $1
       OR SPLIT_PART(LOWER(subdomain), '.', 1) = $2
       OR LOWER(custom_domain) = $1 
       OR LOWER(custom_domain) = $2
       OR LOWER(custom_domain) = 'www.' || $2
       OR LOWER(REPLACE(custom_domain, 'www.', '')) = $2
       OR LOWER(subdomain) LIKE $3
       OR ($4 = true AND id = $5::bigint)
    LIMIT 1
  `;
  const params = [cleanId, noWww, `${cleanId}.%`, isNum, isNum ? Number(cleanId) : -1];

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

    // Default color and configuration fallbacks
    website.primary_color = website.primary_color || '#1e40af';
    website.secondary_color = website.secondary_color || '#0ea5e9';

    // Fetch website subscription package and allowed modules
    let allowedModules = [];
    let allowedModuleSlugs = [];
    let packageInfo = null;

    try {
      const pkgRes = await query(
        `SELECT p.id AS package_id, p.name AS package_name, p.slug AS package_slug,
                p.max_students, p.max_teachers, p.max_staff, p.max_storage_mb, p.max_websites,
                s.id AS subscription_id, s.status AS subscription_status,
                COALESCE(
                  (
                    SELECT json_agg(
                      json_build_object(
                        'id', wm.id,
                        'name', wm.name,
                        'slug', wm.slug,
                        'description', wm.description,
                        'icon', wm.icon
                      ) ORDER BY wm.id ASC
                    )
                    FROM package_modules pm
                    JOIN website_modules wm ON wm.id = pm.website_module_id
                    WHERE pm.package_id = p.id AND wm.is_active = TRUE
                  ),
                  '[]'::json
                ) AS allowed_modules,
                COALESCE(
                  (
                    SELECT array_agg(DISTINCT wm.slug ORDER BY wm.slug ASC)
                    FROM package_modules pm
                    JOIN website_modules wm ON wm.id = pm.website_module_id
                    WHERE pm.package_id = p.id AND wm.is_active = TRUE
                  ),
                  ARRAY[]::varchar[]
                ) AS allowed_module_slugs
         FROM subscriptions s
         JOIN packages p ON p.id = s.package_id
         WHERE (s.id = $1 OR s.website_id = $2)
           AND s.status = 'active'
         ORDER BY (s.id = $1) DESC, s.id DESC
         LIMIT 1`,
        [website.subscription_id || 0, website.id]
      );

      if (pkgRes && pkgRes.rows && pkgRes.rows.length > 0) {
        const pRow = pkgRes.rows[0];
        packageInfo = {
          id: pRow.package_id,
          name: pRow.package_name,
          slug: pRow.package_slug,
          max_students: pRow.max_students,
          max_teachers: pRow.max_teachers,
          max_staff: pRow.max_staff,
          max_storage_mb: pRow.max_storage_mb,
          subscription_id: pRow.subscription_id,
          subscription_status: pRow.subscription_status,
        };
        allowedModules = pRow.allowed_modules || [];
        allowedModuleSlugs = pRow.allowed_module_slugs || [];
      } else {
        // Fallback: If no subscription is active, load active modules as default allowance
        const fallbackMods = await query(
          `SELECT id, name, slug, description, icon FROM website_modules WHERE is_active = TRUE ORDER BY id ASC`
        ).catch(() => ({ rows: [] }));
        allowedModules = fallbackMods.rows || [];
        allowedModuleSlugs = allowedModules.map((m) => m.slug);
      }
    } catch (e) {
      console.warn('[websiteResolver] Error loading package modules:', e.message);
    }

    website.package = packageInfo;
    website.package_id = packageInfo?.id || null;
    website.package_name = packageInfo?.name || null;
    website.package_slug = packageInfo?.slug || null;
    website.allowed_modules = allowedModules;
    website.allowed_module_slugs = allowedModuleSlugs;
    website.allowedModules = allowedModuleSlugs;

    // Shallow copy settings aliases to maintain compatibility without circular JSON references
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

/**
 * Resolve website record by string or numeric identifier.
 * Uses in-memory TTL caching and in-flight promise coalescing.
 *
 * @param {string|number} identifier
 * @param {object} [options]
 * @param {boolean} [options.bypassCache=false]
 * @param {number} [options.ttlMs]
 * @returns {Promise<object|null>}
 */
export async function resolveWebsite(identifier, options = {}) {
  if (!identifier) return null;

  const cleanId = String(identifier).trim().toLowerCase().split(':')[0];
  if (!cleanId) return null;

  const now = Date.now();
  const bypassCache = options.bypassCache === true;

  // 1. Check in-memory cache
  if (!bypassCache && websiteCache.has(cleanId)) {
    const cached = websiteCache.get(cleanId);
    if (now < cached.expiresAt) {
      return cached.website;
    }
    websiteCache.delete(cleanId);
  }

  // 2. Coalesce in-flight requests for the same identifier
  if (!bypassCache && inFlightResolutions.has(cleanId)) {
    return inFlightResolutions.get(cleanId);
  }

  // Trigger lazy background schema ensure once
  ensureWebsiteSchemaAsync();

  // 3. Perform database resolution with deduplication
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

      // Store in cache for requested identifier
      websiteCache.set(cleanId, cacheEntry);

      // If website was found, also index under its canonical identifiers
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

/**
 * Primary resolver matching the standard signature used across routes, layouts, and auth middlewares.
 *
 * @param {Request|null} request
 * @param {object|string|null} context
 * @param {object} [options]
 * @returns {Promise<object|null>}
 */
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

/**
 * Helper to resolve website strictly by ID.
 *
 * @param {string|number} id
 * @param {object} [options]
 * @returns {Promise<object|null>}
 */
export async function getWebsiteById(id, options = {}) {
  if (!id) return null;
  return resolveWebsite(id, options);
}

/**
 * Helper to resolve website strictly by slug.
 *
 * @param {string} slug
 * @param {object} [options]
 * @returns {Promise<object|null>}
 */
export async function getWebsiteBySlug(slug, options = {}) {
  if (!slug) return null;
  return resolveWebsite(slug, options);
}

/**
 * Helper to resolve website strictly by domain / custom domain.
 *
 * @param {string} domain
 * @param {object} [options]
 * @returns {Promise<object|null>}
 */
export async function getWebsiteByDomain(domain, options = {}) {
  if (!domain) return null;
  return resolveWebsite(domain, options);
}

/**
 * Check if a website is already present in memory cache without querying DB.
 *
 * @param {string|number} identifier
 * @returns {object|null}
 */
export function getWebsiteFromCache(identifier) {
  if (!identifier) return null;
  const cleanId = String(identifier).trim().toLowerCase().split(':')[0];
  const cached = websiteCache.get(cleanId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.website;
  }
  return null;
}

/**
 * Invalidate cache for a specific website identifier or its associated aliases.
 *
 * @param {string|number} [identifier]
 */
export function invalidateWebsiteCache(identifier) {
  if (!identifier) {
    websiteCache.clear();
    return;
  }
  const cleanId = String(identifier).trim().toLowerCase();
  websiteCache.delete(cleanId);

  // Scan and remove any entries matching this website
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

/**
 * Clear the entire website cache.
 */
export function clearWebsiteCache() {
  websiteCache.clear();
  inFlightResolutions.clear();
}

/**
 * Check whether a tenant website has module allowance for a given module slug
 * @param {object|string|number} websiteOrId
 * @param {string} moduleSlug
 * @returns {Promise<boolean>}
 */
export async function hasTenantModuleAllowance(websiteOrId, moduleSlug) {
  if (!websiteOrId || !moduleSlug) return false;

  const targetSlug = String(moduleSlug).trim().toLowerCase();

  // If website object with loaded slugs was passed
  if (typeof websiteOrId === 'object' && Array.isArray(websiteOrId.allowed_module_slugs)) {
    return websiteOrId.allowed_module_slugs.includes(targetSlug);
  }

  // If identifier or ID passed, resolve website
  const website = typeof websiteOrId === 'object' ? websiteOrId : await resolveWebsite(websiteOrId);
  if (!website) return false;

  if (Array.isArray(website.allowed_module_slugs)) {
    return website.allowed_module_slugs.includes(targetSlug);
  }

  return false;
}

/**
 * Get all allowed modules and package metadata for a tenant website
 * @param {object|string|number} websiteOrId
 * @returns {Promise<{ package: object|null, allowed_modules: Array, allowed_module_slugs: Array }>}
 */
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
