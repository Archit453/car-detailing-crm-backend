import http from 'http';
import app from '../src/app.js';
import { SESSION_COOKIE_NAME } from '../src/utils/session.js';
import {
  SERVICE_BUTTONS_P1,
  SERVICE_BUTTONS_P2,
  REENGAGE_BUTTONS,
  MORE_HELP_BUTTONS_P1,
  MORE_HELP_BUTTONS_P2,
} from '../src/controllers/instagram.controller.js';

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

    // Test 23: POST /api/inbox/whatsapp/bot-toggle without auth returns 401
    const unauthToggleRes = await fetch(`${baseUrl}/api/inbox/whatsapp/bot-toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+15551234567', botActive: false }),
    });
    assert(unauthToggleRes.status === 401, 'Unauthenticated POST /api/inbox/whatsapp/bot-toggle returns 401');

    // Test 24: Authenticated POST /api/inbox/whatsapp/bot-toggle pauses bot
    const pauseBotRes = await fetch(`${baseUrl}/api/inbox/whatsapp/bot-toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ phone: '+15551234567', botActive: false }),
    });
    const pauseBotJson = await pauseBotRes.json();
    assert(pauseBotRes.status === 200, 'POST /api/inbox/whatsapp/bot-toggle returns 200 OK');
    assert(pauseBotJson.data?.botPaused === true, 'Bot status confirmed paused (human takeover)');

    // Test 25: Incoming WhatsApp message to a paused conversation silences automated bot
    const silencedWebhookRes = await fetch(`${baseUrl}/api/webhook/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123456789',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { phone_number_id: '1344182455438369' },
                  contacts: [{ profile: { name: 'Chat Client' } }],
                  messages: [
                    {
                      from: '15551234567',
                      id: 'wamid.silence_test',
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      text: { body: 'Hey are you there?' },
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
    const silencedJson = await silencedWebhookRes.json();
    assert(silencedWebhookRes.status === 200, 'Webhook returns 200 for paused conversation');
    assert(silencedJson.status === 'human_takeover_active', 'Webhook skips bot reply with human_takeover_active');

    // Test 26: Authenticated POST /api/inbox/whatsapp/bot-toggle resumes bot
    const resumeBotRes = await fetch(`${baseUrl}/api/inbox/whatsapp/bot-toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ phone: '+15551234567', botActive: true }),
    });
    const resumeBotJson = await resumeBotRes.json();
    assert(resumeBotRes.status === 200, 'POST /api/inbox/whatsapp/bot-toggle resume returns 200 OK');
    assert(resumeBotJson.data?.botPaused === false, 'Bot status confirmed resumed (automated mode)');

    // Test 27: WhatsApp Coexistence (Option 2) smb_message_echoes from phone app
    const echoRes = await fetch(`${baseUrl}/api/webhook/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'test_waba_id',
            changes: [
              {
                field: 'smb_message_echoes',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '1344182455438369',
                    phone_number_id: '1344182455438369',
                  },
                  messages: [
                    {
                      from: '1344182455438369',
                      to: '15559876543',
                      id: 'wamid.test_echo_123',
                      text: { body: 'Hello! Replying directly from my phone app.' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      }),
    });
    const echoJson = await echoRes.json();
    assert(echoRes.status === 200, 'Webhook returns 200 for smb_message_echoes');
    assert(echoJson.status === 'coexistence_echo_handled', 'Webhook handles coexistence phone echo');
    assert(echoJson.human_takeover === true, 'Coexistence phone reply automatically activates human takeover');

    // Test 28: Meta Embedded Signup Coexistence callback endpoint
    const signupRes = await fetch(`${baseUrl}/api/inbox/whatsapp/embedded-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({
        code: 'test_meta_auth_code_123',
        phoneNumberId: '1344182455438369',
        wabaId: 'test_waba_id_456',
      }),
    });
    const signupJson = await signupRes.json();
    assert(signupRes.status === 200, 'POST /api/inbox/whatsapp/embedded-signup returns 200 OK');
    assert(signupJson.data?.coexistenceActive === true, 'Coexistence confirmed active from signup');

    // Test 29: GET /api/inbox/instagram/conversations (Protected)
    const igConvRes = await fetch(`${baseUrl}/api/inbox/instagram/conversations`, {
      headers: { Cookie: sessionCookie },
    });
    const igConvJson = await igConvRes.json();
    assert(igConvRes.status === 200, 'GET /api/inbox/instagram/conversations returns 200 OK');
    assert(Array.isArray(igConvJson.data), 'GET /api/inbox/instagram/conversations returns array of conversations');

    // Test 30: GET /api/inbox/instagram/status (Protected)
    const igStatusRes = await fetch(`${baseUrl}/api/inbox/instagram/status`, {
      headers: { Cookie: sessionCookie },
    });
    const igStatusJson = await igStatusRes.json();
    assert(igStatusRes.status === 200, 'GET /api/inbox/instagram/status returns 200 OK');
    assert(igStatusJson.data?.accountInfo?.username === 'creationindia_', 'Status returns connected account @creationindia_');

    // Test 31: POST /api/inbox/instagram/send with invalid non-numeric ID returns 400 Bad Request
    const igSendBadIdRes = await fetch(`${baseUrl}/api/inbox/instagram/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({
        senderId: 'arc____hit_test',
        message: 'Hello test',
      }),
    });
    const igSendBadIdJson = await igSendBadIdRes.json();
    assert(igSendBadIdRes.status === 400, 'POST /api/inbox/instagram/send rejects non-numeric recipient ID with 400');
    assert(
      igSendBadIdJson.message?.includes('numeric') || igSendBadIdJson.error?.message?.includes('numeric'),
      'POST /api/inbox/instagram/send provides clear message explaining numeric IGSID requirement'
    );

    // Test 32: POST /api/inbox/instagram/send with empty message returns 400
    const igSendEmptyRes = await fetch(`${baseUrl}/api/inbox/instagram/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({
        senderId: '17841400123456789',
        message: '   ',
      }),
    });
    assert(igSendEmptyRes.status === 400, 'POST /api/inbox/instagram/send rejects empty message with 400');

    // Test 33: POST /api/inbox/instagram/test-ping simulates incoming DM
    const igPingRes = await fetch(`${baseUrl}/api/inbox/instagram/test-ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({
        senderId: 'arc____hit_sim_unit_test',
        message: 'Unit test simulation message',
      }),
    });
    const igPingJson = await igPingRes.json();
    assert(igPingRes.status === 200, 'POST /api/inbox/instagram/test-ping returns 200 OK');
    assert(igPingJson.data?.simulated === true, 'Simulation test ping succeeds and triggers handler');

    // Test 34: POST /api/inbox/instagram/bot-toggle pauses/resumes bot
    const igPauseBotRes = await fetch(`${baseUrl}/api/inbox/instagram/bot-toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({
        senderId: 'arc____hit_sim_unit_test',
        botActive: false,
      }),
    });
    const igPauseBotJson = await igPauseBotRes.json();
    assert(igPauseBotRes.status === 200, 'POST /api/inbox/instagram/bot-toggle returns 200 OK');
    assert(igPauseBotJson.data?.botPaused === true, 'Instagram bot confirmed paused');

    // Test 35: Webhook parses Instagram Quick Reply button tap payload
    const igQuickReplyWebhookRes = await fetch(`${baseUrl}/api/webhook/instagram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object: 'instagram',
        entry: [
          {
            id: '29347217818200339',
            messaging: [
              {
                sender: { id: 'test_qr_user_99' },
                recipient: { id: '29347217818200339' },
                timestamp: Date.now(),
                message: {
                  mid: 'mid_qr_123',
                  text: '1. PPF 🛡️',
                  quick_reply: {
                    payload: '1',
                  },
                },
              },
            ],
          },
        ],
      }),
    });
    const igQuickReplyJson = await igQuickReplyWebhookRes.json();
    assert(igQuickReplyWebhookRes.status === 200, 'POST /api/webhook/instagram with quick_reply returns 200 OK');
    assert(igQuickReplyJson.status === 'EVENT_RECEIVED', 'Webhook processes quick_reply payload');

    // Test 36: Webhook parses Instagram Postback button tap payload
    const igPostbackWebhookRes = await fetch(`${baseUrl}/api/webhook/instagram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object: 'instagram',
        entry: [
          {
            id: '29347217818200339',
            messaging: [
              {
                sender: { id: 'test_pb_user_88' },
                recipient: { id: '29347217818200339' },
                timestamp: Date.now(),
                postback: {
                  mid: 'mid_pb_456',
                  title: '📍 Location & Visit',
                  payload: 'location',
                },
              },
            ],
          },
        ],
      }),
    });
    const igPostbackJson = await igPostbackWebhookRes.json();
    assert(igPostbackWebhookRes.status === 200, 'POST /api/webhook/instagram with postback returns 200 OK');
    assert(igPostbackJson.status === 'EVENT_RECEIVED', 'Webhook processes postback payload');

    // Test 37: Unauthenticated GET /api/inbox/instagram/icebreakers returns 401
    const unauthIceBreakersRes = await fetch(`${baseUrl}/api/inbox/instagram/icebreakers`);
    assert(unauthIceBreakersRes.status === 401, 'Unauthenticated GET /api/inbox/instagram/icebreakers returns 401');

    // Test 38: POST /api/webhook/instagram with post comment payload
    const igCommentWebhookRes = await fetch(`${baseUrl}/api/webhook/instagram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object: 'instagram',
        entry: [
          {
            id: '29347217818200339',
            time: 1725450000,
            changes: [
              {
                field: 'comments',
                value: {
                  id: 'comment_test_123',
                  text: 'PPF price for Fortuner please?',
                  from: { id: '99887766', username: 'suv_owner_delhi' },
                  media: { id: 'media_reel_9988' },
                },
              },
            ],
          },
        ],
      }),
    });
    const igCommentWebhookJson = await igCommentWebhookRes.json();
    assert(igCommentWebhookRes.status === 200, 'POST /api/webhook/instagram with post comment returns 200 OK');
    assert(igCommentWebhookJson.status === 'EVENT_RECEIVED', 'Webhook receives and parses post comments');

    // Test 39: POST /api/webhook/instagram ignores self-comments from @creationindia_
    const igSelfCommentRes = await fetch(`${baseUrl}/api/webhook/instagram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object: 'instagram',
        entry: [
          {
            id: '29347217818200339',
            time: 1725450000,
            changes: [
              {
                field: 'comments',
                value: {
                  id: 'comment_self_123',
                  text: 'Thank you for reaching out!',
                  from: { id: '29347217818200339', username: 'creationindia_' },
                  media: { id: 'media_reel_9988' },
                },
              },
            ],
          },
        ],
      }),
    });
    assert(igSelfCommentRes.status === 200, 'POST /api/webhook/instagram ignores self comments from @creationindia_');

    // Test 40: Authenticated GET /api/inbox/instagram/comments returns comment stream
    const igCommentsListRes = await fetch(`${baseUrl}/api/inbox/instagram/comments`, {
      headers: { Cookie: sessionCookie },
    });
    const igCommentsListJson = await igCommentsListRes.json();
    assert(igCommentsListRes.status === 200, 'GET /api/inbox/instagram/comments returns 200 OK');
    assert(Array.isArray(igCommentsListJson.data?.comments), 'Response data contains comments array');
    assert(igCommentsListJson.data.comments.some((c) => c.id === 'comment_test_123'), 'Includes simulated webhook comment');

    // Test 41: Authenticated POST /api/inbox/instagram/comments/test-ping
    const igCommentPingRes = await fetch(`${baseUrl}/api/inbox/instagram/comments/test-ping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        username: 'test_commenter_gurgaon',
        text: 'How much time needed for ceramic coating?',
      }),
    });
    const igCommentPingJson = await igCommentPingRes.json();
    assert(igCommentPingRes.status === 200, 'POST /api/inbox/instagram/comments/test-ping returns 200 OK');
    assert(igCommentPingJson.success === true, 'Test ping comment returns success: true');

    // Test 42: Unauthenticated GET /api/inbox/instagram/comments returns 401
    const unauthIgCommentsRes = await fetch(`${baseUrl}/api/inbox/instagram/comments`);
    assert(unauthIgCommentsRes.status === 401, 'Unauthenticated GET /api/inbox/instagram/comments returns 401');

    // Test 43: Webhook ignores outbound echo messages from own page account
    const igEchoWebhookRes = await fetch(`${baseUrl}/api/webhook/instagram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object: 'instagram',
        entry: [
          {
            id: '29347217818200339',
            messaging: [
              {
                sender: { id: '29347217818200339' },
                recipient: { id: 'test_return_user_01' },
                timestamp: Date.now(),
                message: {
                  mid: 'mid_echo_123',
                  text: 'Thank you! We will reach out shortly.',
                  is_echo: true,
                },
              },
            ],
          },
        ],
      }),
    });
    assert(igEchoWebhookRes.status === 200, 'Echo webhook returns 200 OK');

    // Test 44: Returning customer re-engagement flow (Yes/No decision)
    // Step A: Set session to completed for test_return_user_01
    const { supabase } = await import('../src/config/supabase.js');
    await supabase.from('whatsapp_sessions').upsert({
      phone: 'ig_test_return_user_01',
      step: 'completed',
      customer_name: 'Harsh',
      selected_service: 'PPF',
      updated_at: new Date().toISOString(),
    });

    // Step B: Returning customer sends greeting message -> triggers awaiting_reengagement_decision
    const returnGreetingRes = await fetch(`${baseUrl}/api/webhook/instagram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object: 'instagram',
        entry: [
          {
            id: '29347217818200339',
            messaging: [
              {
                sender: { id: 'test_return_user_01' },
                recipient: { id: '29347217818200339' },
                timestamp: Date.now(),
                message: { mid: 'mid_ret_1', text: 'Hi again!' },
              },
            ],
          },
        ],
      }),
    });
    assert(returnGreetingRes.status === 200, 'Returning customer greeting returns 200 OK');

    // Verify session updated to awaiting_reengagement_decision
    const { data: returnSession1 } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('phone', 'ig_test_return_user_01')
      .single();
    assert(returnSession1.step === 'awaiting_reengagement_decision', 'Session advances to awaiting_reengagement_decision');

    // Step C: Customer taps YES -> advances to awaiting_additional_service
    await fetch(`${baseUrl}/api/webhook/instagram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object: 'instagram',
        entry: [
          {
            id: '29347217818200339',
            messaging: [
              {
                sender: { id: 'test_return_user_01' },
                recipient: { id: '29347217818200339' },
                timestamp: Date.now(),
                message: {
                  mid: 'mid_ret_yes',
                  text: '✅ Yes',
                  quick_reply: { payload: 'REENGAGE_YES' },
                },
              },
            ],
          },
        ],
      }),
    });
    const { data: returnSession2 } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('phone', 'ig_test_return_user_01')
      .single();
    assert(returnSession2.step === 'awaiting_additional_service', 'Customer selecting YES advances to awaiting_additional_service');

    // Step D: Customer selects Ceramic Coating -> confirms and resets to completed without asking for phone/name
    await fetch(`${baseUrl}/api/webhook/instagram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object: 'instagram',
        entry: [
          {
            id: '29347217818200339',
            messaging: [
              {
                sender: { id: 'test_return_user_01' },
                recipient: { id: '29347217818200339' },
                timestamp: Date.now(),
                message: {
                  mid: 'mid_ret_service',
                  text: '✨ Ceramic Coating',
                  quick_reply: { payload: '2' },
                },
              },
            ],
          },
        ],
      }),
    });
    const { data: returnSession3 } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('phone', 'ig_test_return_user_01')
      .single();
    assert(returnSession3.step === 'completed', 'Session returns to completed after additional service interest logged');
    assert(returnSession3.selected_service === 'Ceramic Coating', 'Selected service updated to Ceramic Coating');

    // Test 45: Returning customer NO Path
    // Step A: Set session to awaiting_reengagement_decision for test_return_user_02
    await supabase.from('whatsapp_sessions').upsert({
      phone: 'ig_test_return_user_02',
      step: 'awaiting_reengagement_decision',
      customer_name: 'Rahul',
      selected_service: 'PPF',
      updated_at: new Date().toISOString(),
    });

    // Step B: Customer selects NO
    await fetch(`${baseUrl}/api/webhook/instagram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object: 'instagram',
        entry: [
          {
            id: '29347217818200339',
            messaging: [
              {
                sender: { id: 'test_return_user_02' },
                recipient: { id: '29347217818200339' },
                timestamp: Date.now(),
                message: {
                  mid: 'mid_ret_no',
                  text: '❌ No',
                  quick_reply: { payload: 'REENGAGE_NO' },
                },
              },
            ],
          },
        ],
      }),
    });
    const { data: returnSessionNo } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('phone', 'ig_test_return_user_02')
      .single();
    assert(returnSessionNo.step === 'awaiting_more_help', 'Customer selecting NO advances to awaiting_more_help');

    // Step C: Customer selects "Nothing Else" -> marks human_takeover (bot_active = false)
    await fetch(`${baseUrl}/api/webhook/instagram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object: 'instagram',
        entry: [
          {
            id: '29347217818200339',
            messaging: [
              {
                sender: { id: 'test_return_user_02' },
                recipient: { id: '29347217818200339' },
                timestamp: Date.now(),
                message: {
                  mid: 'mid_ret_nothing',
                  text: '❌ Nothing Else',
                  quick_reply: { payload: 'MORE_NOTHING' },
                },
              },
            ],
          },
        ],
      }),
    });
    const { data: returnSessionNothing } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('phone', 'ig_test_return_user_02')
      .single();
    assert(returnSessionNothing.step === 'human_takeover', 'Selecting Nothing Else sets step to human_takeover');

    // Test 46: Native In-Bubble Button Template Constraints
    assert(
      Array.isArray(SERVICE_BUTTONS_P1) &&
      SERVICE_BUTTONS_P1.length <= 3 &&
      SERVICE_BUTTONS_P1.every((b) => b.type === 'postback' && b.title.length <= 20),
      'SERVICE_BUTTONS_P1 complies with Meta Button Template limits (max 3 buttons, <= 20 chars)'
    );

    assert(
      Array.isArray(SERVICE_BUTTONS_P2) &&
      SERVICE_BUTTONS_P2.length <= 3 &&
      SERVICE_BUTTONS_P2.every((b) => b.type === 'postback' && b.title.length <= 20),
      'SERVICE_BUTTONS_P2 complies with Meta Button Template limits (max 3 buttons, <= 20 chars)'
    );

    assert(
      Array.isArray(REENGAGE_BUTTONS) &&
      REENGAGE_BUTTONS.length === 2 &&
      REENGAGE_BUTTONS.every((b) => b.type === 'postback' && b.title.length <= 20),
      'REENGAGE_BUTTONS complies with Meta Button Template limits (2 buttons, <= 20 chars)'
    );

    assert(
      Array.isArray(MORE_HELP_BUTTONS_P1) &&
      MORE_HELP_BUTTONS_P1.length <= 3 &&
      MORE_HELP_BUTTONS_P1.every((b) => b.type === 'postback' && b.title.length <= 20),
      'MORE_HELP_BUTTONS_P1 complies with Meta Button Template limits (max 3 buttons, <= 20 chars)'
    );

    assert(
      Array.isArray(MORE_HELP_BUTTONS_P2) &&
      MORE_HELP_BUTTONS_P2.length <= 3 &&
      MORE_HELP_BUTTONS_P2.every((b) => (b.type === 'postback' || b.type === 'web_url') && b.title.length <= 20),
      'MORE_HELP_BUTTONS_P2 complies with Meta Button Template limits (max 3 buttons, <= 20 chars)'
    );

    // Cleanup test sessions
    await supabase.from('whatsapp_sessions').delete().in('phone', ['ig_test_return_user_01', 'ig_test_return_user_02']);

    // Test 47: POST /api/auth/logout clears session
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: sessionCookie },
    });
    const logoutSetCookie = logoutRes.headers.get('set-cookie') || '';
    assert(logoutRes.status === 200, 'POST /api/auth/logout returns 200 OK');
    assert(logoutSetCookie.includes('Max-Age=0'), 'Logout clears crm_session cookie with Max-Age=0');

    // Test 47: 404 Route Not Found
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
