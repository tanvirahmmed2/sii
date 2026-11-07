import { queryDb } from './db.js';

export function getCurrentYearMonth(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export async function getWebsiteMonthlyUsageAndLimits(websiteId) {
  if (!websiteId) {
    return {
      websiteId: null,
      yearMonth: getCurrentYearMonth(),
      packageName: 'Platform Default',
      monthlyMail: 1000,
      monthlySms: 200,
      mailCount: 0,
      smsCount: 0,
      mailRemaining: 1000,
      smsRemaining: 200,
      canSendMail: true,
      canSendSms: true
    };
  }

  const yearMonth = getCurrentYearMonth();

  let monthlyMail = 1000;
  let monthlySms = 200;
  let packageName = 'Standard Academy';

  try {
    const pkgRes = await queryDb(`
      SELECT p.id AS package_id, p.name AS package_name,
             COALESCE(p.monthly_mail, 1000)::int AS monthly_mail,
             COALESCE(p.monthly_sms, 200)::int AS monthly_sms
      FROM websites w
      LEFT JOIN subscriptions s ON s.website_id = w.id AND s.status = 'active'
      LEFT JOIN packages p ON p.id = s.package_id
      WHERE w.id = $1
      ORDER BY s.id DESC
      LIMIT 1
    `, [websiteId]);

    if (pkgRes.rows.length > 0 && pkgRes.rows[0].package_id) {
      monthlyMail = pkgRes.rows[0].monthly_mail ?? 1000;
      monthlySms = pkgRes.rows[0].monthly_sms ?? 200;
      packageName = pkgRes.rows[0].package_name || packageName;
    } else {
      const creatorSubRes = await queryDb(`
        SELECT p.id AS package_id, p.name AS package_name,
               COALESCE(p.monthly_mail, 1000)::int AS monthly_mail,
               COALESCE(p.monthly_sms, 200)::int AS monthly_sms
        FROM websites w
        JOIN subscriptions s ON s.creator_id = w.creator_id AND s.status = 'active'
        JOIN packages p ON p.id = s.package_id
        WHERE w.id = $1
        ORDER BY s.id DESC
        LIMIT 1
      `, [websiteId]);

      if (creatorSubRes.rows.length > 0) {
        monthlyMail = creatorSubRes.rows[0].monthly_mail ?? 1000;
        monthlySms = creatorSubRes.rows[0].monthly_sms ?? 200;
        packageName = creatorSubRes.rows[0].package_name || packageName;
      }
    }
  } catch (err) {
    console.warn(`[UsageLimiter] Error resolving package limits for website ${websiteId}:`, err.message);
  }

  let mailCount = 0;
  let smsCount = 0;

  try {
    const usageRes = await queryDb(`
      SELECT mail_count, sms_count
      FROM website_monthly_usages
      WHERE website_id = $1 AND year_month = $2
      LIMIT 1
    `, [websiteId, yearMonth]);

    if (usageRes.rows.length > 0) {
      mailCount = parseInt(usageRes.rows[0].mail_count, 10) || 0;
      smsCount = parseInt(usageRes.rows[0].sms_count, 10) || 0;
    }
  } catch (err) {
    console.warn(`[UsageLimiter] Error querying monthly usage for website ${websiteId}:`, err.message);
  }

  return {
    websiteId,
    yearMonth,
    packageName,
    monthlyMail,
    monthlySms,
    mailCount,
    smsCount,
    mailRemaining: Math.max(0, monthlyMail - mailCount),
    smsRemaining: Math.max(0, monthlySms - smsCount),
    canSendMail: mailCount < monthlyMail,
    canSendSms: smsCount < monthlySms
  };
}

export async function checkAndIncrementMailUsage(websiteId, count = 1) {
  if (!websiteId) {
    return { allowed: true, unmetered: true };
  }

  const limits = await getWebsiteMonthlyUsageAndLimits(websiteId);
  const yearMonth = limits.yearMonth;
  const requested = Math.max(1, parseInt(count, 10) || 1);

  if (limits.mailCount + requested > limits.monthlyMail) {
    const err = new Error(
      `Monthly email quota exceeded for this institution (${limits.mailCount}/${limits.monthlyMail} emails used). Please upgrade your subscription package to send more emails.`
    );
    err.isQuotaExceeded = true;
    err.type = 'mail';
    err.used = limits.mailCount;
    err.limit = limits.monthlyMail;
    throw err;
  }

  const upsertRes = await queryDb(`
    INSERT INTO website_monthly_usages (website_id, year_month, mail_count, sms_count)
    VALUES ($1, $2, $3, 0)
    ON CONFLICT (website_id, year_month)
    DO UPDATE SET
      mail_count = website_monthly_usages.mail_count + EXCLUDED.mail_count,
      updated_at = CURRENT_TIMESTAMP
    RETURNING mail_count, sms_count
  `, [websiteId, yearMonth, requested]);

  const updatedMailCount = upsertRes.rows[0]?.mail_count || (limits.mailCount + requested);

  return {
    allowed: true,
    yearMonth,
    mailCount: updatedMailCount,
    monthlyMail: limits.monthlyMail,
    mailRemaining: Math.max(0, limits.monthlyMail - updatedMailCount)
  };
}

export async function checkAndIncrementSmsUsage(websiteId, count = 1) {
  if (!websiteId) {
    return { allowed: true, unmetered: true };
  }

  const limits = await getWebsiteMonthlyUsageAndLimits(websiteId);
  const yearMonth = limits.yearMonth;
  const requested = Math.max(1, parseInt(count, 10) || 1);

  if (limits.smsCount + requested > limits.monthlySms) {
    const err = new Error(
      `Monthly SMS quota exceeded for this institution (${limits.smsCount}/${limits.monthlySms} SMS used). Please upgrade your subscription package to send more messages.`
    );
    err.isQuotaExceeded = true;
    err.type = 'sms';
    err.used = limits.smsCount;
    err.limit = limits.monthlySms;
    throw err;
  }

  const upsertRes = await queryDb(`
    INSERT INTO website_monthly_usages (website_id, year_month, mail_count, sms_count)
    VALUES ($1, $2, 0, $3)
    ON CONFLICT (website_id, year_month)
    DO UPDATE SET
      sms_count = website_monthly_usages.sms_count + EXCLUDED.sms_count,
      updated_at = CURRENT_TIMESTAMP
    RETURNING mail_count, sms_count
  `, [websiteId, yearMonth, requested]);

  const updatedSmsCount = upsertRes.rows[0]?.sms_count || (limits.smsCount + requested);

  return {
    allowed: true,
    yearMonth,
    smsCount: updatedSmsCount,
    monthlySms: limits.monthlySms,
    smsRemaining: Math.max(0, limits.monthlySms - updatedSmsCount)
  };
}

