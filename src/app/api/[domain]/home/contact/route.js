import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { ensureContactsTables } from 'src/lib/database/contactsDb.js';

// GET: Public contact office details & status
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, message: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      institution: {
        id: website.id,
        name: website.name,
        email: website.email || null,
        phone: website.phone || null,
        address: website.address || null,
        eiin: website.eiin || null,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/[domain]/home/contact:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve institution contact information.' },
      { status: 500 }
    );
  }
}

// POST: Public submission of contact message / academic inquiry
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, message: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    await ensureContactsTables();

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON request payload.' },
        { status: 400 }
      );
    }

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = body.phone ? String(body.phone).trim() : null;
    const subject = body.subject ? String(body.subject).trim() : 'General Inquiry';
    const message = String(body.message || '').trim();

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Full name is required.' },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email address is required.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { success: false, message: 'Message content is required.' },
        { status: 400 }
      );
    }

    if (name.length > 255) {
      return NextResponse.json(
        { success: false, message: 'Name cannot exceed 255 characters.' },
        { status: 400 }
      );
    }

    if (subject.length > 255) {
      return NextResponse.json(
        { success: false, message: 'Subject cannot exceed 255 characters.' },
        { status: 400 }
      );
    }

    if (phone && phone.length > 50) {
      return NextResponse.json(
        { success: false, message: 'Phone number cannot exceed 50 characters.' },
        { status: 400 }
      );
    }

    const insertRes = await queryDb(
      `INSERT INTO website_contacts (website_id, name, email, phone, subject, message, status, is_starred)
       VALUES ($1, $2, $3, $4, $5, $6, 'new', FALSE)
       RETURNING id, website_id, name, email, phone, subject, status, created_at`,
      [website.id, name, email, phone, subject, message]
    );

    const newInquiry = insertRes.rows[0];

    return NextResponse.json(
      {
        success: true,
        message: 'Thank you! Your message has been received. Our office will respond to you shortly.',
        inquiry: newInquiry,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting contact message in /api/[domain]/home/contact:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to record your message. Please try again later.' },
      { status: 500 }
    );
  }
}
