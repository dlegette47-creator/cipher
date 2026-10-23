import WebSocket from 'ws';

console.log('=== Testing relay ===');
const ws = new WebSocket('wss://groups.aegispayhq.com');
const timer = setTimeout(() => {
  console.log('❌ Timeout after 8s');
  process.exit(1);
}, 8000);

ws.on('open', () => {
  console.log('✅ Connected (101)');
  ws.send(JSON.stringify(['REQ', 'test', { kinds: [39000], limit: 5 }]));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg[0] === 'AUTH') console.log('🔒 AUTH challenge:', msg[1].slice(0, 16) + '...');
  else if (msg[0] === 'EVENT') {
    const name = msg[2].tags.find(t => t[0] === 'name')?.[1] || '(no name)';
    const h = msg[2].tags.find(t => t[0] === 'h')?.[1] || msg[2].tags.find(t => t[0] === 'd')?.[1];
    console.log(`📨 kind ${msg[2].kind} h=${h} name=${name}`);
  }
  else if (msg[0] === 'EOSE') {
    console.log('✅ EOSE');
    clearTimeout(timer); ws.close(); process.exit(0);
  }
  else if (msg[0] === 'NOTICE') console.log('⚠️', msg[1]);
  else if (msg[0] === 'CLOSED') { console.log('❌ CLOSED:', msg[2]); clearTimeout(timer); process.exit(1); }
});

ws.on('error', (e) => { console.log('❌', e.message); clearTimeout(timer); process.exit(1); });
