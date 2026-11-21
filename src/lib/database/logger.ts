import { query } from './db';

export interface RecordLoginLogParams {
  userType: string;
  name?: string;
  email?: string;
  req?: any;
  status?: string;
}

export async function recordLoginLog({ userType, name = 'User', email = '', req = null, status = 'success' }: RecordLoginLogParams): Promise<void> {
  try {
    let ipAddress = '127.0.0.1';
    let userAgent = 'Unknown Browser / Device';

    if (req && req.headers) {
      const forwarded = typeof req.headers.get === 'function' ? req.headers.get('x-forwarded-for') : req.headers['x-forwarded-for'];
      if (forwarded) {
        ipAddress = String(forwarded).split(',')[0].trim();
      } else {
        const realIp = typeof req.headers.get === 'function' ? req.headers.get('x-real-ip') : req.headers['x-real-ip'];
        if (realIp) ipAddress = String(realIp).trim();
      }

      const ua = typeof req.headers.get === 'function' ? req.headers.get('user-agent') : req.headers['user-agent'];
      if (ua) userAgent = String(ua);
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

export interface RecordActivityLogParams {
  userType?: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  details?: string;
}

export async function recordActivityLog({
  userType = 'admin',
  userName = 'Administrator',
  action,
  entityType,
  entityId = null,
  details = ''
}: RecordActivityLogParams): Promise<void> {
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
