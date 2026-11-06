import { NextResponse } from 'next/server';
import { verifyStaffPaymentAccess } from 'src/lib/database/paymentGateways.js';
import { getWebsiteMonthlyUsageAndLimits } from 'src/lib/database/usageLimiter.js';

/**
 * GET /api/[domain]/staff/panel/usage
 * Returns current monthly email and SMS consumption against subscription package quotas.
 */
export async function GET(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const websiteId = auth.website.id;
    const usage = await getWebsiteMonthlyUsageAndLimits(websiteId);

    return NextResponse.json({
      success: true,
      usage: {
        package_name: usage.packageName,
        year_month: usage.yearMonth,
        email: {
          monthly_quota: usage.monthlyMail,
          used: usage.mailCount,
          remaining: usage.mailRemaining,
          percentage: usage.monthlyMail > 0 ? Math.round((usage.mailCount / usage.monthlyMail) * 100) : 0,
          can_send: usage.canSendMail
        },
        sms: {
          monthly_quota: usage.monthlySms,
          used: usage.smsCount,
          remaining: usage.smsRemaining,
          percentage: usage.monthlySms > 0 ? Math.round((usage.smsCount / usage.monthlySms) * 100) : 0,
          can_send: usage.canSendSms
        }
      }
    });
  } catch (error) {
    console.error('Error in GET /staff/panel/usage:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

