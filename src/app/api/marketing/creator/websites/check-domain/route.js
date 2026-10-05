import { NextResponse } from 'next/server.js';
import { queryDb } from '../../../../../../lib/database/db.js';
import { BASE_DOMAIN, BASE_URL } from '../../../../../../lib/database/secret.js';

export const dynamic = 'force-dynamic';

const RESERVED_DOMAINS = new Set([
  'admin', 'administrator', 'api', 'app', 'auth', 'billing', 'blog', 'blogs',
  'cdn', 'chat', 'chats', 'creator', 'creators', 'dashboard', 'dev', 'developer',
  'developers', 'docs', 'educraft', 'email', 'ftp', 'help', 'hiesci', 'host',
  'imap', 'internal', 'live', 'login', 'logout', 'mail', 'manage', 'management',
  'meta', 'my', 'news', 'ns', 'ns1', 'ns2', 'official', 'portal', 'pop',
  'production', 'root', 'security', 'server', 'sii', 'site', 'sites', 'smtp',
  'staff', 'stage', 'staging', 'status', 'store', 'student', 'students', 'subdomain',
  'superadmin', 'support', 'system', 'teacher', 'teachers', 'test', 'user', 'users',
  'webmail', 'website', 'websites', 'workspace', 'www'
]);

export function extractRequestHost(request) {
  if (!request) return null;
  const fHost = request.headers?.get?.('x-forwarded-host');
  if (fHost) return fHost.split(',')[0].trim();
  const host = request.headers?.get?.('host');
  if (host) return host.trim();
  return null;
}

export async function checkDomainAvailability(rawInput, websiteIdToExclude = null, request = null) {
  const reqHost = extractRequestHost(request);
  const baseDomain = reqHost || BASE_DOMAIN || 'localhost:3000';

  if (!rawInput || typeof rawInput !== 'string') {
    return {
      available: false,
      error: 'Please enter a domain prefix.',
      code: 'EMPTY',
      baseDomain,
    };
  }

  let clean = rawInput.trim().toLowerCase();
  clean = clean.replace(/^https?:\/\//, '');

  // Strip trailing baseDomain if present
  if (clean.endsWith(`.${baseDomain.toLowerCase()}`)) {
    clean = clean.slice(0, -(baseDomain.length + 1));
  } else if (clean.includes('.')) {
    clean = clean.split('.')[0];
  }

  // Sanitize characters: only letters, numbers, single hyphens
  clean = clean.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');

  if (clean.length === 0) {
    return {
      available: false,
      error: 'Please enter a valid domain prefix.',
      code: 'EMPTY',
      baseDomain,
    };
  }

  if (clean.length < 3) {
    return {
      available: false,
      domain: clean,
      baseDomain,
      fullDomain: `${clean}.${baseDomain}`,
      error: 'Domain must be at least 3 characters long.',
      code: 'TOO_SHORT',
    };
  }

  if (clean.length > 63) {
    return {
      available: false,
      domain: clean,
      baseDomain,
      fullDomain: `${clean}.${baseDomain}`,
      error: 'Domain prefix cannot exceed 63 characters.',
      code: 'TOO_LONG',
    };
  }

  if (clean.startsWith('-') || clean.endsWith('-')) {
    return {
      available: false,
      domain: clean,
      baseDomain,
      fullDomain: `${clean}.${baseDomain}`,
      error: 'Domain prefix cannot start or end with a hyphen.',
      code: 'INVALID_HYPHEN',
    };
  }

  if (RESERVED_DOMAINS.has(clean)) {
    return {
      available: false,
      domain: clean,
      baseDomain,
      fullDomain: `${clean}.${baseDomain}`,
      error: `"${clean}.${baseDomain}" is reserved for system services. Please choose another prefix.`,
      code: 'RESERVED',
    };
  }

  const fullDomain = `${clean}.${baseDomain}`;

  try {
    let queryText = `
      SELECT id, name, subdomain, custom_domain 
      FROM websites 
      WHERE (
        LOWER(subdomain) = LOWER($1) 
        OR LOWER(subdomain) = LOWER($2) 
        OR LOWER(custom_domain) = LOWER($1) 
        OR LOWER(custom_domain) = LOWER($2) 
        OR LOWER(slug) = LOWER($1)
      )
    `;
    const params = [clean, fullDomain];

    if (websiteIdToExclude && !isNaN(Number(websiteIdToExclude))) {
      queryText += ' AND id != $3';
      params.push(Number(websiteIdToExclude));
    }

    queryText += ' LIMIT 1';

    const checkRes = await queryDb(queryText, params);

    if (checkRes.rows.length > 0) {
      return {
        available: false,
        domain: clean,
        baseDomain,
        fullDomain,
        error: `Domain "${fullDomain}" is already in use. Please try another name.`,
        code: 'TAKEN',
      };
    }

    return {
      available: true,
      domain: clean,
      baseDomain,
      fullDomain,
      message: `Domain "${fullDomain}" is available!`,
      code: 'AVAILABLE',
    };
  } catch (error) {
    console.error('Domain availability check database error:', error);
    return {
      available: false,
      domain: clean,
      baseDomain,
      fullDomain,
      error: 'Failed to verify domain availability due to a server error.',
      code: 'SERVER_ERROR',
    };
  }
}

/**
 * Checks availability and validity of external custom domains (e.g. schoolname.edu)
 */
export async function checkCustomDomainAvailability(rawInput, websiteIdToExclude = null, request = null) {
  const reqHost = extractRequestHost(request);
  const baseDomain = reqHost || BASE_DOMAIN || 'localhost:3000';
  const cleanBase = baseDomain.split(':')[0].toLowerCase();

  if (!rawInput || typeof rawInput !== 'string') {
    return {
      available: false,
      error: 'Please enter a custom domain (e.g., myschool.edu).',
      code: 'EMPTY',
    };
  }

  let clean = rawInput.trim().toLowerCase();
  clean = clean.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
  clean = clean.split(':')[0]; // strip port

  if (!clean) {
    return {
      available: false,
      error: 'Please enter a valid domain.',
      code: 'EMPTY',
    };
  }

  // Must contain at least one dot
  if (!clean.includes('.')) {
    return {
      available: false,
      customDomain: clean,
      error: 'Custom domain must include a top-level domain (e.g., .edu, .org, .com).',
      code: 'INVALID_FORMAT',
    };
  }

  // Hostname validation regex
  const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;
  if (!domainRegex.test(clean) || clean.length < 4 || clean.length > 253) {
    return {
      available: false,
      customDomain: clean,
      error: 'Invalid custom domain format. Example: school.edu or academy.org',
      code: 'INVALID_FORMAT',
    };
  }

  // Prevent connecting the SaaS root domain as a tenant custom domain
  if (clean === cleanBase || clean === `www.${cleanBase}` || clean.endsWith(`.${cleanBase}`) || clean.endsWith('.localhost')) {
    return {
      available: false,
      customDomain: clean,
      error: 'Cannot use platform host as custom domain. Use subdomain configuration instead.',
      code: 'PLATFORM_DOMAIN',
    };
  }

  try {
    let queryText = 'SELECT id, name, custom_domain FROM websites WHERE LOWER(custom_domain) = LOWER($1)';
    const params = [clean];

    if (websiteIdToExclude && !isNaN(Number(websiteIdToExclude))) {
      queryText += ' AND id != $2';
      params.push(Number(websiteIdToExclude));
    }

    queryText += ' LIMIT 1';

    const checkRes = await queryDb(queryText, params);

    if (checkRes.rows.length > 0) {
      return {
        available: false,
        customDomain: clean,
        error: `Custom domain "${clean}" is already connected to another website.`,
        code: 'TAKEN',
      };
    }

    return {
      available: true,
      customDomain: clean,
      message: `Custom domain "${clean}" is available to connect!`,
      code: 'AVAILABLE',
      dnsInstructions: {
        type: 'CNAME',
        host: '@',
        value: cleanBase || 'cname.educraft.io',
      },
    };
  } catch (error) {
    console.error('Custom domain check error:', error);
    return {
      available: false,
      customDomain: clean,
      error: 'Failed to verify custom domain availability.',
      code: 'SERVER_ERROR',
    };
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || '';
  const domain = searchParams.get('domain') || searchParams.get('subdomain') || searchParams.get('customDomain') || searchParams.get('q') || '';
  const websiteId = searchParams.get('websiteId') || searchParams.get('id') || null;

  if (type === 'custom' || searchParams.get('customDomain')) {
    const customResult = await checkCustomDomainAvailability(domain, websiteId, request);
    return NextResponse.json({
      success: true,
      ...customResult,
    });
  }

  const result = await checkDomainAvailability(domain, websiteId, request);
  return NextResponse.json({
    success: true,
    ...result,
  });
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const type = body.type || (body.customDomain ? 'custom' : 'subdomain');
    const domain = body.domain || body.subdomain || body.customDomain || '';
    const websiteId = body.websiteId || body.id || null;

    if (type === 'custom') {
      const customResult = await checkCustomDomainAvailability(domain, websiteId, request);
      return NextResponse.json({
        success: true,
        ...customResult,
      });
    }

    const result = await checkDomainAvailability(domain, websiteId, request);
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err.message,
    }, { status: 500 });
  }
}
