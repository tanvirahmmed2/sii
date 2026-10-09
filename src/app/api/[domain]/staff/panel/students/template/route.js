import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution not found.' }, { status: 404 });
    }

    // Fetch classes, sections, and sessions to provide reference hints
    const [classesRes, sessionsRes] = await Promise.all([
      queryDb(`SELECT name, code FROM website_classes WHERE website_id = $1 LIMIT 5`, [website.id]),
      queryDb(`SELECT name FROM website_sessions WHERE website_id = $1 LIMIT 5`, [website.id]),
    ]);

    const sampleClass = classesRes.rows[0]?.code || classesRes.rows[0]?.name || 'Class 10';
    const sampleSession = sessionsRes.rows[0]?.name || '2026-2027';

    // Sample data rows (Registration No and Class are primary)
    const data = [
      {
        'Registration No': 'REG-2026-001',
        'Class Code': sampleClass,
        'Section Name': 'Section A',
        'Session Name': sampleSession,
        'Roll No': '101',
        'Student Name': 'Tanvir Rahman',
        'Email Address': 'tanvir.student@example.com',
        'Phone Number': '01711000111',
      },
      {
        'Registration No': 'REG-2026-002',
        'Class Code': sampleClass,
        'Section Name': 'Section A',
        'Session Name': sampleSession,
        'Roll No': '102',
        'Student Name': 'Sadia Akter',
        'Email Address': 'sadia.student@example.com',
        'Phone Number': '01822000222',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 }, // Registration No
      { wch: 16 }, // Class Code
      { wch: 16 }, // Section Name
      { wch: 16 }, // Session Name
      { wch: 12 }, // Roll No
      { wch: 20 }, // Student Name (optional)
      { wch: 28 }, // Email Address (optional)
      { wch: 16 }, // Phone Number (optional)
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students_Template');

    const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="student_registration_template.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error generating student registration template:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate spreadsheet template.' }, { status: 500 });
  }
}
