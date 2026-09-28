import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';

export async function POST(request) {
  try {
    const body = await request.json();
    const name = body.name?.trim();
    const email = body.email?.trim()?.toLowerCase();
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
      `INSERT INTO contacts (name, email, subject, message, status) 
       VALUES ($1, $2, $3, $4, 'NEW') 
       RETURNING id, name, email, subject, message, status, created_at`,
      [name, email, subject, message]
    );

    return NextResponse.json({ success: true, contact: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

