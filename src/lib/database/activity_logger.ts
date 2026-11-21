import { query } from './db';

export interface LogActivityParams {
  userId?: string | number | null;
  userType?: string;
  action: string;
  details?: Record<string, any>;
}

export async function logActivity({ userId, userType = 'staff', action, details = {} }: LogActivityParams): Promise<void> {
  try {
    await query(`
      INSERT INTO activity_logs (user_id, user_type, action, details)
      VALUES ($1, $2, $3, $4)
    `, [userId || null, userType, action, JSON.stringify(details)]);
  } catch (error) {
    console.error('Error writing to activity_logs:', error);
  }
}
