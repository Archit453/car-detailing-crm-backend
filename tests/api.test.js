import http from 'http';
import app from '../src/app.js';
import { SESSION_COOKIE_NAME } from '../src/utils/session.js';

async function runTests() {
  console.log('🧪 Starting API Unit & Integration Verification (with Auth & KeepAlive)...\n');

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

    // Test 2: GET /login (Authentication UI)
    const loginRes = await fetch(`${baseUrl}/login`);
    const loginHtml = await loginRes.text();
    assert(loginRes.status === 200, 'GET /login returns 200 OK');
    assert(loginHtml.includes('Signature Detailing'), 'GET /login serves Login HTML');

    // Test 3: Unauthenticated GET /dashboard redirects to /login
    const dashRedirectRes = await fetch(`${baseUrl}/dashboard`, { redirect: 'manual' });
    assert(dashRedirectRes.status === 302, 'GET /dashboard without session redirects (302)');
    assert(dashRedirectRes.headers.get('location') === '/login', 'GET /dashboard redirects to /login');

    // Test 4: Static Asset GET /styles.css
    const cssRes = await fetch(`${baseUrl}/styles.css`);
    assert(cssRes.status === 200, 'GET /styles.css returns 200 OK');

    // Test 5: GET /health
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthJson = await healthRes.json();
    assert(healthRes.status === 200, 'GET /health returns 200 OK');
    assert(healthJson.data?.status === 'healthy', 'GET /health response indicates healthy status');

    // Test 6: Unauthenticated GET /api/leads returns 401 Unauthorized
    const unauthLeadsRes = await fetch(`${baseUrl}/api/leads`);
    const unauthLeadsJson = await unauthLeadsRes.json();
    assert(unauthLeadsRes.status === 401, 'Unauthenticated GET /api/leads returns 401 Unauthorized');
    assert(unauthLeadsJson.error?.code === 'UNAUTHORIZED', '401 error code is UNAUTHORIZED');

    // Test 7: Public POST /api/leads (Website form submission works WITHOUT auth)
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

    // Test 8: POST /api/auth/login with invalid credentials fails
    const badLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'WrongPassword123' }),
    });
    const badLoginJson = await badLoginRes.json();
    assert(badLoginRes.status === 401, 'POST /api/auth/login with wrong password returns 401');
    assert(badLoginJson.success === false, 'Bad login has success: false');

    // Test 9: POST /api/auth/login with valid credentials succeeds & issues session cookie
    const goodLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'SignatureCRM@2026!' }),
    });
    const goodLoginJson = await goodLoginRes.json();
    const setCookieHeader = goodLoginRes.headers.get('set-cookie') || '';
    assert(goodLoginRes.status === 200, 'POST /api/auth/login with valid credentials returns 200 OK');
    assert(goodLoginJson.success === true, 'Successful login has success: true');
    assert(setCookieHeader.includes(SESSION_COOKIE_NAME), 'Login sets crm_session HTTP-only cookie');

    // Extract cookie for subsequent authenticated requests
    const sessionCookie = setCookieHeader.split(';')[0];

    // Test 10: Authenticated GET /api/auth/me
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: sessionCookie },
    });
    const meJson = await meRes.json();
    assert(meRes.status === 200, 'GET /api/auth/me with session returns 200 OK');
    assert(meJson.data?.authenticated === true, 'Session is reported as active');

    // Test 11: Authenticated GET /dashboard serves CRM HTML
    const authDashRes = await fetch(`${baseUrl}/dashboard`, {
      headers: { Cookie: sessionCookie },
    });
    const authDashHtml = await authDashRes.text();
    assert(authDashRes.status === 200, 'Authenticated GET /dashboard returns 200 OK');
    assert(authDashHtml.includes('Signature Detailing'), 'Dashboard HTML contains title');

    // Test 12: Supabase Keep-Alive Ping (GET /api/keepalive)
    const keepAliveRes = await fetch(`${baseUrl}/api/keepalive`);
    const keepAliveJson = await keepAliveRes.json();
    assert(keepAliveRes.status === 200, 'GET /api/keepalive returns 200 OK');
    assert(keepAliveJson.data?.status === 'alive', 'Keepalive status is alive');
    assert(keepAliveJson.data?.database === 'connected', 'Database reports connected');
    assert(typeof keepAliveJson.data?.latencyMs === 'number', 'Latency in ms is reported');

    // Test 13: WhatsApp Webhook Handshake (GET /api/webhook/whatsapp)
    const waVerifyRes = await fetch(`${baseUrl}/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=signature_crm_verify_token&hub.challenge=test_challenge_123`);
    const waVerifyText = await waVerifyRes.text();
    assert(waVerifyRes.status === 200, 'GET /api/webhook/whatsapp with valid token returns 200 OK');
    assert(waVerifyText === 'test_challenge_123', 'GET /api/webhook/whatsapp echoes challenge token');

    // Test 14: Meta WhatsApp Inbound Message (POST /api/webhook/whatsapp)
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

    // Test 15: Instagram Webhook Handshake (GET /api/webhook/instagram)
    const igVerifyRes = await fetch(`${baseUrl}/api/webhook/instagram?hub.mode=subscribe&hub.verify_token=signature_crm_verify_token&hub.challenge=ig_challenge_456`);
    const igVerifyText = await igVerifyRes.text();
    assert(igVerifyRes.status === 200, 'GET /api/webhook/instagram with valid token returns 200 OK');
    assert(igVerifyText === 'ig_challenge_456', 'GET /api/webhook/instagram echoes challenge token');

    // Test 16: Instagram Inbound Webhook Payload (POST /api/webhook/instagram)
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
    // Test 17: Unauthenticated GET /api/inbox/whatsapp/conversations returns 401
    const unauthInboxRes = await fetch(`${baseUrl}/api/inbox/whatsapp/conversations`);
    assert(unauthInboxRes.status === 401, 'Unauthenticated GET /api/inbox/whatsapp/conversations returns 401');

    // Test 17: POST /api/auth/logout clears session
    // Test 18: Authenticated GET /api/inbox/whatsapp/conversations returns 200
    const authInboxRes = await fetch(`${baseUrl}/api/inbox/whatsapp/conversations`, {
      headers: { Cookie: sessionCookie },
    });
    const authInboxJson = await authInboxRes.json();
    assert(authInboxRes.status === 200, 'Authenticated GET /api/inbox/whatsapp/conversations returns 200 OK');
    assert(Array.isArray(authInboxJson.data), 'Conversations data is an array');

    // Test 19: Unauthenticated POST /api/inbox/whatsapp/send returns 401
    const unauthSendRes = await fetch(`${baseUrl}/api/inbox/whatsapp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+15551234567', message: 'Hello' }),
    });
    assert(unauthSendRes.status === 401, 'Unauthenticated POST /api/inbox/whatsapp/send returns 401');

    // Test 20: Authenticated POST /api/inbox/whatsapp/send validation rejects empty message (400)
    const invalidSendRes = await fetch(`${baseUrl}/api/inbox/whatsapp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ phone: '+15551234567', message: '' }),
    });
    assert(invalidSendRes.status === 400, 'POST /api/inbox/whatsapp/send with empty message returns 400');

    // Test 21: Authenticated POST /api/inbox/whatsapp/send sends message (201)
    const validSendRes = await fetch(`${baseUrl}/api/inbox/whatsapp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ phone: '+15551234567', customerName: 'Test Customer', message: 'Hi from CRM Inbox' }),
    });
    const validSendJson = await validSendRes.json();
    assert(validSendRes.status === 201, 'Authenticated POST /api/inbox/whatsapp/send returns 201 Created');
    assert(validSendJson.data?.direction === 'outbound', 'Outbound message direction recorded as outbound');
    assert(validSendJson.data?.sender === 'agent', 'Sender recorded as agent');

    // Test 22: Authenticated GET /api/inbox/whatsapp/messages/:phone returns 200
    const messagesRes = await fetch(`${baseUrl}/api/inbox/whatsapp/messages/15551234567`, {
      headers: { Cookie: sessionCookie },
    });
    const messagesJson = await messagesRes.json();
    assert(messagesRes.status === 200, 'GET /api/inbox/whatsapp/messages/:phone returns 200 OK');
    assert(Array.isArray(messagesJson.data), 'Messages data is an array');

    // Test 23: POST /api/auth/logout clears session
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: sessionCookie },
    });
    const logoutSetCookie = logoutRes.headers.get('set-cookie') || '';
    assert(logoutRes.status === 200, 'POST /api/auth/logout returns 200 OK');
    assert(logoutSetCookie.includes('Max-Age=0'), 'Logout clears crm_session cookie with Max-Age=0');

    // Test 18: 404 Route Not Found
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
