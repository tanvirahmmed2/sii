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

    // Fetch departments, classes, sections, and sessions to provide reference hints
    const [deptsRes, classesRes, sessionsRes] = await Promise.all([
      queryDb(`SELECT name, code FROM website_departments WHERE website_id = $1 LIMIT 5`, [website.id]),
      queryDb(`SELECT name, code FROM website_classes WHERE website_id = $1 LIMIT 5`, [website.id]),
      queryDb(`SELECT name FROM website_sessions WHERE website_id = $1 LIMIT 5`, [website.id]),
    ]);

    const sampleDept = deptsRes.rows[0]?.name || 'Science';
    const sampleClass = classesRes.rows[0]?.name || 'Class 10';
    const sampleSession = sessionsRes.rows[0]?.name || '2026-2027';

    // Required columns according to specification: Department, Session, Class, Section, Registration No, Roll No, Email
    const data = [
      {
        'Department': sampleDept,
        'Session': sampleSession,
        'Class': sampleClass,
        'Section': 'Section A',
        'Registration No': '2026-001',
        'Roll No': '101',
        'Email': 'student1@institution.edu',
      },
      {
        'Department': sampleDept,
        'Session': sampleSession,
        'Class': sampleClass,
        'Section': 'Section B',
        'Registration No': '2026-002',
        'Roll No': '102',
        'Email': 'student2@institution.edu',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 }, // Department
      { wch: 18 }, // Session
      { wch: 18 }, // Class
      { wch: 16 }, // Section
      { wch: 20 }, // Registration No
      { wch: 12 }, // Roll No
      { wch: 28 }, // Email
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
