import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// PUBLIC SUBSCRIBE ENDPOINT
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = body.email?.trim()?.toLowerCase();
    const source = (body.source || 'HOME_FOOTER').trim();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email address is required.' },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    // Check if email already exists in subscribers table
    const existing = await queryDb(
      'SELECT id, email, status, source FROM subscribers WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email]
    );

    if (existing.rows.length > 0) {
      const sub = existing.rows[0];
      if (sub.status === 'SUBSCRIBED') {
        return NextResponse.json({
          success: true,
          alreadySubscribed: true,
          message: 'You are already subscribed to our newsletter!',
          record: sub,
        });
      }

      // Re-activate previously unsubscribed email
      const updated = await queryDb(
        `UPDATE subscribers 
         SET status = 'SUBSCRIBED', source = $1, subscribed_at = CURRENT_TIMESTAMP 
         WHERE id = $2 
         RETURNING id, email, status, source, subscribed_at`,
        [source, sub.id]
      );

      return NextResponse.json({
        success: true,
        message: 'Welcome back! Your subscription has been reactivated.',
        record: updated.rows[0],
      });
    }

    // Insert new subscriber record
    const res = await queryDb(
      `INSERT INTO subscribers (email, status, source, subscribed_at) 
       VALUES ($1, 'SUBSCRIBED', $2, CURRENT_TIMESTAMP) 
       RETURNING id, email, status, source, subscribed_at`,
      [email, source]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Thank you for subscribing to our newsletter!',
        record: res.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process subscription.' },
      { status: 500 }
    );
  }
}

// GET SUBSCRIBERS STATUS / STATS
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.trim()?.toLowerCase();

    if (email) {
      const res = await queryDb(
        'SELECT id, email, status, subscribed_at FROM subscribers WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [email]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ success: true, isSubscribed: false });
      }
      return NextResponse.json({
        success: true,
        isSubscribed: res.rows[0].status === 'SUBSCRIBED',
        status: res.rows[0].status,
      });
    }

    const countRes = await queryDb(
      "SELECT count(*) FROM subscribers WHERE status = 'SUBSCRIBED'"
    );
    return NextResponse.json({
      success: true,
      totalSubscribers: parseInt(countRes.rows[0].count, 10) || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
