const { queryDb } = require('../src/lib/database/db.js');
const { generateSecureOtp } = require('../src/lib/security/shield.js');

async function testFullFlow() {
  const devId = 4;
  const currentDevRes = await queryDb('SELECT * FROM developers WHERE id = $1', [devId]);
  const currentDev = currentDevRes.rows[0];
  console.log('Current Dev:', { id: currentDev.id, email: currentDev.email, phone: currentDev.phone });

  const newTestPhone = '+8801899998888';
  console.log('\n--- Step 1: Request change to', newTestPhone, '---');

  const generatedOtp = generateSecureOtp(6);
  await queryDb('DELETE FROM contact_update_verifications WHERE user_type = $1 AND user_id = $2', ['developer', devId]);
  await queryDb(
    `INSERT INTO contact_update_verifications (user_type, user_id, new_email, new_phone, otp_code, expires_at)
     VALUES ('developer', $1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '10 minutes')`,
    [devId, currentDev.email, newTestPhone, generatedOtp]
  );
  console.log('Generated OTP:', generatedOtp);

  console.log('\n--- Step 2: Verify with OTP ---');
  const verifyRes = await queryDb(
    `SELECT id, new_email, new_phone FROM contact_update_verifications
     WHERE user_type = 'developer' AND user_id = $1 AND otp_code = $2 AND expires_at > CURRENT_TIMESTAMP
     ORDER BY id DESC LIMIT 1`,
    [devId, generatedOtp]
  );

  console.log('Verify Result:', verifyRes.rows);
  if (verifyRes.rows.length === 0) {
    console.error('FAILED TO FIND VERIFICATION RECORD!');
    return;
  }

  const verifiedRecord = verifyRes.rows[0];
  const verifiedPhone = verifiedRecord.new_phone;
  const verifiedEmail = verifiedRecord.new_email;

  const updateRes = await queryDb(
    `UPDATE developers
     SET phone = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING id, name, email, phone, updated_at`,
    [verifiedPhone, devId]
  );
  console.log('Update Result in DB:', updateRes.rows[0]);

  await queryDb('UPDATE developers SET phone = $1 WHERE id = $2', [currentDev.phone, devId]);
  console.log('Reverted test phone back to original.');
}

testFullFlow().catch(console.error);

