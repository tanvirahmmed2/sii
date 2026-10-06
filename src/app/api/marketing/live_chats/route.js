import { NextResponse } from 'next/server';
import { generateRandomHex, generateToken } from 'src/lib/utils/random';
import { cookies } from 'next/headers.js';
import { queryDb } from 'src/lib/database/db';
import { LIVE_CHAT_TOKEN, SITE_NAME } from 'src/lib/database/secret';

const COOKIE_NAME = LIVE_CHAT_TOKEN || 'hiesci-live';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours in seconds

function parseCookieData(cookieVal) {
  if (!cookieVal) return null;
  try {
    const parsed = JSON.parse(cookieVal);
    // Check 24-hour expiration window
    if (parsed.createdAt && Date.now() - parsed.createdAt > COOKIE_MAX_AGE * 1000) {
      return null;
    }
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
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
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
}

// GET: Retrieve active 24-hour live chat session and messages for guest
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cookieStore = await cookies();

    // Check cookie from request cookies, cookieStore, or query params
    const rawCookie =
      request.cookies.get(COOKIE_NAME)?.value ||
      cookieStore.get(COOKIE_NAME)?.value;
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

    // If chat does not exist or has been ended/closed, clear cookie
    if (!chat || String(chat.status || '').toUpperCase() === 'CLOSED') {
      const response = NextResponse.json({ success: true, chat: null, messages: [], device: null });
      try {
        cookieStore.delete(COOKIE_NAME);
      } catch (_) { }
      response.cookies.delete(COOKIE_NAME);
      return response;
    }

    // Fetch messages for this chat session
    const msgRes = await queryDb(
      'SELECT id, chat_id, sender_type, sender_name, message, created_at FROM live_chat_messages WHERE chat_id = $1 ORDER BY created_at ASC',
      [chat.id]
    );

    // Sanitize messages so internal staff/developer personal information is not exposed to visitors
    const sanitizedMessages = msgRes.rows.map((msg) => ({
      ...msg,
      sender_name: msg.sender_type === 'ADMIN' ? 'Support' : msg.sender_name,
    }));

    const response = NextResponse.json({
      success: true,
      chat,
      messages: sanitizedMessages,
      device: cookieData?.device || null,
      sessionId: chat.session_id,
      chatId: chat.id,
    });

    return response;
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

    // 1. START A NEW LIVE CHAT SESSION (24-hour cookie)
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

      const sessionId = generateToken(16);

      // Insert live chat session adhering to schema.psql
      const chatRes = await queryDb(
        `INSERT INTO live_chats (visitor_name, visitor_email, session_id, status, ip_address, user_agent, started_at)
         VALUES ($1, $2, $3, 'OPEN', $4, $5, CURRENT_TIMESTAMP)
         RETURNING *`,
        [visitorName, visitorEmail, sessionId, ip, userAgent]
      );
      const chat = chatRes.rows[0];

      const welcomeText = `Hello ${visitorName}!  Welcome to ${SITE_NAME || 'our platform'}. A support specialist will be with you shortly.`;
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

      const now = Date.now();
      const expiresAt = now + COOKIE_MAX_AGE * 1000;
      const cookieData = {
        sessionId,
        chatId: chat.id,
        visitorName: chat.visitor_name,
        visitorEmail: chat.visitor_email,
        createdAt: now,
        expiresAt,
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

      const cookieVal = Buffer.from(JSON.stringify(cookieData)).toString('base64');

      // Set cookie on cookieStore
      try {
        cookieStore.set(COOKIE_NAME, cookieVal, {
          maxAge: COOKIE_MAX_AGE,
          expires: new Date(expiresAt),
          path: '/',
          sameSite: 'lax',
          httpOnly: false,
        });
      } catch (_) { }

      // Build JSON response and attach Set-Cookie header directly to ensure client browser sets it
      const response = NextResponse.json({
        success: true,
        chat,
        messages: [welcomeMsg],
        device: cookieData.device,
        cookieData,
        cookieValue: cookieVal,
      });

      response.cookies.set(COOKIE_NAME, cookieVal, {
        maxAge: COOKIE_MAX_AGE,
        expires: new Date(expiresAt),
        path: '/',
        sameSite: 'lax',
        httpOnly: false, // Accessible client & server
      });

      return response;
    }

    // 2. GUEST VISITOR SENDS A MESSAGE
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

      // Check that chat session exists and is active
      const chatCheck = await queryDb('SELECT id, status FROM live_chats WHERE id = $1 LIMIT 1', [chatId]);
      if (chatCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Chat session not found or expired.' },
          { status: 404 }
        );
      }

      if (String(chatCheck.rows[0]?.status || '').toUpperCase() === 'CLOSED') {
        return NextResponse.json(
          { success: false, error: 'This live chat session has ended. Please start a new chat.' },
          { status: 400 }
        );
      }

      // Insert message adhering to schema.psql
      const msgRes = await queryDb(
        `INSERT INTO live_chat_messages (chat_id, sender_type, sender_name, message)
         VALUES ($1, 'VISITOR', $2, $3)
         RETURNING *`,
        [chatId, senderName, message]
      );

      // Touch chat updated_at and ensure status is at least OPEN
      await queryDb('UPDATE live_chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [chatId]);

      return NextResponse.json({
        success: true,
        message: msgRes.rows[0],
      });
    }

    // 3. END CHAT SESSION (clear 24-hour cookie and close session)
    if (action === 'end_chat' || action === 'clear') {
      const chatId = body.chat_id ? Number(body.chat_id) : null;
      if (chatId) {
        await queryDb("UPDATE live_chats SET status = 'CLOSED', ended_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1", [chatId]);
      }

      try {
        cookieStore.delete(COOKIE_NAME);
      } catch (_) { }

      const response = NextResponse.json({ success: true, message: 'Chat session ended and cookies cleared.' });
      response.cookies.delete(COOKIE_NAME);
      return response;
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('Error in live chat POST:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
