import { query } from '@/lib/db';

/**
 * Records a user login event into the login_logs database table.
 * @param {Object} params
 * @param {number|string} [params.userId]
 * @param {string} params.userType - 'admin', 'teacher', 'student', 'staff'
 * @param {string} [params.name]
 * @param {string} [params.email]
 * @param {Request} [params.req] - Next.js Request object to extract IP and User-Agent
 * @param {string} [params.status='success'] - 'success' or 'failed'
 */
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

/**
 * Records a system creation activity into the activity_logs database table.
 * @param {Object} params
 * @param {string} [params.userType='admin'] - 'admin', 'teacher', 'staff', 'system'
 * @param {string} [params.userName='Administrator']
 * @param {string} params.action - e.g. 'CREATE_ADMIN', 'CREATE_TEACHER', 'CREATE_CLASS', etc.
 * @param {string} params.entityType - 'admin', 'teacher', 'staff', 'admission', 'circular', 'news', 'club', 'class', 'section', 'subject', 'club_news', 'notice'
 * @param {number|string} [params.entityId]
 * @param {string} [params.details]
 */
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
