import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers.js';
import { queryDb } from '@/lib/db/pg';
import { LIVE_CHAT_TOKEN, SITE_NAME } from '@/lib/db/secret';

const COOKIE_NAME = LIVE_CHAT_TOKEN;
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours in seconds

function parseCookieData(cookieVal) {
  if (!cookieVal) return null;
  try {
    const parsed = JSON.parse(cookieVal);
    // Check 24-hour window
    if (parsed.createdAt && Date.now() - parsed.createdAt > COOKIE_MAX_AGE * 1000) {
      return null;
    }
    return parsed;
  } catch (_) {
    try {
      const decoded = Buffer.from(cookieVal, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      if (parsed.createdAt && Date.now() - parsed.createdAt > COOKIE_MAX_AGE * 1000) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
}

// GET: Retrieve active live chat session and messages for guest
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cookieStore = await cookies();
    const rawCookie = cookieStore.get(COOKIE_NAME)?.value;
    const cookieData = parseCookieData(rawCookie);

    const sessionId = searchParams.get('sessionId') || cookieData?.sessionId;
    const chatId = searchParams.get('chatId') || cookieData?.chatId;

    if (!sessionId && !chatId) {
      return NextResponse.json({ success: true, chat: null, messages: [], device: null });
    }

    let chat = null;
    if (chatId) {
      const res = await queryDb('SELECT * FROM live_chats WHERE id = $1 LIMIT 1', [Number(chatId)]);
      chat = res.rows[0] || null;
    } else if (sessionId) {
      const res = await queryDb('SELECT * FROM live_chats WHERE session_id = $1 LIMIT 1', [sessionId]);
      chat = res.rows[0] || null;
    }

    if (!chat) {
      // Clear expired or invalid cookie
      try {
        cookieStore.delete(COOKIE_NAME);
      } catch (_) {}
      return NextResponse.json({ success: true, chat: null, messages: [], device: null });
    }

    // Fetch messages for this chat
    const msgRes = await queryDb(
      'SELECT id, chat_id, sender_type, sender_name, message, created_at FROM live_chat_messages WHERE chat_id = $1 ORDER BY created_at ASC',
      [chat.id]
    );

    // Sanitize messages so admin personal data / roles are never exposed to visitors
    const sanitizedMessages = msgRes.rows.map((msg) => ({
      ...msg,
      sender_name: msg.sender_type === 'ADMIN' ? 'Support' : msg.sender_name,
    }));

    return NextResponse.json({
      success: true,
      chat,
      messages: sanitizedMessages,
      device: cookieData?.device || null,
    });
  } catch (error) {
    console.error('Error fetching live chat:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Start chat, send message, or end chat
export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;
    const cookieStore = await cookies();

    // 1. START A NEW LIVE CHAT
    if (action === 'start_chat' || (!action && body.visitor_name)) {
      const visitorName = (body.visitor_name || '').trim();
      const visitorEmail = (body.visitor_email || '').trim().toLowerCase() || null;
      const devicePayload = body.device || {};

      if (!visitorName) {
        return NextResponse.json(
          { success: false, error: 'Visitor name is required to start a chat.' },
          { status: 400 }
        );
      }

      // Collect client IP and request details
      const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        '127.0.0.1';
      const userAgent = request.headers.get('user-agent') || 'Unknown';

      const sessionId = 'live_' + crypto.randomBytes(16).toString('hex');

      // Insert live chat session into database
      const chatRes = await queryDb(
        `INSERT INTO live_chats (visitor_name, visitor_email, session_id, status, ip_address)
         VALUES ($1, $2, $3, 'OPEN', $4)
         RETURNING *`,
        [visitorName, visitorEmail, sessionId, ip]
      );
      const chat = chatRes.rows[0];

      // Insert automated welcome greeting into live_chat_messages
      const welcomeText = `Hello ${visitorName}! 👋 Thanks for reaching out. A support specialist will be with you shortly.`;
      const welcomeRes = await queryDb(
        `INSERT INTO live_chat_messages (chat_id, sender_type, sender_name, message)
         VALUES ($1, 'ADMIN', $2, $3)
         RETURNING *`,
        [chat.id, 'Support', welcomeText]
      );
      const welcomeMsg = {
        ...welcomeRes.rows[0],
        sender_name: 'Support',
      };

      // Store device data and session details in cookie for 24 hours
      const deviceData = {
        sessionId,
        chatId: chat.id,
        visitorName: chat.visitor_name,
        visitorEmail: chat.visitor_email,
        createdAt: Date.now(),
        device: {
          userAgent,
          ip,
          platform: devicePayload.platform || 'Unknown',
          screen: devicePayload.screen || 'Unknown',
          language: devicePayload.language || 'en',
          os: devicePayload.os || 'Unknown',
          browser: devicePayload.browser || 'Unknown',
        },
      };

      const cookieVal = Buffer.from(JSON.stringify(deviceData)).toString('base64');
      cookieStore.set(COOKIE_NAME, cookieVal, {
        maxAge: COOKIE_MAX_AGE, // 24 hours
        path: '/',
        sameSite: 'lax',
        httpOnly: false, // accessible client & server
      });

      return NextResponse.json({
        success: true,
        chat,
        messages: [welcomeMsg],
        device: deviceData.device,
      });
    }

    // 2. GUEST SENDS A MESSAGE
    if (action === 'send_message') {
      const chatId = Number(body.chat_id);
      const message = (body.message || '').trim();
      const senderName = (body.sender_name || 'Visitor').trim();

      if (!chatId || !message) {
        return NextResponse.json(
          { success: false, error: 'Chat ID and message are required.' },
          { status: 400 }
        );
      }

      // Check that chat session exists
      const chatCheck = await queryDb('SELECT id, status FROM live_chats WHERE id = $1 LIMIT 1', [chatId]);
      if (chatCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Chat session not found or expired.' },
          { status: 404 }
        );
      }

      // Insert message
      const msgRes = await queryDb(
        `INSERT INTO live_chat_messages (chat_id, sender_type, sender_name, message)
         VALUES ($1, 'VISITOR', $2, $3)
         RETURNING *`,
        [chatId, senderName, message]
      );

      // Touch chat updated_at
      await queryDb('UPDATE live_chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [chatId]);

      return NextResponse.json({
        success: true,
        message: msgRes.rows[0],
      });
    }

    // 3. END CHAT SESSION (clear 24-hour cookie)
    if (action === 'end_chat' || action === 'clear') {
      const chatId = body.chat_id ? Number(body.chat_id) : null;
      if (chatId) {
        await queryDb("UPDATE live_chats SET status = 'CLOSED', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [chatId]);
      }
      cookieStore.delete(COOKIE_NAME);
      return NextResponse.json({ success: true, message: 'Chat session ended and cookies cleared.' });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('Error in live chat POST:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
