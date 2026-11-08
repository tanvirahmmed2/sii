const { queryDb } = require('../src/lib/database/db.js');
const { getDeveloperSession } = require('../src/lib/middleware/developer.js');

async function test() {
  const sess = await queryDb("SELECT token FROM developer_login_sessions WHERE developer_id = 4 AND is_active = TRUE ORDER BY id DESC LIMIT 1");
  const token = sess.rows[0]?.token;
  console.log('Token exists:', !!token);

  const mockRequest = {
    headers: new Map([
      ['authorization', `Bearer ${token}`],
      ['user-agent', 'TestScript']
    ]),
    cookies: {
      get: (name) => (name === 'developer_user_token' ? { value: token } : null)
    },
    url: 'http://localhost:3000/api/marketing/developer/profile'
  };

  const dev = await getDeveloperSession(mockRequest);
  console.log('Authenticated Dev:', dev ? { id: dev.id, name: dev.name, email: dev.email, phone: dev.phone } : null);

  const currentDevRes = await queryDb('SELECT * FROM developers WHERE id = 4');
  console.log('Dev 4 from DB:', currentDevRes.rows[0]);
}

test().catch(console.error);

