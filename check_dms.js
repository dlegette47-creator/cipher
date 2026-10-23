// Requires: you to paste your public key below
const PK = 'PASTE_YOUR_HEX_PUBKEY_HERE';

const WebSocket = require('ws');
const RELAYS = [
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://relay.damus.io',
  'wss://groups.aegispayhq.com'
];

console.log('Checking DMs for pubkey:', PK);
console.log('');

(async () => {
  for (const url of RELAYS) {
    await new Promise((resolve) => {
      const ws = new WebSocket(url);
      const timer = setTimeout(() => {
        console.log(`⏱  ${url} — timeout`);
        try { ws.close(); } catch {}
        resolve();
      }, 6000);

      let sentCount = 0, recvCount = 0, subCount = 0;

      ws.on('open', () => {
        console.log(`✅ ${url}`);
        // Query sent DMs
        ws.send(JSON.stringify(['REQ', 'sent', { kinds: [4], authors: [PK], limit: 100 }]));
        // Query received DMs
        ws.send(JSON.stringify(['REQ', 'recv', { kinds: [4], '#p': [PK], limit: 100 }]));
      });

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg[0] === 'EVENT') {
          if (msg[1] === 'sent') sentCount++;
          else if (msg[1] === 'recv') recvCount++;
        }
        if (msg[0] === 'EOSE') {
          subCount++;
          if (subCount === 2) {
            console.log(`   sent: ${sentCount}, recv: ${recvCount}`);
            clearTimeout(timer);
            ws.close();
            resolve();
          }
        }
        if (msg[0] === 'NOTICE') console.log('   ⚠️', msg[1]);
        if (msg[0] === 'CLOSED') console.log('   ❌ closed:', msg[2]);
      });

      ws.on('error', (e) => {
        console.log(`❌ ${url} — ${e.message}`);
        clearTimeout(timer);
        resolve();
      });
    });
  }
  console.log('\nDone.');
  process.exit(0);
})();
