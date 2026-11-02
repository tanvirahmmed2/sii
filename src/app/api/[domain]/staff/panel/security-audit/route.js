import { NextResponse } from 'next/server';
import crypto from 'crypto';
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

// GET: Load audit logs, API keys, webhook deliveries, and background jobs
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const websiteId = auth.website.id;

    // 1. Audit Logs (Recent 50 changes)
    const auditRes = await queryDb(
      `SELECT * FROM website_audit_logs 
       WHERE website_id = $1 
       ORDER BY logged_at DESC 
       LIMIT 50`,
      [websiteId]
    );

    // 2. API Keys
    const keysRes = await queryDb(
      `SELECT id, website_id, name, key_prefix, permissions, is_active, expires_at, last_used_at, created_at
       FROM website_api_keys 
       WHERE website_id = $1 
       ORDER BY created_at DESC`,
      [websiteId]
    );

    // 3. Webhook Events (Recent 40)
    const webhooksRes = await queryDb(
      `SELECT * FROM website_webhook_events 
       WHERE website_id = $1 
       ORDER BY created_at DESC 
       LIMIT 40`,
      [websiteId]
    );

    // 4. Background Jobs (Recent 40)
    const jobsRes = await queryDb(
      `SELECT * FROM website_background_jobs 
       WHERE website_id = $1 
       ORDER BY scheduled_at DESC 
       LIMIT 40`,
      [websiteId]
    );

    return NextResponse.json({
      success: true,
      audit_logs: auditRes.rows || [],
      api_keys: keysRes.rows || [],
      webhook_events: webhooksRes.rows || [],
      background_jobs: jobsRes.rows || [],
    });
  } catch (error) {
    console.error('Error in security-audit GET:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST: Create API key or trigger job retry
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json();
    const { action } = body;
    const websiteId = auth.website.id;

    if (action === 'create_api_key') {
      const { name, permissions } = body;
      if (!name) {
        return NextResponse.json({ success: false, error: 'Key name is required' }, { status: 400 });
      }

      // Generate secret key
      const rawSecret = `sii_${crypto.randomBytes(24).toString('hex')}`;
      const keyPrefix = rawSecret.substring(0, 10);
      const keyHash = crypto.createHash('sha256').update(rawSecret).digest('hex');

      const res = await queryDb(
        `INSERT INTO website_api_keys (website_id, name, key_hash, key_prefix, permissions, is_active)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         RETURNING id, name, key_prefix, permissions, is_active, created_at`,
        [websiteId, name.trim(), keyHash, keyPrefix, JSON.stringify(permissions || ['read', 'write'])]
      );

      // Return rawSecret ONCE to the user
      return NextResponse.json({
        success: true,
        message: 'API Key generated. Copy the secret now, it will not be shown again.',
        api_key: res.rows[0],
        secret_key: rawSecret,
      });
    }

    if (action === 'retry_job') {
      const { job_id } = body;
      await queryDb(
        `UPDATE website_background_jobs 
         SET status = 'queued', attempts = 0, last_error = NULL 
         WHERE id = $1 AND website_id = $2`,
        [job_id, websiteId]
      );
      return NextResponse.json({ success: true, message: 'Background job re-queued' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action specified' }, { status: 400 });
  } catch (error) {
    console.error('Error in security-audit POST:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Revoke API key
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('key_id');
    const websiteId = auth.website.id;

    if (keyId) {
      await queryDb(`DELETE FROM website_api_keys WHERE id = $1 AND website_id = $2`, [keyId, websiteId]);
      return NextResponse.json({ success: true, message: 'API key revoked' });
    }

    return NextResponse.json({ success: false, error: 'Target ID not provided' }, { status: 400 });
  } catch (error) {
    console.error('Error in security-audit DELETE:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

