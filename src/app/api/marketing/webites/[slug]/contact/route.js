import { NextResponse } from 'next/server';
import { resolveWebsiteFromRequest } from '@/lib/middleware/user';
import { queryDb } from '@/lib/db/pg';

export async function POST(request, context) {
  try {
    const params = await context.params;
    const slug = params.slug;

    const website = await resolveWebsiteFromRequest(request, slug);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }

    const websiteId = website.id;
    const body = await request.json();

    const name = (body.name || '').trim();
    const email = (body.email || '').trim();
    const phone = (body.phone || '').trim();
    const subject = (body.subject || 'General Inquiry').trim();
    const message = (body.message || '').trim();

    if (!name || !email || !message) {
      return NextResponse.json({ success: false, error: 'Name, email, and message are required.' }, { status: 400 });
    }

    const res = await queryDb(`
      INSERT INTO website_contact (website_id, name, email, phone, subject, message, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'NEW')
      RETURNING *
    `, [websiteId, name, email, phone, subject, message]);

    return NextResponse.json({ success: true, contact: res.rows[0] });
  } catch (error) {
    console.error('Website contact submit error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
