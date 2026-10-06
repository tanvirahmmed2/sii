import { SCHOOL_NAME } from 'src/lib/database/secret';

function renderSingleAdmitCardBlock(exam = {}, student = {}, schedules = []) {
  const schoolName = SCHOOL_NAME || '';

  const admitCardNo = `${exam.id || ''}${student.registration_number || student.id || ''}`.replace(/[^0-9A-Za-z]/g, '');
  const studentName = student.name || 'N/A';
  const regNo = student.registration_number || 'N/A';
  const rollNo = student.roll ? String(student.roll) : 'N/A';
  const rawClass = student.class_name || 'N/A';
  const className = rawClass !== 'N/A' && !rawClass.toLowerCase().startsWith('class') ? `Class ${rawClass}` : rawClass;
  const sectionName = student.section_name || 'N/A';

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

  const examName = exam.name || exam.exam_name || 'Examination Admit Card';
  const examTerm = exam.term ? `(${exam.term})` : '';

  const startDateStr = exam.start_date ? new Date(exam.start_date).toLocaleDateString('en-GB') : 'N/A';
  const endDateStr = exam.end_date ? new Date(exam.end_date).toLocaleDateString('en-GB') : 'N/A';
  const issuedDate = new Date().toLocaleDateString('en-GB');

  return `
    <div className="container" style="background: #ffffff; border: 10px double #333333; padding: 30px 35px; position: relative; margin-bottom: 30px;">
      <div style="text-align: center; margin-bottom: 5px;">
        ${schoolName ? `<div style="font-size: 22px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">${schoolName}</div>` : ''}
        <div style="font-size: 15px; font-weight: bold; margin-top: 2px; text-transform: uppercase; letter-spacing: 1px;">BANGLADESH</div>
        <div style="font-size: 16px; font-weight: bold; margin-top: 6px;">${examName} ${examTerm}</div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 15px; margin-bottom: 15px;">
        <div style="font-size: 12px; line-height: 1.6; font-weight: bold;">
          <div>${admitCardNo}</div>
          <div style="margin-top: 2px; font-weight: normal; font-size: 11px;">Issued: ${issuedDate}</div>
        </div>

        <div style="text-align: center; flex-grow: 1;">
          <span style="font-size: 18px; font-weight: bold; text-transform: uppercase; text-decoration: underline; letter-spacing: 1px;">EXAMINATION ADMIT CARD</span>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; font-size: 13px; line-height: 1.6;">
        <tr>
          <td style="width: 160px;">Name of Candidate</td>
          <td style="width: 15px; text-align: center;">:</td>
          <td style="font-weight: bold;">${studentName}</td>
        </tr>
        <tr>
          <td>Father's Name</td>
          <td style="text-align: center;">:</td>
          <td style="font-weight: bold;">${fatherName}</td>
        </tr>
        <tr>
          <td>Mother's Name</td>
          <td style="text-align: center;">:</td>
          <td style="font-weight: bold;">${motherName}</td>
        </tr>
        <tr>
          <td>Roll No.</td>
          <td style="text-align: center;">:</td>
          <td style="font-weight: bold; width: 200px;">${rollNo}</td>
          <td style="width: 130px;">Registration No.</td>
          <td style="text-align: center;">:</td>
          <td style="font-weight: bold;">${regNo}</td>
        </tr>
        <tr>
          <td>Class & Section</td>
          <td style="text-align: center;">:</td>
          <td style="font-weight: bold;">${className} (${sectionName})</td>
          <td>Exam Dates</td>
          <td style="text-align: center;">:</td>
          <td style="font-weight: bold;">${startDateStr} - ${endDateStr}</td>
        </tr>
      </table>

      ${schedules.length > 0 ? `
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f9f9f9;">
            <th style="border: 1px solid #000; padding: 6px; font-size: 12px; width: 40px;">SL.</th>
            <th style="border: 1px solid #000; padding: 6px; font-size: 12px; width: 110px;">Date</th>
            <th style="border: 1px solid #000; padding: 6px; font-size: 12px; width: 100px;">Time</th>
            <th style="border: 1px solid #000; padding: 6px; font-size: 12px;">Subject Name</th>
            <th style="border: 1px solid #000; padding: 6px; font-size: 12px; width: 80px;">Room</th>
          </tr>
        </thead>
        <tbody>
          ${schedules.map((item, idx) => `
            <tr>
              <td style="border: 1px solid #000; padding: 6px; font-size: 12px; text-align: center;">${idx + 1}</td>
              <td style="border: 1px solid #000; padding: 6px; font-size: 12px; text-align: center;">${item.exam_date ? new Date(item.exam_date).toLocaleDateString('en-GB') : 'TBA'}</td>
              <td style="border: 1px solid #000; padding: 6px; font-size: 12px; text-align: center;">${item.start_time || ''} - ${item.end_time || ''}</td>
              <td style="border: 1px solid #000; padding: 6px; font-size: 12px; font-weight: bold;">${item.subject_name || 'N/A'}</td>
              <td style="border: 1px solid #000; padding: 6px; font-size: 12px; text-align: center;">${item.room_number || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : ''}

      <div style="border: 1px solid #000000; padding: 10px 15px; font-size: 11px; line-height: 1.5; background-color: #fafafa;">
        <h4 style="font-size: 12px; font-weight: bold; margin-bottom: 4px; text-transform: uppercase;">Important Instructions for Candidate:</h4>
        <ol style="margin-left: 18px; font-size: 11px;">
          <li>Bring this printed Admit Card and valid ID to every examination session.</li>
          <li>Enter the examination hall at least 15 minutes before the scheduled start time.</li>
          <li>Mobile phones, smart watches, and unauthorized electronic devices are strictly prohibited.</li>
        </ol>
      </div>

      <div style="margin-top: 35px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 12px;">
        <div>Date of Issue: ${issuedDate}</div>
      </div>
    </div>
  `;
}

export function generateAdmitCardHTML(examOrList, student, schedules) {
  let items = [];
  if (Array.isArray(examOrList)) {
    items = examOrList;
  } else {
    items = [{ exam: examOrList, student, schedules: schedules || [] }];
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Examination Admit Cards (${items.length})</title>
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

    .page-break {
      page-break-after: always;
    }

    @media print {
      body { background: #ffffff; padding: 0; }
      .action-bar { display: none; }
      .container {
        border: 10px double #000000 !important;
        box-shadow: none !important;
        padding: 20px 25px !important;
        margin-bottom: 0 !important;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="action-bar">
      <button class="btn-print" onclick="window.print()">Print Admit Cards (${items.length})</button>
    </div>

    ${items.map((item, index) => `
      ${renderSingleAdmitCardBlock(item.exam, item.student, item.schedules)}
      ${index < items.length - 1 ? '<div class="page-break"></div>' : ''}
    `).join('')}
  </div>
</body>
</html>`;
}

export function printAdmitCard(examOrList, student, schedules) {
  if (typeof window === 'undefined') return;
  const html = generateAdmitCardHTML(examOrList, student, schedules);
  const printWindow = window.open('', '_blank', 'width=850,height=950');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  }
}
