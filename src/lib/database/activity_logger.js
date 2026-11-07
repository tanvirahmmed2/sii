import { query } from './db.js';

export async function logActivity({ userId, userType = 'staff', action, details = {} }) {
  try {
    await query(`
      INSERT INTO activity_logs (user_id, user_type, action, details)
      VALUES ($1, $2, $3, $4)
    `, [userId || null, userType, action, JSON.stringify(details)]);
  } catch (error) {
    console.error('Error writing to activity_logs:', error);
  }
}
