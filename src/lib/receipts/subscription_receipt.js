import {
  SITE_NAME,
  SITE_MAIL,
  SITE_CONTACT,
  SITE_ADDRESS,
  COMPANY_NAME,
  COMPANY_URL,
} from '../database/secret.js';

export const PLATFORM_INFO = {
  SITE_NAME: SITE_NAME || 'Hiesci',
  SITE_MAIL: SITE_MAIL || 'support@hiesci.io',
  SITE_CONTACT: SITE_CONTACT || '+1 (800) 555-0199',
  SITE_ADDRESS: SITE_ADDRESS || 'Tech Innovation District, 100 Enterprise Way, Suite 400',
  COMPANY_NAME: COMPANY_NAME || 'EduCraft Technologies Inc.',
  COMPANY_URL: COMPANY_URL || 'https://educraft.io',
};

export function numberToWords(num, currency = 'USD') {
  const amount = Math.floor(Number(num) || 0);
  if (amount === 0) {
    return currency.toUpperCase() === 'BDT' ? 'Zero Taka Only' : 'Zero Dollars Only';
  }

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanThousand = (n) => {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '') + ' ';
    return ones[Math.floor(n / 100)] + ' Hundred ' + convertLessThanThousand(n % 100);
  };

  let result = '';
  let n = amount;

  if (currency.toUpperCase() === 'BDT') {
    if (Math.floor(n / 10000000)) {
      result += convertLessThanThousand(Math.floor(n / 10000000)) + 'Crore ';
      n %= 10000000;
    }
    if (Math.floor(n / 100000)) {
      result += convertLessThanThousand(Math.floor(n / 100000)) + 'Lakh ';
      n %= 100000;
    }
    if (Math.floor(n / 1000)) {
      result += convertLessThanThousand(Math.floor(n / 1000)) + 'Thousand ';
      n %= 1000;
    }
    if (n > 0) {
      result += convertLessThanThousand(n);
    }
    return result.trim() + ' Taka Only';
  } else {
    // International USD / Western numbering
    if (Math.floor(n / 1000000)) {
      result += convertLessThanThousand(Math.floor(n / 1000000)) + 'Million ';
      n %= 1000000;
    }
    if (Math.floor(n / 1000)) {
      result += convertLessThanThousand(Math.floor(n / 1000)) + 'Thousand ';
      n %= 1000;
    }
    if (n > 0) {
      result += convertLessThanThousand(n);
    }
    return result.trim() + ' US Dollars Only';
  }
}

export function generateSubscriptionReceiptHTML(payment = {}, creator = {}, packageInfo = {}, purchase = {}) {
  const platformName = COMPANY_NAME || 'EduCraft Technologies Inc.';
  const brandName = SITE_NAME || 'Hiesci';
  const siteAddress = SITE_ADDRESS || 'Tech Innovation District, 100 Enterprise Way, Suite 400';
  const siteContact = SITE_CONTACT || '+1 (800) 555-0199';
  const siteEmail = SITE_MAIL || 'support@hiesci.io';
  const siteWebsite = COMPANY_URL || 'https://educraft.io';

  const receiptNo = payment.transaction_id || (payment.id ? `REC-PAY-${payment.id}` : 'REC-OFFICIAL');
  const purchaseCode = purchase.purchase_code || payment.purchase_code || payment.order_code || 'N/A';

  const rawStatus = (payment.status || 'successful').toUpperCase();
  const isPaid = ['SUCCESSFUL', 'COMPLETED', 'PAID'].includes(rawStatus);

  const paymentDateStr = payment.payment_date || payment.created_at
    ? new Date(payment.payment_date || payment.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

  const periodStartStr = payment.current_period_start || purchase.period_start || payment.period_start
    ? new Date(payment.current_period_start || purchase.period_start || payment.period_start).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Immediate';

  const periodEndStr = payment.current_period_end || purchase.period_end || payment.period_end
    ? new Date(payment.current_period_end || purchase.period_end || payment.period_end).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Renews periodically';

  const currency = (payment.currency || (payment.payment_method === 'BKASH' ? 'BDT' : 'USD')).toUpperCase();
  const amountNumber = Number(payment.amount || 0);
  const amountFormatted = currency === 'BDT' ? `৳${amountNumber.toLocaleString()}` : `$${amountNumber.toFixed(2)}`;
  const amountWords = numberToWords(amountNumber, currency);

  const packageName = packageInfo.name || payment.package_name || 'Academic Institution Plan';
  const packageTagline = packageInfo.tagline || payment.package_tagline || 'Cloud Campus Multi-Tenant System';
  const billingCycle = (payment.billing_interval || purchase.billing_cycle || payment.billing_cycle || 'monthly').toUpperCase();

  const maxWebsites = packageInfo.max_websites ?? payment.max_websites ?? 1;
  const maxTeachers = packageInfo.max_teachers ?? payment.max_teachers ?? 'Standard';
  const maxStudents = packageInfo.max_students ?? payment.max_students ?? 'Standard';
  const maxStaff = packageInfo.max_staff ?? payment.max_staff ?? 'Standard';
  const maxStorage = packageInfo.max_storage_mb ?? payment.max_storage_mb ?? 5120;

  const creatorName = creator.name || payment.creator_name || 'Valued Platform Creator';
  const creatorEmail = creator.email || payment.creator_email || 'N/A';
  const creatorPhone = creator.phone || payment.creator_phone || 'N/A';
  const creatorInstitution = creator.institution || payment.creator_institution || 'Independent Educational Institution';
  const creatorAddress = creator.address || creator.city || creator.country || 'Registered Account Address';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Subscription Receipt - ${receiptNo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      padding: 30px 15px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .wrapper {
      max-width: 820px;
      margin: 0 auto;
    }

    .action-bar {
      margin-bottom: 20px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .btn-print {
      background-color: #0f172a;
      color: #ffffff;
      border: 1px solid #0f172a;
      padding: 9px 20px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s ease;
    }
    .btn-print:hover {
      background-color: #1e293b;
    }

    .receipt-container {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05);
      position: relative;
    }

    /* Decorative top brand bar */
    .top-brand-accent {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
      background: linear-gradient(90deg, #1e40af 0%, #3b82f6 50%, #6366f1 100%);
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
    }

    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 24px;
      margin-bottom: 24px;
      gap: 20px;
    }

    .company-title {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .company-brand-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background-color: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      padding: 2px 8px;
      border-radius: 4px;
      margin-top: 4px;
      margin-bottom: 8px;
    }
    .company-details {
      font-size: 12px;
      line-height: 1.6;
      color: #64748b;
    }

    .invoice-meta-box {
      text-align: right;
    }
    .invoice-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #0f172a;
    }
    .invoice-status-badge {
      display: inline-block;
      margin-top: 6px;
      padding: 4px 12px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      border-radius: 9999px;
      background: ${isPaid ? '#ecfdf5' : '#fffbeb'};
      color: ${isPaid ? '#047857' : '#b45309'};
      border: 1px solid ${isPaid ? '#a7f3d0' : '#fde68a'};
    }
    .meta-line {
      font-size: 12px;
      color: #475569;
      margin-top: 4px;
    }
    .meta-line strong {
      color: #0f172a;
      font-family: monospace;
      font-size: 12px;
    }

    /* Billing / Client Grid */
    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      padding: 18px 20px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin-bottom: 28px;
    }

    .party-block h4 {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      margin-bottom: 8px;
    }
    .party-name {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .party-inst {
      font-size: 12px;
      font-weight: 600;
      color: #2563eb;
      margin-bottom: 4px;
    }
    .party-info-row {
      font-size: 12px;
      color: #475569;
      line-height: 1.5;
    }

    /* Package Specifications Table */
    .specs-header {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #0f172a;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .specs-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .specs-table th {
      background-color: #f1f5f9;
      color: #334155;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    .specs-table td {
      padding: 14px;
      font-size: 12px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
      vertical-align: top;
    }
    .package-title-cell {
      font-weight: 700;
      font-size: 13px;
      color: #0f172a;
    }
    .package-tagline-text {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }

    .quota-badge-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .quota-badge {
      display: inline-flex;
      align-items: center;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      background-color: #f1f5f9;
      color: #1e293b;
      border: 1px solid #cbd5e1;
    }
    .quota-badge strong {
      margin-right: 4px;
      color: #0f172a;
    }

    /* Financial Summary */
    .financial-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .financial-table td {
      padding: 8px 14px;
      font-size: 12px;
      color: #334155;
    }
    .financial-table td.label-col {
      text-align: right;
      color: #64748b;
      font-weight: 500;
      width: 75%;
    }
    .financial-table td.val-col {
      text-align: right;
      font-family: monospace;
      font-weight: 600;
      font-size: 13px;
      color: #0f172a;
      width: 25%;
    }
    .financial-table tr.total-row td {
      border-top: 2px solid #0f172a;
      padding-top: 12px;
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
    }
    .financial-table tr.total-row td.val-col {
      font-size: 16px;
      color: #1e40af;
    }

    .words-box {
      background-color: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      padding: 10px 14px;
      font-size: 12px;
      color: #334155;
      margin-bottom: 28px;
    }
    .words-box strong {
      color: #0f172a;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.04em;
      margin-right: 6px;
    }

    /* Signatures & Footer */
    .receipt-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 20px;
    }
    .footer-notes {
      font-size: 11px;
      line-height: 1.6;
      color: #64748b;
      max-width: 480px;
    }
    .auth-stamp-box {
      text-align: center;
      min-width: 180px;
    }
    .stamp-badge {
      display: inline-block;
      padding: 6px 14px;
      border: 2px solid ${isPaid ? '#059669' : '#d97706'};
      color: ${isPaid ? '#059669' : '#d97706'};
      border-radius: 8px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      transform: rotate(-3deg);
      margin-bottom: 8px;
    }
    .auth-title {
      font-size: 10px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    @media print {
      body {
        background-color: #ffffff;
        padding: 0;
      }
      .action-bar {
        display: none !important;
      }
      .receipt-container {
        border: none;
        box-shadow: none;
        padding: 20px 0;
      }
      .top-brand-accent {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="action-bar">
      <button class="btn-print" onclick="window.print()">
        <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Print Receipt
      </button>
    </div>

    <div class="receipt-container">
      <div class="top-brand-accent"></div>

      <!-- Header -->
      <div class="header-section">
        <div>
          <div class="company-title">${platformName}</div>
          <div class="company-brand-badge">${brandName} SaaS Ecosystem</div>
          <div class="company-details">
            <div>${siteAddress}</div>
            <div>Phone: ${siteContact} | Email: ${siteEmail}</div>
            <div>Web: <a href="${siteWebsite}" style="color: #2563eb; text-decoration: none;">${siteWebsite}</a></div>
          </div>
        </div>

        <div class="invoice-meta-box">
          <div class="invoice-title">RECEIPT</div>
          <div class="invoice-status-badge">${rawStatus}</div>
          <div class="meta-line" style="margin-top: 10px;">
            Receipt No: <strong>${receiptNo}</strong>
          </div>
          <div class="meta-line">
            Order Ref: <strong>${purchaseCode}</strong>
          </div>
          <div class="meta-line">
            Issued Date: <strong>${paymentDateStr}</strong>
          </div>
          <div class="meta-line">
            Payment Mode: <strong>${payment.payment_method || 'Online'}</strong>
          </div>
        </div>
      </div>

      <!-- Parties: Bill To & Terms -->
      <div class="parties-grid">
        <div class="party-block">
          <h4>Billed To (Creator)</h4>
          <div class="party-name">${creatorName}</div>
          <div class="party-inst">${creatorInstitution}</div>
          <div class="party-info-row">Email: ${creatorEmail}</div>
          <div class="party-info-row">Phone: ${creatorPhone}</div>
          <div class="party-info-row">Address: ${creatorAddress}</div>
        </div>

        <div class="party-block">
          <h4>Subscription Term & Validity</h4>
          <div class="party-info-row"><strong>Billing Cycle:</strong> ${billingCycle}</div>
          <div class="party-info-row"><strong>Period Start:</strong> ${periodStartStr}</div>
          <div class="party-info-row"><strong>Period End:</strong> ${periodEndStr}</div>
          <div class="party-info-row"><strong>Payment Gateway:</strong> ${payment.payment_gateway || payment.payment_method || 'Direct PGW'}</div>
          <div class="party-info-row"><strong>Transaction Ref:</strong> <span style="font-family: monospace;">${receiptNo}</span></div>
        </div>
      </div>

      <!-- Package & Resource Allocation Table -->
      <div class="specs-header">
        <span>Subscribed Plan & Entitlements</span>
        <span style="font-size: 11px; color: #64748b; font-weight: 500;">Cycle: ${billingCycle}</span>
      </div>

      <table class="specs-table">
        <thead>
          <tr>
            <th style="width: 45%;">Package Description</th>
            <th style="width: 25%;">Billing Interval</th>
            <th style="width: 30%; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="package-title-cell">${packageName}</div>
              <div class="package-tagline-text">${packageTagline}</div>
              <div class="quota-badge-list">
                <span class="quota-badge"><strong>${maxWebsites}</strong> Website(s) Allowed</span>
                <span class="quota-badge"><strong>${maxTeachers}</strong> Teachers</span>
                <span class="quota-badge"><strong>${maxStudents}</strong> Students</span>
                <span class="quota-badge"><strong>${maxStaff}</strong> Staff</span>
                <span class="quota-badge"><strong>${maxStorage} MB</strong> Storage</span>
              </div>
            </td>
            <td>
              <span style="font-weight: 600; text-transform: uppercase;">${billingCycle}</span>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                Valid: ${periodStartStr} – ${periodEndStr}
              </div>
            </td>
            <td style="text-align: right; font-weight: 700; font-family: monospace; font-size: 14px;">
              ${amountFormatted}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Financial Calculation -->
      <table class="financial-table">
        <tbody>
          <tr>
            <td class="label-col">Package Subtotal:</td>
            <td class="val-col">${amountFormatted}</td>
          </tr>
          <tr>
            <td class="label-col">Discount Applied:</td>
            <td class="val-col">${currency === 'BDT' ? '৳0.00' : '$0.00'}</td>
          </tr>
          <tr>
            <td class="label-col">Platform Taxes & Processing:</td>
            <td class="val-col">${currency === 'BDT' ? '৳0.00' : '$0.00'}</td>
          </tr>
          <tr class="total-row">
            <td class="label-col">Total Paid:</td>
            <td class="val-col">${amountFormatted} ${currency}</td>
          </tr>
        </tbody>
      </table>

      <!-- Amount in Words -->
      <div class="words-box">
        <strong>Amount In Words:</strong> ${amountWords}
      </div>

      <!-- Footer Notes & Seal -->
      <div class="receipt-footer">
        <div class="footer-notes">
          <div>This is an official, system-generated payment receipt and certificate of subscription.</div>
          <div>All websites hosted under this plan inherit the provisioned quotas and platform SLA.</div>
          <div style="margin-top: 4px; font-size: 10px; color: #94a3b8;">
            Generated on ${new Date().toUTCString()} | Support: ${siteEmail}
          </div>
        </div>

        <div class="auth-stamp-box">
          <div class="stamp-badge">${isPaid ? 'PAID & VERIFIED' : 'PENDING'}</div>
          <div class="auth-title">Authorized Digital Seal</div>
          <div style="font-size: 11px; font-weight: 700; color: #0f172a; margin-top: 2px;">${brandName} Billing</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function printSubscriptionReceipt(payment = {}, creator = {}, packageInfo = {}, purchase = {}) {
  if (typeof window === 'undefined') return;
  const html = generateSubscriptionReceiptHTML(payment, creator, packageInfo, purchase);
  const printWindow = window.open('', '_blank', 'width=880,height=960');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  }
}
