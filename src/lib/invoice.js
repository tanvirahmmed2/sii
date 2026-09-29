import { SITE_NAME, SITE_MAIL, SITE_CONTACT, SITE_ADDRESS } from './database/secret.js';

/**
 * Standard invoice data generator from payment and creator records.
 * @param {Object} payment - Payment row from payments table
 * @param {Object} [creator] - Creator details
 * @returns {Object} Structured invoice data
 */
export function generateInvoiceData(payment, creator = {}) {
  const p = payment || {};
  const c = creator || {};
  const paymentId = p.id || 'N/A';
  const invoiceNumber = p.invoice_number || `INV-${String(paymentId).padStart(6, '0')}`;
  
  const formattedDate = p.created_at
    ? new Date(p.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

  const currency = p.currency || 'USD';
  const amount = Number(p.amount ?? 0).toFixed(2);
  const status = (p.status || 'PENDING').toUpperCase();

  return {
    invoiceNumber,
    date: formattedDate,
    status,
    customer: {
      id: c.id || p.creator_id || '',
      name: c.name || p.creator_name || 'Valued Creator',
      email: c.email || p.creator_email || '',
      phone: c.phone || '',
    },
    company: {
      name: SITE_NAME,
      email: SITE_MAIL,
      phone: SITE_CONTACT,
      address: SITE_ADDRESS,
    },
    item: {
      packageName: p.package_name || p.package_title || 'SaaS Platform Subscription',
      description: p.description || `Platform subscription license - ${p.billing_cycle || p.interval || 'Monthly'} tier`,
      interval: p.billing_cycle || p.interval || 'Monthly',
      amount,
      currency,
    },
    total: {
      amount,
      currency,
      status,
      paymentMethod: p.payment_method || p.provider || 'bKash / Credit Card',
      transactionId: p.transaction_id || p.trx_id || 'N/A',
    },
  };
}

/**
 * Prints the invoice receipt using browser print dialog.
 * @param {Object} payment 
 * @param {Object} [creator] 
 */
export function printReceipt(payment, creator = {}) {
  if (typeof window === 'undefined') return;
  const inv = generateInvoiceData(payment, creator);

  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt - ${inv.invoiceNumber}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 25px; }
          .company-name { font-size: 24px; font-weight: bold; color: #0f172a; }
          .invoice-tag { font-size: 14px; color: #64748b; margin-top: 4px; }
          .grid { display: flex; justify-content: space-between; margin-bottom: 25px; font-size: 13px; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-weight: bold; font-size: 11px; }
          .badge-paid { background: #dcfce7; color: #15803d; }
          .badge-pending { background: #fef3c7; color: #b45309; }
          table { width: 100%; border-collapse: collapse; margin: 25px 0; font-size: 13px; }
          th { text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 11px; text-transform: uppercase; }
          td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; }
          .total-box { margin-top: 20px; text-align: right; }
          .total-amount { font-size: 22px; font-weight: bold; color: #0f172a; margin-top: 5px; }
          .footer { margin-top: 50px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company-name">${inv.company.name}</div>
            <div class="invoice-tag">${inv.company.email} | ${inv.company.phone}</div>
            <div class="invoice-tag">${inv.company.address}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 18px; font-weight: bold;">INVOICE RECEIPT</div>
            <div class="invoice-tag">#${inv.invoiceNumber}</div>
            <div class="invoice-tag">Date: ${inv.date}</div>
            <div style="margin-top: 6px;">
              <span class="badge ${inv.status === 'COMPLETED' || inv.status === 'PAID' ? 'badge-paid' : 'badge-pending'}">${inv.status}</span>
            </div>
          </div>
        </div>

        <div class="grid">
          <div>
            <strong style="color: #64748b; font-size: 11px; text-transform: uppercase;">Billed To:</strong>
            <div style="font-size: 15px; font-weight: bold; margin-top: 4px;">${inv.customer.name}</div>
            <div>${inv.customer.email}</div>
            ${inv.customer.phone ? `<div>${inv.customer.phone}</div>` : ''}
          </div>
          <div style="text-align: right;">
            <strong style="color: #64748b; font-size: 11px; text-transform: uppercase;">Payment Method:</strong>
            <div style="font-size: 14px; font-weight: bold; margin-top: 4px;">${inv.total.paymentMethod}</div>
            <div>Transaction: ${inv.total.transactionId}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Billing Cycle</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>${inv.item.packageName}</strong>
                <div style="color: #64748b; font-size: 12px;">${inv.item.description}</div>
              </td>
              <td style="text-align: center; text-transform: capitalize;">${inv.item.interval}</td>
              <td style="text-align: right; font-weight: bold;">${inv.item.amount} ${inv.item.currency}</td>
            </tr>
          </tbody>
        </table>

        <div class="total-box">
          <div style="color: #64748b; font-size: 13px;">Total Paid</div>
          <div class="total-amount">${inv.total.amount} ${inv.total.currency}</div>
        </div>

        <div class="footer">
          Thank you for choosing ${inv.company.name}. For questions or support, reach out to ${inv.company.email}.
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * Downloads a structured HTML receipt directly to the user device.
 * @param {Object} payment 
 * @param {Object} [creator] 
 */
export function downloadReceiptFile(payment, creator = {}) {
  if (typeof window === 'undefined') return;
  const inv = generateInvoiceData(payment, creator);

  const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Receipt - ${inv.invoiceNumber}</title>
    <style>
      body { font-family: sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
      .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 25px; }
      table { width: 100%; border-collapse: collapse; margin: 25px 0; }
      th, td { padding: 10px; border-bottom: 1px solid #f1f5f9; text-align: left; }
      .total { font-size: 20px; font-weight: bold; text-align: right; margin-top: 20px; }
    </style>
  </head>
  <body>
    <div class="header">
      <h2>${inv.company.name} - Official Receipt</h2>
      <p>Invoice #${inv.invoiceNumber} | Date: ${inv.date} | Status: ${inv.status}</p>
      <p>Billed to: ${inv.customer.name} (${inv.customer.email})</p>
    </div>
    <table>
      <thead>
        <tr><th>Package</th><th>Cycle</th><th style="text-align: right;">Amount</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>${inv.item.packageName}</td>
          <td>${inv.item.interval}</td>
          <td style="text-align: right;">${inv.item.amount} ${inv.item.currency}</td>
        </tr>
      </tbody>
    </table>
    <div class="total">Total: ${inv.total.amount} ${inv.total.currency}</div>
  </body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Receipt-${inv.invoiceNumber}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default {
  generateInvoiceData,
  printReceipt,
  downloadReceiptFile,
};
