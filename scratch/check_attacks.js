const { queryDb } = require('../src/lib/database/db.js');

async function main() {
  const attacks = await queryDb('SELECT * FROM security_attack_logs ORDER BY id DESC LIMIT 10').catch(e => ({ rows: [] }));
  console.log('ATTACKS:', attacks.rows);

  const limits = await queryDb('SELECT * FROM security_rate_limits ORDER BY updated_at DESC LIMIT 10').catch(e => ({ rows: [] }));
  console.log('LIMITS:', limits.rows);

  const logins = await queryDb('SELECT * FROM developer_login_activities ORDER BY id DESC LIMIT 5').catch(e => ({ rows: [] }));
  console.log('DEV LOGINS:', logins.rows);

  const cLogins = await queryDb('SELECT * FROM creator_login_activities ORDER BY id DESC LIMIT 5').catch(e => ({ rows: [] }));
  console.log('CREATOR LOGINS:', cLogins.rows);
}

main().catch(console.error);

