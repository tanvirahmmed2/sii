import { getWebsiteBrevoConfig } from '../src/lib/database/websiteBrevo.js';
import { pool } from '../src/lib/database/db.js';

async function testBrevoConfig() {
  const config = await getWebsiteBrevoConfig(3);
  console.log('AFIT Website Brevo Config:', {
    configured: config.configured,
    isCustom: config.isCustom,
    senderEmail: config.senderEmail,
    senderName: config.senderName,
    isActive: config.isActive,
  });
  await pool.end();
}

testBrevoConfig();
