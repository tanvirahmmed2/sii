import { query } from '@/lib/db';

/**
 * Logs system activities to activity_logs table
 * @param {Object} param0 
 * @param {number|string} param0.userId - User ID of staff/admin performing action
 * @param {string} param0.userType - 'admin', 'staff', 'teacher', or 'system'
 * @param {string} param0.action - Short descriptor (e.g. 'ISSUE_ADMIT_CARD')
 * @param {Object} param0.details - Arbitrary details/metadata object
 */
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
