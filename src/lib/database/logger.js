import { query } from './db.js';

export async function recordLoginLog({ userType, name = 'User', email = '', req = null, status = 'success' }) {
  try {
    let ipAddress = '127.0.0.1';
    let userAgent = 'Unknown Browser / Device';

    if (req && req.headers) {
      const forwarded = req.headers.get('x-forwarded-for');
      if (forwarded) {
        ipAddress = forwarded.split(',')[0].trim();
      } else {
        const realIp = req.headers.get('x-real-ip');
        if (realIp) ipAddress = realIp.trim();
      }

      const ua = req.headers.get('user-agent');
      if (ua) userAgent = ua;
    }

    await query(
      `INSERT INTO login_logs (user_type, user_role, name, email, ip_address, user_agent, status)
       VALUES ($1, $1, $2, $3, $4, $5, $6)`,
      [userType, name, email, ipAddress, userAgent, status]
    );
  } catch (error) {
    console.error('Failed to record login log:', error);
  }
}

export async function recordActivityLog({
  userType = 'admin',
  userName = 'Administrator',
  action,
  entityType,
  entityId = null,
  details = ''
}) {
  try {
    await query(
      `INSERT INTO activity_logs (user_type, user_role, user_name, action, entity_type, entity_id, details)
       VALUES ($1, $1, $2, $3, $4, $5, $6)`,
      [userType, userName, action, entityType, entityId, details]
    );
  } catch (error) {
    console.error('Failed to record activity log:', error);
  }
}
