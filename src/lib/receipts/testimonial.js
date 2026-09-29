import { SCHOOL_NAME } from 'src/lib/database/secret';

export function generateTestimonialHTML(data = {}) {
  const {
    testimonial_no = 'TEST-001024',
    student = {},
    academic_character = 'Excellent',
    conduct = 'Good',
    remarks = '',
    issue_date = new Date().toLocaleDateString('en-GB')
  } = data;

  const schoolName = SCHOOL_NAME || 'Star Cadet Academia';
  const studentName = student.name || 'Student Name';
  const regNo = student.registration_number || student.reg_no || 'N/A';
  const rollNo = student.roll ? String(student.roll) : 'N/A';
  const rawClass = student.class_name || 'N/A';
  const className = rawClass.toLowerCase().startsWith('class') ? rawClass : `Class ${rawClass}`;

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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Testimonial - ${studentName}</title>
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
      margin-bottom: 25px;
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

    .testimonial-body {
      font-size: 15px;
      line-height: 2.0;
      margin-top: 20px;
      margin-bottom: 30px;
      text-align: justify;
      text-indent: 40px;
    }

    .footer-section {
      margin-top: 60px;
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
      <button class="btn-print" onclick="window.print()">Print Testimonial</button>
    </div>

    <div class="container">
      <div class="header">
        <div class="board-title">${schoolName}</div>
        <div class="country-title">BANGLADESH</div>
      </div>

      <div class="top-meta-container">
        <div class="serial-box">
          <div>Ref No: ${testimonial_no}</div>
          <div style="margin-top: 2px; font-weight: normal; font-size: 11px;">Date: ${issue_date}</div>
        </div>

        <div class="doc-title-wrapper">
          <span class="doc-title">TESTIMONIAL</span>
        </div>
      </div>

      <div class="testimonial-body">
        This is to certify that <strong>${studentName}</strong>, Son/Daughter of <strong>${fatherName}</strong> and <strong>${motherName}</strong>, bearing Roll No. <strong>${rollNo}</strong> and Registration No. <strong>${regNo}</strong>, was a bona fide student of this institution in <strong>${className}</strong>.
        <br/><br/>
        During his/her study period in this institution, his/her academic performance was <strong>${academic_character}</strong> and general conduct was <strong>${conduct}</strong>. To the best of my knowledge, he/she did not take part in any activity subversive of the state or of discipline.
        <br/><br/>
        I wish him/her every success in life.
        ${remarks ? `<br/><br/><em>Remarks: ${remarks}</em>` : ''}
      </div>

      <div class="footer-section">
        <div>
          Date of Issue: ${issue_date}
        </div>
        <div style="text-align: center;">
          <div style="border-top: 1px solid #000; padding-top: 4px; width: 180px;">Principal / Headmaster</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function printTestimonial(data) {
  if (typeof window === 'undefined') return;
  const html = generateTestimonialHTML(data);
  const printWindow = window.open('', '_blank', 'width=850,height=950');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  }
}
