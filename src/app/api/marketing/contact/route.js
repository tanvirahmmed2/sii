import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const name = body.name?.trim();
    const email = body.email?.trim()?.toLowerCase();
    const phone = body.phone?.trim() || null;
    const institution = body.institution?.trim() || null;
    const subject = body.subject?.trim() || 'General Inquiry';
    const message = body.message?.trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and message are required.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    const res = await queryDb(
      `INSERT INTO contacts (name, email, phone, institution, subject, message, status) 
       VALUES ($1, $2, $3, $4, $5, $6, 'new') 
       RETURNING id, name, email, phone, institution, subject, message, status, created_at`,
      [name, email, phone, institution, subject, message]
    );

    return NextResponse.json({ success: true, contact: res.rows[0] });
  } catch (error) {
    console.error('Contact submission error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
