import http from 'http';
import app from '../src/app.js';

async function runTests() {
  console.log('🧪 Starting API Unit & Integration Verification...\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  let passed = 0;
  let failed = 0;

  const assert = (condition, name) => {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name}`);
      failed++;
    }
  };

  try {
    // Test 1: GET / (Root Route)
    const rootRes = await fetch(`${baseUrl}/`);
    const rootJson = await rootRes.json();
    assert(rootRes.status === 200, 'GET / returns 200 OK');
    assert(rootJson.data?.status === 'online', 'GET / response indicates online status');
    assert(rootJson.data?.endpoints !== undefined, 'GET / returns endpoints index');

    // Test 2: GET /dashboard (Frontend CRM UI)
    const dashRes = await fetch(`${baseUrl}/dashboard`);
    const dashHtml = await dashRes.text();
    assert(dashRes.status === 200, 'GET /dashboard returns 200 OK');
    assert(dashHtml.includes('Signature Detailing'), 'GET /dashboard serves CRM HTML with title');

    // Test 3: Static Asset GET /styles.css
    const cssRes = await fetch(`${baseUrl}/styles.css`);
    assert(cssRes.status === 200, 'GET /styles.css returns 200 OK');

    // Test 4: GET /health
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthJson = await healthRes.json();
    assert(healthRes.status === 200, 'GET /health returns 200 OK');
    assert(healthJson.data?.status === 'healthy', 'GET /health response indicates healthy status');

    // Test 2: GET /api
    const apiRes = await fetch(`${baseUrl}/api`);
    const apiJson = await apiRes.json();
    assert(apiRes.status === 200, 'GET /api returns 200 OK');
    assert(apiJson.data?.endpoints !== undefined, 'GET /api lists endpoints metadata');

    // Test 3: Validation Error on POST /api/leads with invalid payload
    const invalidPostRes = await fetch(`${baseUrl}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'A' }), // Missing phone & service, name too short
    });
    const invalidPostJson = await invalidPostRes.json();
    assert(invalidPostRes.status === 400, 'POST /api/leads with invalid body returns 400 Bad Request');
    assert(invalidPostJson.success === false, 'Invalid POST response has success: false');
    assert(
      Array.isArray(invalidPostJson.error?.details) && invalidPostJson.error.details.length >= 2,
      'Invalid POST response includes detailed Zod validation field errors'
    );

    // Test 4: Validation Error on GET /api/leads/:id with invalid UUID
    const invalidUuidRes = await fetch(`${baseUrl}/api/leads/not-a-valid-uuid`);
    const invalidUuidJson = await invalidUuidRes.json();
    assert(invalidUuidRes.status === 400, 'GET /api/leads/:id with non-UUID returns 400');
    assert(
      invalidUuidJson.error?.details?.[0]?.field === 'id',
      'Non-UUID GET response flags invalid id parameter'
    );

    // Test 5: WhatsApp Webhook Handshake (GET /api/webhook/whatsapp)
    const waVerifyRes = await fetch(`${baseUrl}/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=signature_crm_verify_token&hub.challenge=test_challenge_123`);
    const waVerifyText = await waVerifyRes.text();
    assert(waVerifyRes.status === 200, 'GET /api/webhook/whatsapp with valid token returns 200 OK');
    assert(waVerifyText === 'test_challenge_123', 'GET /api/webhook/whatsapp echoes challenge token');

    // Test 6: Meta WhatsApp Inbound Message (POST /api/webhook/whatsapp)
    const waPostRes = await fetch(`${baseUrl}/api/webhook/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { display_phone_number: '15551234567', phone_number_id: '123456789' },
                  contacts: [{ profile: { name: 'Rahul Test' }, wa_id: '919876543210' }],
                  messages: [
                    {
                      from: '919876543210',
                      id: 'wamid.test',
                      timestamp: '1710000000',
                      text: { body: '1' },
                      type: 'text',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      }),
    });
    const waPostJson = await waPostRes.json();
    assert(waPostRes.status === 200, 'POST /api/webhook/whatsapp with Meta payload returns 200 OK');
    assert(waPostJson.status === 'EVENT_RECEIVED', 'POST /api/webhook/whatsapp returns EVENT_RECEIVED');

    // Test 7: Instagram Webhook Handshake (GET /api/webhook/instagram)
    const igVerifyRes = await fetch(`${baseUrl}/api/webhook/instagram?hub.mode=subscribe&hub.verify_token=signature_crm_verify_token&hub.challenge=ig_challenge_456`);
    const igVerifyText = await igVerifyRes.text();
    assert(igVerifyRes.status === 200, 'GET /api/webhook/instagram with valid token returns 200 OK');
    assert(igVerifyText === 'ig_challenge_456', 'GET /api/webhook/instagram echoes challenge token');

    // Test 8: Instagram Inbound Webhook Payload (POST /api/webhook/instagram)
    const igPostRes = await fetch(`${baseUrl}/api/webhook/instagram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object: 'instagram',
        entry: [
          {
            id: '17841400000000000',
            messaging: [
              {
                sender: { id: 'test_ig_user_123' },
                recipient: { id: '17841400000000000' },
                timestamp: Date.now(),
                message: { mid: 'm_test_mid', text: 'Hi' },
              },
            ],
          },
        ],
      }),
    });
    const igPostJson = await igPostRes.json();
    assert(igPostRes.status === 200, 'POST /api/webhook/instagram returns 200 OK');
    assert(igPostJson.status === 'EVENT_RECEIVED', 'POST /api/webhook/instagram returns EVENT_RECEIVED');

    // Test 6: 404 Route Not Found
    const notFoundRes = await fetch(`${baseUrl}/api/non-existent-endpoint`);
    const notFoundJson = await notFoundRes.json();
    assert(notFoundRes.status === 404, 'Undefined route returns 404 Not Found');
    assert(notFoundJson.error?.code === 'NOT_FOUND', '404 error code is NOT_FOUND');

    console.log(`\n========================================`);
    console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    server.close();
  }
}

runTests();
