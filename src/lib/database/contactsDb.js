import { queryDb } from './db.js';
import { hasStaffModulePermission } from '../middleware/staff.js';

let _tablesEnsured = false;

/**
 * Ensures website_contacts and website_contact_replies tables exist matching website_tables.psql schema.
 */
export async function ensureContactsTables() {
  if (_tablesEnsured) return;
  try {
    await queryDb(`
      CREATE TABLE IF NOT EXISTS website_contacts (
        id BIGSERIAL PRIMARY KEY,
        website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        subject VARCHAR(255),
        message TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'closed', 'spam')),
        is_starred BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS website_contact_replies (
        id BIGSERIAL PRIMARY KEY,
        website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        contact_id BIGINT NOT NULL REFERENCES website_contacts(id) ON DELETE CASCADE,
        staff_id BIGINT REFERENCES website_staffs(id) ON DELETE SET NULL,
        staff_name VARCHAR(255),
        reply_subject VARCHAR(255) NOT NULL,
        reply_body TEXT NOT NULL,
        sender_email VARCHAR(255) NOT NULL,
        mailer_type VARCHAR(50) NOT NULL DEFAULT 'website' CHECK (mailer_type IN ('website', 'main')),
        delivery_status VARCHAR(50) NOT NULL DEFAULT 'SENT' CHECK (delivery_status IN ('SENT', 'FAILED')),
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_ws_contacts_website ON website_contacts(website_id);
      CREATE INDEX IF NOT EXISTS idx_ws_contacts_status ON website_contacts(website_id, status);
      CREATE INDEX IF NOT EXISTS idx_ws_contacts_email ON website_contacts(website_id, email);
      CREATE INDEX IF NOT EXISTS idx_ws_contacts_created ON website_contacts(website_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_ws_contact_replies_contact ON website_contact_replies(contact_id);
      CREATE INDEX IF NOT EXISTS idx_ws_contact_replies_website ON website_contact_replies(website_id);
    `);
    _tablesEnsured = true;
  } catch (err) {
    console.warn('[contactsDb] Error ensuring contact tables:', err.message);
  }
}

/**
 * Checks whether an authenticated staff member is allowed to perform an action on contacts/inquiries.
 * Checks module permissions for 'communications', 'website-builder', and 'contacts'.
 *
 * @param {Object} staffSession
 * @param {'view'|'create'|'edit'|'delete'} [action='view']
 * @returns {boolean}
 */
export function checkStaffContactsPermission(staffSession, action = 'view') {
  if (!staffSession) return false;
  const staff = staffSession.staff || staffSession.user || staffSession;
  if (!staff) return false;

  const perms = staff.permissions || staffSession.permissions || {};
  // If no granular permissions have been explicitly assigned to this staff member,
  // allow general staff access (default tenant administrator/staff)
  if (Object.keys(perms).length === 0) {
    return true;
  }

  // Check 'communications' module permission (canonical module for contacts, mailer, and messaging)
  if (hasStaffModulePermission(staffSession, 'communications', action)) {
    return true;
  }

  // Also check 'website-builder' module permission
  if (hasStaffModulePermission(staffSession, 'website-builder', action)) {
    return true;
  }

  // Direct 'contacts' module slug if individually provisioned
  if (hasStaffModulePermission(staffSession, 'contacts', action)) {
    return true;
  }

  return false;
}
