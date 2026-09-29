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

export function generateStudentFeeReceiptHTML(fee, studentInfo = {}) {
  const schoolName = SCHOOL_NAME || 'Star Cadet Academia';

  const receiptNo = `REC-FEE-2026${String(fee.id).padStart(4, '0')}`;
  const studentName = studentInfo?.student_name || studentInfo?.name || fee?.student_name || fee?.name || 'N/A';
  const regNo = studentInfo?.registration_number || studentInfo?.reg_no || fee?.registration_number || fee?.reg_no || 'N/A';
  const rollNo = studentInfo?.roll || fee?.roll ? String(studentInfo?.roll || fee?.roll) : 'N/A';
  
  let fatherName = studentInfo?.father_name || fee?.father_name || '';
  let motherName = studentInfo?.mother_name || fee?.mother_name || '';
  const parentsInfo = studentInfo?.parents_info || fee?.parents_info;

  if ((!fatherName || fatherName === 'N/A') && parentsInfo) {
    const fMatch = parentsInfo.match(/Father:\s*([^(,]+)/i);
    if (fMatch) fatherName = fMatch[1].trim();
  }
  if ((!motherName || motherName === 'N/A') && parentsInfo) {
    const mMatch = parentsInfo.match(/Mother:\s*([^(,]+)/i);
    if (mMatch) motherName = mMatch[1].trim();
  }

  fatherName = fatherName || 'N/A';
  motherName = motherName || 'N/A';

  const rawClass = studentInfo?.class_name || studentInfo?.class || fee?.class_name || fee?.class || 'N/A';
  const className = rawClass.toLowerCase().startsWith('class') ? rawClass : `Class ${rawClass}`;
  const sectionName = studentInfo?.section_name || fee?.section_name || 'N/A';

  const rawPayStatus = (fee.status || 'unpaid').toUpperCase();
  const isPaid = rawPayStatus === 'PAID';

  const paymentDateStr = fee.payment_date
    ? new Date(fee.payment_date).toLocaleDateString('en-GB')
    : fee.due_date
    ? new Date(fee.due_date).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB');

  const downloadedDate = new Date().toLocaleDateString('en-GB');

  const totalAmount = Number(fee.amount || 0);
  const paidAmount = Number(fee.paid_amount || (isPaid ? totalAmount : 0));
  const dueAmount = Math.max(totalAmount - paidAmount, 0);

  const amountInWords = numberToWords(isPaid ? totalAmount : paidAmount > 0 ? paidAmount : totalAmount);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Fee Receipt - ${receiptNo}</title>
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
          <div style="margin-top: 2px; font-weight: normal; font-size: 11px;">Payment Date: ${paymentDateStr}</div>
        </div>

        <div class="doc-title-wrapper">
          <span class="doc-title">STUDENT FEE RECEIPT</span>
        </div>
      </div>

      <table class="info-table">
        <tr>
          <td class="label">Student Name</td>
          <td class="colon">:</td>
          <td class="val">${studentName}</td>
        </tr>
        <tr>
          <td class="label">Father's Name</td>
          <td class="colon">:</td>
          <td class="val">${fatherName}</td>
        </tr>
        <tr>
          <td class="label">Mother's Name</td>
          <td class="colon">:</td>
          <td class="val">${motherName}</td>
        </tr>
        <tr>
          <td class="label">Roll No.</td>
          <td class="colon">:</td>
          <td class="val" style="width: 200px;">${rollNo}</td>
          <td class="label" style="width: 130px;">Registration No.</td>
          <td class="colon">:</td>
          <td class="val">${regNo}</td>
        </tr>
        <tr>
          <td class="label">Class & Section</td>
          <td class="colon">:</td>
          <td class="val">${className} (${sectionName})</td>
          <td class="label">Payment Status</td>
          <td class="colon">:</td>
          <td class="val" style="color: ${isPaid ? '#059669' : '#dc2626'};">${rawPayStatus}</td>
        </tr>
      </table>

      <table class="fee-table">
        <thead>
          <tr>
            <th style="width: 50px;">SL.</th>
            <th>Fee Description</th>
            <th style="width: 120px; text-align: right;">Total Amount</th>
            <th style="width: 120px; text-align: right;">Paid Amount</th>
            <th style="width: 120px; text-align: right;">Due Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center;">1</td>
            <td style="font-weight: bold;">${fee.title || fee.fee_type || 'Monthly Academic / Institutional Fee'}</td>
            <td style="text-align: right;">৳ ${totalAmount.toLocaleString()}</td>
            <td style="text-align: right; font-weight: bold;">৳ ${paidAmount.toLocaleString()}</td>
            <td style="text-align: right; color: ${dueAmount > 0 ? '#dc2626' : '#000000'}; font-weight: bold;">৳ ${dueAmount.toLocaleString()}</td>
          </tr>
          <tr style="font-weight: bold; background-color: #f9f9f9;">
            <td colspan="2" style="text-align: right;">Summary Total</td>
            <td style="text-align: right;">৳ ${totalAmount.toLocaleString()}</td>
            <td style="text-align: right;">৳ ${paidAmount.toLocaleString()}</td>
            <td style="text-align: right; color: ${dueAmount > 0 ? '#dc2626' : '#000000'};">৳ ${dueAmount.toLocaleString()}</td>
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

export function printStudentFeeReceipt(fee, studentInfo = {}) {
  if (typeof window === 'undefined') return;
  const html = generateStudentFeeReceiptHTML(fee, studentInfo);
  const printWindow = window.open('', '_blank', 'width=850,height=950');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  }
}
