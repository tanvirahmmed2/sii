import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, message: 'Institutional portal not found.' }, { status: 404 });
    }

    const body = await request.json();
    const name = body.name?.trim();
    const email = body.email?.trim();
    const phone = body.phone?.trim() || null;
    const subject = body.subject?.trim() || 'General Inquiry';
    const message = body.message?.trim();

    if (!name || !email || !message) {
      return NextResponse.json({ success: false, message: 'Name, email, and message are required.' }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, message: 'Please provide a valid email address.' }, { status: 400 });
    }

    const insertRes = await queryDb(
      `INSERT INTO website_contacts (website_id, name, email, phone, subject, message, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'new')
       RETURNING id, name, email, subject, created_at`,
      [website.id, name, email, phone, subject, message]
    );

    return NextResponse.json({
      success: true,
      message: 'Thank you! Your inquiry has been received and our desk will respond shortly.',
      inquiry: insertRes.rows[0],
    }, { status: 201 });
  } catch (error) {
    console.error('Error in public contact submission:', error);
    return NextResponse.json({ success: false, message: 'Failed to submit contact message.' }, { status: 500 });
  }
}
