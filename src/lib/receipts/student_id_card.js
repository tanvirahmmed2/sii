import { SCHOOL_NAME } from 'src/lib/database/secret';

function renderSingleIDCardElement(cardData = {}) {
  const {
    id_card_no = '',
    student = {},
    expiry_date = 'N/A',
    issue_date = new Date().toLocaleDateString('en-GB')
  } = cardData;

  const schoolName = SCHOOL_NAME || student.school_name || '';
  const schoolAddress = student.school_address || '';
  const studentName = student.name || 'N/A';

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

  const regNo = student.registration_number || student.reg_no || 'N/A';
  const rollNo = student.roll ? String(student.roll) : 'N/A';
  const rawClass = student.class_name || 'N/A';
  const className = rawClass !== 'N/A' && !rawClass.toLowerCase().startsWith('class') ? `Class ${rawClass}` : rawClass;
  const sectionName = student.section_name || '';
  
  const dob = student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('en-GB') : 'N/A';
  const bloodGroup = student.blood_group || 'N/A';
  const studentContact = student.phone || student.number || student.emergency_contact || 'N/A';

  return `
    <!-- ID CARD CONTAINER WITH FRONT AND BACK SIDE -->
    <div style="display: flex; gap: 24px; flex-wrap: wrap; justify-content: center; margin-bottom: 30px; page-break-inside: avoid;">
      
      <!-- FRONT SIDE -->
      <div style="width: 280px; height: 460px; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.12); position: relative; display: flex; flex-direction: column; font-family: 'Inter', system-ui, sans-serif; border: 1px solid #cbd5e1;">
        
        <!-- Header (School Name & Address) -->
        <div style="background: linear-gradient(135deg, #1e73be 0%, #0f4c81 100%); color: #ffffff; padding: 14px 10px 38px 10px; text-align: center; position: relative;">
          ${schoolName ? `<div style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;">${schoolName}</div>` : ''}
          ${schoolAddress ? `<div style="font-size: 8.5px; font-weight: 500; opacity: 0.9; margin-top: 2px;">${schoolAddress}</div>` : ''}
          <div style="font-size: 8px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">Student Identity Card</div>

          <!-- Curved Bottom SVG Overlay -->
          <svg viewBox="0 0 500 150" preserveAspectRatio="none" style="position: absolute; bottom: -1px; left: 0; width: 100%; height: 30px;">
            <path d="M0,0 C150,90 350,-40 500,40 L500,150 L0,150 Z" fill="#ffffff"></path>
            <path d="M0,0 C150,90 350,-40 500,40" fill="none" stroke="#0f4c81" stroke-width="8"></path>
          </svg>
        </div>

        <!-- Student Photo -->
        <div style="display: flex; justify-content: center; margin-top: -34px; z-index: 2; position: relative;">
          ${student.image ? `
            <img src="${student.image}" alt="${studentName}" style="width: 82px; height: 82px; border-radius: 50%; object-fit: cover; border: 3.5px solid #0f4c81; background: #ffffff;" />
          ` : `
            <div style="width: 82px; height: 82px; border-radius: 50%; border: 3.5px solid #0f4c81; background-color: #e0f2fe; display: flex; align-items: center; justify-content: center; font-size: 30px; font-weight: bold; color: #1e73be;">
              ${studentName !== 'N/A' ? studentName.charAt(0).toUpperCase() : 'S'}
            </div>
          `}
        </div>

        <!-- Student Name & Class -->
        <div style="text-align: center; padding: 4px 10px 0 10px;">
          <div style="font-size: 13.5px; font-weight: 800; color: #0f172a; line-height: 1.2;">${studentName}</div>
          <div style="font-size: 9.5px; font-weight: 700; color: #0369a1; margin-top: 2px;">${className} ${sectionName ? `(${sectionName})` : ''}</div>
        </div>

        <!-- Details Table (Front Side: Reg No, Roll No, Father, Mother, DOB, Blood Group) -->
        <div style="padding: 8px 16px 14px 16px; font-size: 10px; color: #334155; line-height: 1.6; flex-grow: 1;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="font-weight: 600; color: #64748b; width: 44%; padding: 1.5px 0;">Reg No</td>
              <td style="width: 4%;">:</td>
              <td style="font-weight: 700; color: #0f172a;">${regNo}</td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: #64748b; padding: 1.5px 0;">Roll No</td>
              <td>:</td>
              <td style="font-weight: 700; color: #0f172a;">${rollNo}</td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: #64748b; padding: 1.5px 0;">Father's Name</td>
              <td>:</td>
              <td style="font-weight: 700; color: #0f172a;">${fatherName}</td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: #64748b; padding: 1.5px 0;">Mother's Name</td>
              <td>:</td>
              <td style="font-weight: 700; color: #0f172a;">${motherName}</td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: #64748b; padding: 1.5px 0;">Date of Birth</td>
              <td>:</td>
              <td style="font-weight: 700; color: #0f172a;">${dob}</td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: #64748b; padding: 1.5px 0;">Blood Group</td>
              <td>:</td>
              <td style="font-weight: 700; color: #dc2626;">${bloodGroup}</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- BACK SIDE -->
      <div style="width: 280px; height: 460px; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.12); position: relative; display: flex; flex-direction: column; font-family: 'Inter', system-ui, sans-serif; border: 1px solid #cbd5e1;">
        
        <!-- Top Pill Header -->
        <div style="padding: 14px 14px 4px 14px;">
          <div style="background-color: #1e73be; color: #ffffff; font-size: 10.5px; font-weight: 700; text-transform: uppercase; text-align: center; padding: 5px 10px; border-radius: 6px; letter-spacing: 0.5px;">
            Terms & Identity Information
          </div>
        </div>

        <!-- Rules Bullet Points Text -->
        <div style="padding: 8px 16px; font-size: 9.5px; color: #475569; line-height: 1.5;">
          <ul style="padding-left: 14px; margin: 0;">
            <li style="margin-bottom: 4px;">This card is non-transferable and remains institutional property.</li>
            <li>If found, please return to school address immediately.</li>
          </ul>
        </div>

        <!-- Contact & Dates Section -->
        <div style="padding: 4px 18px 10px 18px; font-size: 10px; color: #334155; line-height: 1.7; flex-grow: 1;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
            <tr>
              <td style="font-weight: 600; color: #64748b; width: 44%;">Student Contact</td>
              <td style="width: 4%;">:</td>
              <td style="font-weight: 700; color: #0f172a;">${studentContact}</td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: #64748b;">Issue Date</td>
              <td>:</td>
              <td style="font-weight: 700; color: #0f172a;">${issue_date}</td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: #64748b;">Expire Date</td>
              <td>:</td>
              <td style="font-weight: 700; color: #dc2626;">${expiry_date}</td>
            </tr>
          </table>
        </div>

        <!-- Bottom Dark Blue Footer with School Name, Address & QR Logo -->
        <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 70px; background: linear-gradient(135deg, #1e73be 0%, #0f4c81 100%); color: #ffffff; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between;">
          <svg viewBox="0 0 500 150" preserveAspectRatio="none" style="position: absolute; top: -28px; left: 0; width: 100%; height: 30px;">
            <path d="M0,150 C150,20 350,150 500,40 L500,150 L0,150 Z" fill="#1e73be"></path>
            <path d="M0,150 C150,20 350,150 500,40" fill="none" stroke="#0f4c81" stroke-width="10"></path>
          </svg>

          <div style="z-index: 2; margin-top: 4px; max-width: 190px;">
            ${schoolName ? `<div style="font-size: 11px; font-weight: 800; text-transform: uppercase; line-height: 1.2;">${schoolName}</div>` : ''}
            ${schoolAddress ? `<div style="font-size: 8px; opacity: 0.85; margin-top: 1px;">${schoolAddress}</div>` : ''}
          </div>

          <!-- QR Code Logo -->
          <div style="z-index: 2; background: #ffffff; padding: 2px; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=40x40&data=${encodeURIComponent(id_card_no || 'IDC-2026')}" alt="QR" style="width: 38px; height: 38px; display: block;" />
          </div>
        </div>

      </div>

    </div>
  `;
}

export function generateStudentIDCardHTML(cardDataOrArray = {}) {
  let items = [];
  if (Array.isArray(cardDataOrArray)) {
    items = cardDataOrArray;
  } else {
    items = [cardDataOrArray];
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Student ID Cards (${items.length})</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: 'Inter', sans-serif;
      background-color: #f4f4f5;
      color: #0f172a;
      padding: 20px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .wrapper {
      max-width: 900px;
      margin: 0 auto;
    }

    .action-bar {
      margin-bottom: 20px;
      display: flex;
      justify-content: flex-end;
    }

    .btn-print {
      background-color: #1e73be;
      color: #ffffff;
      border: none;
      padding: 10px 20px;
      font-size: 13px;
      font-weight: bold;
      cursor: pointer;
      border-radius: 6px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }

    .cards-grid {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    @media print {
      body { background: #ffffff; padding: 0; }
      .action-bar { display: none; }
      .cards-grid { display: block; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="action-bar">
      <button class="btn-print" onclick="window.print()">Print ID Cards (${items.length})</button>
    </div>

    <div class="cards-grid">
      ${items.map(item => renderSingleIDCardElement(item)).join('')}
    </div>
  </div>
</body>
</html>`;
}

export function printStudentIDCard(cardDataOrArray) {
  if (typeof window === 'undefined') return;
  const html = generateStudentIDCardHTML(cardDataOrArray);
  const printWindow = window.open('', '_blank', 'width=900,height=950');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  }
}