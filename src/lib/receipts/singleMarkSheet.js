import { SCHOOL_NAME } from 'src/lib/database/secret';

/**
 * Calculates letter grade and grade point from score percentage or existing properties
 */
function getSubjectGradeInfo(markItem) {
  if (markItem.letter_grade && (markItem.grade_point !== undefined && markItem.grade_point !== null)) {
    return {
      letter: String(markItem.letter_grade),
      point: Number(markItem.grade_point).toFixed(1)
    };
  }

  const obtained = Number(markItem.marks_obtained || markItem.marks || 0);
  const total = Number(markItem.total_marks || markItem.max_marks || 100);
  const pct = total > 0 ? (obtained / total) * 100 : 0;

  if (pct >= 80) return { letter: 'A+', point: '5.0' };
  if (pct >= 70) return { letter: 'A', point: '4.0' };
  if (pct >= 60) return { letter: 'A-', point: '3.5' };
  if (pct >= 50) return { letter: 'B', point: '3.0' };
  if (pct >= 40) return { letter: 'C', point: '2.0' };
  if (pct >= 33) return { letter: 'D', point: '1.0' };
  return { letter: 'F', point: '0.0' };
}

export function generateSingleMarkSheetHTML(data = {}) {
  const { student = {}, exam = {}, result = {}, marks = [] } = data;

  const schoolName = SCHOOL_NAME || '';

  const studentName = student.name || 'N/A';
  let fatherName = student.father_name || '';
  let motherName = student.mother_name || '';

  if ((!fatherName || fatherName === 'N/A') && student.parents_info) {
    const fMatch = student.parents_info.match(/Father:\s*([^(,]+)/i);
    if (fMatch) fatherName = fMatch[1].trim();
  }
  if ((!motherName || motherName === 'N/A') && student.parents_info) {
    const mMatch = student.parents_info.match(/Mother:\s*([^(,]+)/i);
    if (mMatch) motherName = mMatch[1].trim();
  }

  fatherName = fatherName || 'N/A';
  motherName = motherName || 'N/A';

  const regNo = student.registration_number || student.reg_no || 'N/A';
  const rollNo = student.roll ? String(student.roll) : 'N/A';
  const rawClass = student.class_name || 'N/A';
  const className = rawClass !== 'N/A' && !rawClass.toLowerCase().startsWith('class') ? `Class ${rawClass}` : rawClass;
  const sectionName = student.section_name || 'N/A';

  const examName = exam.name || exam.exam_name || 'Academic Examination';
  const examTerm = exam.term || exam.exam_term ? `(${exam.term || exam.exam_term})` : '';

  const gpaVal = result.gpa !== undefined && result.gpa !== null ? Number(result.gpa).toFixed(2) : '0.00';
  const statusVal = result.status ? String(result.status).toUpperCase() : (Number(gpaVal) >= 2.00 ? 'PASS' : 'FAIL');
  const isPass = statusVal === 'PASS';

  const serialNo = `TR-${String(student.id || result.id || '').padStart(6, '0')}`;
  const issuedDate = new Date().toLocaleDateString('en-GB');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Academic Transcript - ${studentName}</title>
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

    .marksheet-wrapper {
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

    .marksheet-container {
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
    .exam-title {
      font-size: 16px;
      font-weight: bold;
      margin-top: 6px;
    }

    .top-meta-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 15px;
      margin-bottom: 10px;
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

    .grading-scale-table {
      border-collapse: collapse;
      font-size: 10px;
      text-align: center;
    }
    .grading-scale-table th, .grading-scale-table td {
      border: 1px solid #000000;
      padding: 1px 5px;
    }
    .grading-scale-table th {
      font-weight: bold;
      background-color: #f8f8f8;
    }

    .student-info-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      margin-bottom: 20px;
      font-size: 13px;
      line-height: 1.6;
    }
    .student-info-table td {
      padding: 2px 0;
      vertical-align: top;
    }
    .student-info-table td.label {
      width: 160px;
    }
    .student-info-table td.colon {
      width: 15px;
      text-align: center;
    }
    .student-info-table td.val {
      font-weight: bold;
    }

    .marks-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    .marks-table th, .marks-table td {
      border: 1px solid #000000;
      padding: 6px 8px;
      font-size: 13px;
    }
    .marks-table th {
      font-weight: bold;
      text-align: center;
      background-color: #f9f9f9;
    }
    .marks-table td.text-center { text-align: center; }
    .marks-table td.text-right { text-align: right; }
    .marks-table td.subject-name { font-weight: bold; }

    .footer-section {
      margin-top: 45px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 13px;
    }

    .pub-date {
      font-weight: bold;
    }

    @media print {
      body { background: #ffffff; padding: 0; }
      .action-bar { display: none; }
      .marksheet-container {
        border: 10px double #000000;
        box-shadow: none;
        padding: 20px 25px;
      }
    }
  </style>
</head>
<body>
  <div class="marksheet-wrapper">
    <div class="action-bar">
      <button class="btn-print" onclick="window.print()">Print Transcript</button>
    </div>

    <div class="marksheet-container">
      <div class="header">
        ${schoolName ? `<div class="board-title">${schoolName}</div>` : ''}
        <div class="country-title">BANGLADESH</div>
        <div class="exam-title">${examName} ${examTerm}</div>
      </div>

      <div class="top-meta-container">
        <div class="serial-box">
          <div>${serialNo}</div>
          <div style="margin-top: 4px; font-weight: normal; font-size: 11px;">Issued: ${issuedDate}</div>
        </div>

        <div class="doc-title-wrapper">
          <span class="doc-title">ACADEMIC TRANSCRIPT</span>
        </div>

        <table class="grading-scale-table">
          <thead>
            <tr>
              <th>Letter Grade</th>
              <th>Class Interval (%)</th>
              <th>Grade Point</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>A+</td><td>80-100</td><td>5.0</td></tr>
            <tr><td>A</td><td>70-79</td><td>4.0</td></tr>
            <tr><td>A-</td><td>60-69</td><td>3.5</td></tr>
            <tr><td>B</td><td>50-59</td><td>3.0</td></tr>
            <tr><td>C</td><td>40-49</td><td>2.0</td></tr>
            <tr><td>D</td><td>33-39</td><td>1.0</td></tr>
            <tr><td>F</td><td>00-32</td><td>0.0</td></tr>
          </tbody>
        </table>
      </div>

      <table class="student-info-table">
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
          <td class="label">Roll No.</td>
          <td class="colon">:</td>
          <td class="val" style="width: 200px;">${rollNo}</td>
          <td class="label" style="width: 120px;">Registration No.</td>
          <td class="colon">:</td>
          <td class="val">${regNo}</td>
        </tr>
        <tr>
          <td class="label">Group / Class</td>
          <td class="colon">:</td>
          <td class="val">${className} (${sectionName})</td>
          <td class="label">Status</td>
          <td class="colon">:</td>
          <td class="val" style="color: ${isPass ? '#059669' : '#dc2626'};">${statusVal}</td>
        </tr>
      </table>

      <table class="marks-table">
        <thead>
          <tr>
            <th style="width: 45px;">SL. No.</th>
            <th>Name of Subjects</th>
            <th style="width: 80px;">Full Marks</th>
            <th style="width: 90px;">Marks Obtained</th>
            <th style="width: 75px;">Letter Grade</th>
            <th style="width: 75px;">Grade Point</th>
            <th style="width: 85px;">GPA</th>
          </tr>
        </thead>
        <tbody>
          ${marks.length === 0 ? `
            <tr>
              <td colspan="7" class="text-center" style="font-style: italic; padding: 15px;">No marks entry found.</td>
            </tr>
          ` : (() => {
            const rowCount = marks.length;
            return marks.map((m, idx) => {
              const obtained = Number(m.marks_obtained || m.marks || 0);
              const total = Number(m.total_marks || m.max_marks || 100);
              const gradeInfo = getSubjectGradeInfo(m);

              return `
                <tr>
                  <td class="text-center">${idx + 1}</td>
                  <td class="subject-name">${m.subject_name || m.name || 'N/A'}</td>
                  <td class="text-center">${total}</td>
                  <td class="text-center" style="font-weight: bold;">${obtained}</td>
                  <td class="text-center" style="font-weight: bold;">${gradeInfo.letter}</td>
                  <td class="text-center" style="font-weight: bold;">${gradeInfo.point}</td>
                  ${idx === 0 ? `<td rowspan="${rowCount}" class="text-center" style="font-size: 16px; font-weight: bold; vertical-align: middle; background-color: #fff;">${gpaVal}</td>` : ''}
                </tr>
              `;
            }).join('');
          })()}
        </tbody>
      </table>

      ${student.additional_subject ? `
      <table class="marks-table" style="margin-top: 10px;">
        <tr style="background-color: #f9f9f9;">
          <td colspan="7" style="font-weight: bold; font-style: italic;">Additional Subject:</td>
        </tr>
        <tr>
          <td class="text-center" style="width: 45px;">${marks.length + 1}</td>
          <td class="subject-name">${student.additional_subject}</td>
          <td class="text-center" style="width: 80px;">100</td>
          <td class="text-center" style="width: 90px; font-weight: bold;">${student.additional_marks || '-'}</td>
          <td class="text-center" style="width: 75px; font-weight: bold;">${student.additional_grade || '-'}</td>
          <td class="text-center" style="width: 75px; font-weight: bold;">${student.additional_point || '-'}</td>
          <td class="text-center" style="width: 85px; font-weight: bold;">${student.additional_gpa || '-'}</td>
        </tr>
      </table>
      ` : ''}

      <div class="footer-section">
        <div class="pub-date">
          Date of Publication of Results : <span style="font-style: italic;">${issuedDate}</span>
        </div>
      </div>

    </div>
  </div>
</body>
</html>`;
}

export function printSingleMarkSheet(data = {}) {
  if (typeof window === 'undefined') return;
  const html = generateSingleMarkSheetHTML(data);
  const printWindow = window.open('', '_blank', 'width=900,height=950');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  }
}