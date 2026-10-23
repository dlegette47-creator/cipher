const WebSocket = require('ws');

console.log('=== 1. Testing relay WebSocket ===');
const ws = new WebSocket('wss://groups.aegispayhq.com');
const timer = setTimeout(() => {
  console.log('❌ Timeout after 8s — relay did not respond');
  process.exit(1);
}, 8000);

ws.on('open', () => {
  console.log('✅ Relay connected (101 Switching Protocols)');
  console.log('   Sending REQ for kind 39000 (group discovery)...');
  ws.send(JSON.stringify(['REQ', 'test-sub', { kinds: [39000], limit: 5 }]));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg[0] === 'AUTH') {
    console.log('🔒 Relay requested AUTH (challenge):', msg[1].slice(0, 16) + '...');
  } else if (msg[0] === 'EVENT') {
    console.log('📨 Got EVENT: kind', msg[2].kind, '—', msg[2].tags.find(t => t[0] === 'name')?.[1] || '(no name)');
  } else if (msg[0] === 'EOSE') {
    console.log('✅ EOSE — no more events for this filter');
    clearTimeout(timer);
    ws.close();
    process.exit(0);
  } else if (msg[0] === 'NOTICE') {
    console.log('⚠️  NOTICE:', msg[1]);
  } else if (msg[0] === 'CLOSED') {
    console.log('❌ CLOSED:', msg[2]);
    clearTimeout(timer);
    process.exit(1);
  }
});

ws.on('error', (e) => {
  console.log('❌ WebSocket error:', e.message);
  clearTimeout(timer);
  process.exit(1);
});
