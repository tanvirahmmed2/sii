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

    const clientName = (body.clientName || '').trim();
    const clientEmail = (body.clientEmail || '').trim();
    const clientPhone = (body.clientPhone || '').trim();
    const serviceName = (body.serviceName || 'Consultation').trim();
    const appointmentDate = body.appointmentDate;
    const timeSlot = body.timeSlot || '10:00 AM - 11:00 AM';
    const notes = (body.notes || '').trim();

    if (!clientName || !clientEmail || !appointmentDate) {
      return NextResponse.json({ success: false, error: 'Name, email, and appointment date are required.' }, { status: 400 });
    }

    const res = await queryDb(`
      INSERT INTO website_appointments (website_id, client_name, client_email, client_phone, service_name, appointment_date, time_slot, notes, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
      RETURNING *
    `, [websiteId, clientName, clientEmail, clientPhone, serviceName, appointmentDate, timeSlot, notes]);

    return NextResponse.json({ success: true, appointment: res.rows[0] });
  } catch (error) {
    console.error('Website appointment submit error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
