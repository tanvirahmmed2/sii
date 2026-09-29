import { SCHOOL_NAME } from 'src/lib/database/secret';

export function generateTransferCertificateHTML(tcData = {}) {
  const {
    tc_number = 'TC-001024',
    student = {},
    reason_for_leaving = 'Personal reasons',
    destination_school = 'N/A',
    conduct = 'Good',
    last_class_attended = 'N/A',
    promoted_to_class = 'N/A',
    issue_date = new Date().toLocaleDateString('en-GB')
  } = tcData;

  const schoolName = SCHOOL_NAME || 'Star Cadet Academia';
  const studentName = student.name || 'Student Name';
  const regNo = student.registration_number || student.reg_no || 'N/A';
  const rollNo = student.roll ? String(student.roll) : 'N/A';

  let fatherName = student.father_name || '';
  let motherName = student.mother_name || '';
  const parentsInfo = student.parents_info;

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

  const dobStr = student.date_of_birth
    ? new Date(student.date_of_birth).toLocaleDateString('en-GB')
    : 'N/A';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Transfer Certificate - ${studentName}</title>
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
      padding: 35px 40px;
      position: relative;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }

    .header {
      text-align: center;
      margin-bottom: 5px;
    }
    .board-title {
      font-size: 24px;
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
      margin-top: 20px;
      margin-bottom: 20px;
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
      font-size: 20px;
      font-weight: bold;
      text-transform: uppercase;
      text-decoration: underline;
      letter-spacing: 1px;
    }

    .cert-body {
      font-size: 14px;
      line-height: 1.8;
      margin-top: 15px;
      margin-bottom: 25px;
      text-align: justify;
    }

    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      margin-bottom: 30px;
      font-size: 13px;
      line-height: 1.7;
    }
    .info-table td {
      padding: 4px 0;
      vertical-align: top;
    }
    .info-table td.label {
      width: 220px;
    }
    .info-table td.colon {
      width: 15px;
      text-align: center;
    }
    .info-table td.val {
      font-weight: bold;
    }

    .footer-section {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 13px;
      font-weight: bold;
    }

    @media print {
      body { background: #ffffff; padding: 0; }
      .action-bar { display: none; }
      .container {
        border: 10px double #000000;
        box-shadow: none;
        padding: 25px 30px;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="action-bar">
      <button class="btn-print" onclick="window.print()">Print Transfer Certificate</button>
    </div>

    <div class="container">
      <div class="header">
        <div class="board-title">${schoolName}</div>
        <div class="country-title">BANGLADESH</div>
      </div>

      <div class="top-meta-container">
        <div class="serial-box">
          <div>TC No: ${tc_number}</div>
          <div style="margin-top: 2px; font-weight: normal; font-size: 11px;">Issue Date: ${issue_date}</div>
        </div>

        <div class="doc-title-wrapper">
          <span class="doc-title">TRANSFER CERTIFICATE</span>
        </div>
      </div>

      <div class="cert-body">
        This is to certify that <strong>${studentName}</strong>, bearing Roll No. <strong>${rollNo}</strong> and Registration No. <strong>${regNo}</strong>, was a bona fide student of this institution. All institutional dues have been fully cleared up to date.
      </div>

      <table class="info-table">
        <tr>
          <td class="label">Name of Student</td>
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
          <td class="label">Date of Birth</td>
          <td class="colon">:</td>
          <td class="val">${dobStr}</td>
        </tr>
        <tr>
          <td class="label">Last Class Attended</td>
          <td class="colon">:</td>
          <td class="val">${last_class_attended}</td>
        </tr>
        <tr>
          <td class="label">Promoted / Status</td>
          <td class="colon">:</td>
          <td class="val">${promoted_to_class}</td>
        </tr>
        <tr>
          <td class="label">Reason for Leaving</td>
          <td class="colon">:</td>
          <td class="val">${reason_for_leaving}</td>
        </tr>
        <tr>
          <td class="label">Destination School</td>
          <td class="colon">:</td>
          <td class="val">${destination_school}</td>
        </tr>
        <tr>
          <td class="label">General Conduct & Character</td>
          <td class="colon">:</td>
          <td class="val">${conduct}</td>
        </tr>
      </table>

      <div class="footer-section">
        <div>
          Date of Issue: ${issue_date}
        </div>
        <div style="text-align: center;">
          <div style="border-top: 1px solid #000; padding-top: 4px; width: 180px;">Principal / Registrar</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function printTransferCertificate(tcData) {
  if (typeof window === 'undefined') return;
  const html = generateTransferCertificateHTML(tcData);
  const printWindow = window.open('', '_blank', 'width=850,height=950');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  }
}
