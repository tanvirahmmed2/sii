import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStaffSession } from 'src/lib/middleware/staff.js';

async function verifyStaffAccess(request, context) {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }
  const staffSession = await getStaffSession(request);
  if (!staffSession) {
    return { error: 'Unauthorized: Staff access required.', status: 401 };
  }

  const staffWebsiteId =
    staffSession?.website_id ||
    staffSession?.websiteId ||
    staffSession?.staff?.websiteId ||
    staffSession?.staff?.website_id;

  if (staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
  }

  return { website, staffSession };
}

// GET: Load tenant domains, storage usages, quotas, and feature flags
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const websiteId = auth.website.id;

    // 1. Domains
    const domainsRes = await queryDb(
      `SELECT * FROM website_domains WHERE website_id = $1 ORDER BY is_primary DESC, created_at DESC`,
      [websiteId]
    );

    // 2. Storage Usages
    const storageRes = await queryDb(
      `SELECT * FROM website_storage_usages WHERE website_id = $1 ORDER BY storage_type ASC`,
      [websiteId]
    );

    // 3. Quotas
    let quotasRes = await queryDb(
      `SELECT * FROM website_usage_quotas WHERE website_id = $1`,
      [websiteId]
    );

    // Initialize default quota row if not exists
    if (quotasRes.rows.length === 0) {
      const initQuota = await queryDb(
        `INSERT INTO website_usage_quotas (website_id, max_storage_bytes, sms_credits_total, sms_credits_used, email_credits_total, max_students, max_staff, max_custom_domains)
         VALUES ($1, 5368709120, 1000, 0, 5000, 500, 50, 2)
         RETURNING *`,
        [websiteId]
      );
      quotasRes = initQuota;
    }

    // 4. Feature Flags
    const flagsRes = await queryDb(
      `SELECT * FROM website_feature_flags WHERE website_id = $1 ORDER BY feature_key ASC`,
      [websiteId]
    );

    return NextResponse.json({
      success: true,
      domains: domainsRes.rows || [],
      storage_usages: storageRes.rows || [],
      quotas: quotasRes.rows[0] || null,
      feature_flags: flagsRes.rows || [],
    });
  } catch (error) {
    console.error('Error in tenant-quotas GET:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST: Add new custom domain or create/toggle a feature flag
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json();
    const { action } = body;
    const websiteId = auth.website.id;

    if (action === 'add_domain') {
      const { domain, is_primary } = body;
      if (!domain) {
        return NextResponse.json({ success: false, error: 'Domain name is required' }, { status: 400 });
      }

      const cleanDomain = String(domain).toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      const verificationToken = `sii-verify-${Math.random().toString(36).substring(2, 15)}`;

      const res = await queryDb(
        `INSERT INTO website_domains (website_id, domain, is_primary, ssl_status, verification_token, is_verified)
         VALUES ($1, $2, $3, 'pending', $4, FALSE)
         RETURNING *`,
        [websiteId, cleanDomain, Boolean(is_primary), verificationToken]
      );

      return NextResponse.json({ success: true, message: 'Domain registered successfully', domain: res.rows[0] });
    }

    if (action === 'toggle_flag') {
      const { feature_key, is_enabled, description, config } = body;
      if (!feature_key) {
        return NextResponse.json({ success: false, error: 'Feature key is required' }, { status: 400 });
      }

      const res = await queryDb(
        `INSERT INTO website_feature_flags (website_id, feature_key, is_enabled, description, config)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (website_id, feature_key)
         DO UPDATE SET is_enabled = EXCLUDED.is_enabled,
                       description = COALESCE(EXCLUDED.description, website_feature_flags.description),
                       config = COALESCE(EXCLUDED.config, website_feature_flags.config),
                       updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [websiteId, feature_key.trim(), Boolean(is_enabled), description || null, JSON.stringify(config || {})]
      );

      return NextResponse.json({ success: true, message: 'Feature flag updated', flag: res.rows[0] });
    }

    return NextResponse.json({ success: false, error: 'Invalid action specified' }, { status: 400 });
  } catch (error) {
    console.error('Error in tenant-quotas POST:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Remove domain or feature flag
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const domainId = searchParams.get('domain_id');
    const flagKey = searchParams.get('feature_key');
    const websiteId = auth.website.id;

    if (domainId) {
      await queryDb(`DELETE FROM website_domains WHERE id = $1 AND website_id = $2`, [domainId, websiteId]);
      return NextResponse.json({ success: true, message: 'Domain deleted successfully' });
    }

    if (flagKey) {
      await queryDb(`DELETE FROM website_feature_flags WHERE feature_key = $1 AND website_id = $2`, [flagKey, websiteId]);
      return NextResponse.json({ success: true, message: 'Feature flag removed' });
    }

    return NextResponse.json({ success: false, error: 'Target ID not provided' }, { status: 400 });
  } catch (error) {
    console.error('Error in tenant-quotas DELETE:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

