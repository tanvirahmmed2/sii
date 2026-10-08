import { queryDb } from '../src/lib/database/db.js';

async function testCreatorStaffApi() {
  console.log('=== TESTING CREATOR STAFF MANAGEMENT API ===\n');

  try {
    // 1. Get creator 2 website (afit, id=3)
    const webRes = await queryDb(`SELECT id, creator_id, name, subdomain FROM websites WHERE creator_id = 2 LIMIT 1`);
    if (webRes.rows.length === 0) throw new Error('No website for creator 2');
    const website = webRes.rows[0];
    console.log(`Testing website: ${website.name} (id: ${website.id}, creator_id: ${website.creator_id})`);

    // 2. Test GET staff API handler
    const { GET, POST, PUT, DELETE } = await import('../src/app/api/marketing/creator/websites/staffs/route.js');

    const getReq = new Request(`http://localhost:3000/api/marketing/creator/websites/staffs?websiteId=${website.id}&creatorId=${website.creator_id}`);
    const getRes = await GET(getReq);
    const getData = await getRes.json();
    console.log('GET response status:', getRes.status, 'success:', getData.success);
    console.log('Modules available:', getData.modules?.length);
    console.log('Staffs found:', getData.staffs?.length);

    // 3. Test POST staff API handler
    const testEmail = `officer_${Date.now()}@afit.edu`;
    const postReq = new Request('http://localhost:3000/api/marketing/creator/websites/staffs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        websiteId: website.id,
        creatorId: website.creator_id,
        name: 'Academic Registrar Officer',
        email: testEmail,
        number: '+8801811223344',
        address: 'Dhaka, Bangladesh',
        bio: 'Senior academic records officer',
        permissions: {
          sis: { can_view: true, can_create: true, can_edit: true, can_delete: false },
          routine: { can_view: true, can_create: true, can_edit: true, can_delete: false },
          attendance: { can_view: true, can_create: true, can_edit: false, can_delete: false },
        },
        sendInvite: false,
        password: 'AfitPassword2026!',
      }),
    });

    const postRes = await POST(postReq);
    const postData = await postRes.json();
    console.log('\nPOST response status:', postRes.status, 'success:', postData.success);
    if (!postData.success) throw new Error(`POST failed: ${postData.error}`);
    const createdStaffId = postData.staff.id;
    console.log('Created staff id:', createdStaffId);

    // 4. Test PUT staff API handler (toggle_active and update_permissions)
    const toggleReq = new Request('http://localhost:3000/api/marketing/creator/websites/staffs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'toggle_active',
        staffId: createdStaffId,
        websiteId: website.id,
        creatorId: website.creator_id,
      }),
    });
    const toggleRes = await PUT(toggleReq);
    const toggleData = await toggleRes.json();
    console.log('\nPUT toggle_active status:', toggleData.isActive, 'message:', toggleData.message);

    // 5. Test DELETE staff API handler
    const delReq = new Request(`http://localhost:3000/api/marketing/creator/websites/staffs?staffId=${createdStaffId}&websiteId=${website.id}&creatorId=${website.creator_id}`, {
      method: 'DELETE',
    });
    const delRes = await DELETE(delReq);
    const delData = await delRes.json();
    console.log('\nDELETE status:', delRes.status, 'success:', delData.success, 'message:', delData.message);

    console.log('\n=== CREATOR STAFF API TEST PASSED! ===');
    process.exit(0);
  } catch (err) {
    console.error('Creator Staff API test failed:', err);
    process.exit(1);
  }
}

testCreatorStaffApi();
