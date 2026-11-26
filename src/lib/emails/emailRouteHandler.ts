import { NextResponse } from 'next/server';
import { hasModulePermission } from 'src/lib/middleware/developer';
import {
  dispatchAudienceEmailCampaign,
  EmailAudience,
  fetchAudienceEmailLogs,
  fetchAudienceRecipients,
  getAudienceMonthlyStats,
  getRecentCampaigns,
  normalizeAudience,
} from 'src/lib/redis/platformEmailQueue';

async function checkAudiencePermission(request: any, audience: EmailAudience) {
  const permCandidates = [
    `email-${audience}`,
    `emails`,
    audience,
    'marketing',
  ];
  return hasModulePermission(request, permCandidates);
}

export async function handleAudienceEmailGet(request: any, rawAudience: string | null | undefined) {
  try {
    const audience = normalizeAudience(rawAudience);
    if (!audience) {
      return NextResponse.json(
        { success: false, error: 'Valid audience (creators, subscribers, developers, leads) is required.' },
        { status: 400 }
      );
    }

    const auth = await checkAudiencePermission(request, audience);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Unauthorized' },
        { status: auth.status || 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const [{ recipients, source }, logs, campaigns, monthly] = await Promise.all([
      fetchAudienceRecipients(audience, forceRefresh),
      fetchAudienceEmailLogs(audience, 100),
      getRecentCampaigns(audience),
      getAudienceMonthlyStats(audience),
    ]);

    const activeCount = recipients.filter((r) => r.is_active).length;

    return NextResponse.json({
      success: true,
      audience,
      source,
      recipients,
      logs,
      campaigns,
      stats: {
        totalRecipients: recipients.length,
        activeRecipients: activeCount,
        sentThisMonth: monthly.sentThisMonth,
        failedThisMonth: monthly.failedThisMonth,
        redisConnected: monthly.redisConnected,
        totalLogs: logs.length,
      },
    });
  } catch (error: any) {
    console.error('Error in audience email GET:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to load email module.' }, { status: 500 });
  }
}

export async function handleAudienceEmailPost(request: any, rawAudience: string | null | undefined) {
  try {
    const audience = normalizeAudience(rawAudience);
    if (!audience) {
      return NextResponse.json(
        { success: false, error: 'Valid audience (creators, subscribers, developers, leads) is required.' },
        { status: 400 }
      );
    }

    const auth = await checkAudiencePermission(request, audience);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Unauthorized' },
        { status: auth.status || 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const subject = String(body.subject || '').trim();
    const message = String(body.message || '').trim();
    const ctaLabel = body.ctaLabel ? String(body.ctaLabel).trim() : null;
    const ctaUrl = body.ctaUrl ? String(body.ctaUrl).trim() : null;
    const purpose = String(body.purpose || 'broadcast').trim();
    const targetMode = String(body.targetMode || 'all_active').toLowerCase().trim();

    if (!subject || !message) {
      return NextResponse.json(
        { success: false, error: 'Subject and email message content are required.' },
        { status: 400 }
      );
    }

    let targets: Array<{ id?: number | null; name?: string | null; email: string }> = [];

    if (targetMode === 'custom') {
      const rawCustom = Array.isArray(body.customEmails)
        ? body.customEmails
        : String(body.customEmails || '')
            .split(/[\s,;]+/)
            .map((e: string) => e.trim())
            .filter(Boolean);
      const { recipients: allAudience } = await fetchAudienceRecipients(audience);
      const lookupByEmail = new Map(allAudience.map((r) => [r.email, r]));
      targets = rawCustom.map((email: string) => {
        const clean = String(email).trim().toLowerCase();
        const found = lookupByEmail.get(clean);
        return found || { id: null, name: clean, email: clean };
      });
    } else {
      const { recipients: allAudience } = await fetchAudienceRecipients(audience, true);
      if (targetMode === 'selected') {
        const selectedIds = new Set((Array.isArray(body.recipientIds) ? body.recipientIds : []).map((id: any) => Number(id)));
        targets = allAudience.filter((r) => r.id !== null && selectedIds.has(Number(r.id)));
      } else {
        targets = allAudience.filter((r) => r.is_active);
      }
    }

    if (targets.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid email recipients matched your selection.' },
        { status: 400 }
      );
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null;

    const senderName = auth.staff?.name || auth.user?.name || auth.developer?.name || 'Developer';
    const result = await dispatchAudienceEmailCampaign({
      audience,
      recipients: targets,
      subject,
      message,
      purpose,
      ctaLabel,
      ctaUrl,
      createdBy: senderName,
      ip,
    });

    return NextResponse.json({
      success: true,
      audience,
      campaign: result.campaign,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      errors: result.errors.slice(0, 10),
      message: `Queued via ${result.campaign.engine === 'redis' ? 'Redis' : 'Queue'}: ${result.sentCount} delivered, ${result.failedCount} failed.`,
    });
  } catch (error: any) {
    console.error('Error in audience email POST:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to dispatch emails.' }, { status: 500 });
  }
}
