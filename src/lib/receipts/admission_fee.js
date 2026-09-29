import { SCHOOL_NAME } from 'src/lib/database/secret';

function numberToWords(num) {
  const amount = Math.floor(Number(num) || 0);
  if (amount === 0) return 'Zero Taka Only';

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
}

export function generateAdmissionFeeReceiptHTML(application) {
  const schoolName = SCHOOL_NAME || 'Star Cadet Academia';

  const receiptNo = `APP-1000${application.application_id || application.id}`;
  const studentName = application.candidate_name || application.applicant_name || 'N/A';
  const candidateEmail = application.candidate_email || application.email || 'N/A';
  const rawClass = application.class_name || 'N/A';
  const className = rawClass.toLowerCase().startsWith('class') ? rawClass : `Class ${rawClass}`;
  
  const rawPayStatus = (application.payment_status || 'unpaid').toUpperCase();
  const isPaid = rawPayStatus === 'PAID';
  const rawAppStatus = (application.application_status || 'incomplete').toLowerCase();
  
  let appStatusDisplay = 'Incomplete';
  if (['approved', 'accepted'].includes(rawAppStatus)) {
    appStatusDisplay = 'Approved';
  } else if (rawAppStatus === 'rejected') {
    appStatusDisplay = 'Rejected';
  } else if (rawAppStatus === 'pending') {
    appStatusDisplay = 'Pending Review';
  }

  const dateStr = application.created_at
    ? new Date(application.created_at).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB');

  const downloadedDate = new Date().toLocaleDateString('en-GB');

  const feeAmount = Number(application.fee_amount || application.amount || 0);
  const fees = [
    { description: application.circular_name || 'Admission Intake Processing Fee', amount: feeAmount }
  ];
  const total = fees.reduce((sum, item) => sum + Number(item.amount), 0);
  const amountInWords = numberToWords(total);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Admission Fee Receipt - ${receiptNo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman:ital,wght@0,400;0,700;1,400;1,700&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: 'Times New Roman', Times, serif;
      background-color: #f4f4f5;
      color: #000000;
      padding: 20px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .wrapper {
      max-width: 840px;
      margin: 0 auto;
    }

    .action-bar {
      margin-bottom: 20px;
      display: flex;
      justify-content: flex-end;
    }

    .btn-print {
      background-color: #000000;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: bold;
      font-family: sans-serif;
      cursor: pointer;
      border-radius: 4px;
    }

    .container {
      background: #ffffff;
      border: 10px double #333333;
      padding: 30px 35px;
      position: relative;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }

    .header {
      text-align: center;
      margin-bottom: 5px;
    }
    .board-title {
      font-size: 22px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .country-title {
      font-size: 15px;
      font-weight: bold;
      margin-top: 2px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .top-meta-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 15px;
      margin-bottom: 15px;
    }

    .serial-box {
      font-size: 12px;
      line-height: 1.6;
      font-weight: bold;
    }

    .doc-title-wrapper {
      text-align: center;
      flex-grow: 1;
    }

    .doc-title {
      font-size: 18px;
      font-weight: bold;
      text-transform: uppercase;
      text-decoration: underline;
      letter-spacing: 1px;
    }

    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      margin-bottom: 20px;
      font-size: 13px;
      line-height: 1.6;
    }
    .info-table td {
      padding: 3px 0;
      vertical-align: top;
    }
    .info-table td.label {
      width: 160px;
    }
    .info-table td.colon {
      width: 15px;
      text-align: center;
    }
    .info-table td.val {
      font-weight: bold;
    }

    .fee-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    .fee-table th, .fee-table td {
      border: 1px solid #000000;
      padding: 8px 10px;
      font-size: 13px;
    }
    .fee-table th {
      font-weight: bold;
      text-align: center;
      background-color: #f9f9f9;
    }

    .amount-words {
      font-size: 13px;
      margin-top: 12px;
      margin-bottom: 25px;
      font-style: italic;
    }

    .footer-section {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 12px;
    }

    @media print {
      body { background: #ffffff; padding: 0; }
      .action-bar { display: none; }
      .container {
        border: 10px double #000000;
        box-shadow: none;
        padding: 20px 25px;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="action-bar">
      <button class="btn-print" onclick="window.print()">Print Receipt</button>
    </div>

    <div class="container">
      <div class="header">
        <div class="board-title">${schoolName}</div>
        <div class="country-title">BANGLADESH</div>
      </div>

      <div class="top-meta-container">
        <div class="serial-box">
          <div>Receipt No: ${receiptNo}</div>
          <div style="margin-top: 2px; font-weight: normal; font-size: 11px;">Date: ${dateStr}</div>
        </div>

        <div class="doc-title-wrapper">
          <span class="doc-title">ADMISSION FEE RECEIPT</span>
        </div>
      </div>

      <table class="info-table">
        <tr>
          <td class="label">Applicant Name</td>
          <td class="colon">:</td>
          <td class="val">${studentName}</td>
        </tr>
        <tr>
          <td class="label">Applying for Class</td>
          <td class="colon">:</td>
          <td class="val">${className}</td>
        </tr>
        <tr>
          <td class="label">Applicant Email</td>
          <td class="colon">:</td>
          <td class="val">${candidateEmail}</td>
        </tr>
        <tr>
          <td class="label">Payment Status</td>
          <td class="colon">:</td>
          <td class="val" style="color: ${isPaid ? '#059669' : '#dc2626'};">${rawPayStatus}</td>
          <td class="label" style="width: 130px;">Application Status</td>
          <td class="colon">:</td>
          <td class="val">${appStatusDisplay}</td>
        </tr>
      </table>

      <table class="fee-table">
        <thead>
          <tr>
            <th style="width: 50px;">SL.</th>
            <th>Description</th>
            <th style="width: 140px; text-align: right;">Amount (৳)</th>
          </tr>
        </thead>
        <tbody>
          ${fees.map((item, idx) => `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td style="font-weight: bold;">${item.description}</td>
              <td style="text-align: right; font-weight: bold;">৳ ${Number(item.amount).toLocaleString()}</td>
            </tr>
          `).join('')}
          <tr style="font-weight: bold; background-color: #f9f9f9;">
            <td colspan="2" style="text-align: right;">Total Amount</td>
            <td style="text-align: right; font-size: 14px;">৳ ${total.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <div class="amount-words">
        <strong>Amount in Words:</strong> ${amountInWords}
      </div>

      <div class="footer-section">
        <div>
          Computer Generated Receipt — Issued on: ${downloadedDate}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function printAdmissionFeeReceipt(application) {
  if (typeof window === 'undefined') return;
  const html = generateAdmissionFeeReceiptHTML(application);
  const printWindow = window.open('', '_blank', 'width=850,height=950');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  }
}
