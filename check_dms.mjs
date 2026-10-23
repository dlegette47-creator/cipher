import WebSocket from 'ws';

const PK = process.argv[2];
if (!PK || PK.length !== 64) {
  console.error('Usage: node check_dms.mjs <64-char-hex-pubkey>');
  process.exit(1);
}

const RELAYS = ['wss://nos.lol', 'wss://relay.primal.net', 'wss://relay.damus.io', 'wss://groups.aegispayhq.com'];
console.log('Checking DMs for:', PK.slice(0, 16) + '...\n');

for (const url of RELAYS) {
  await new Promise((resolve) => {
    const ws = new WebSocket(url);
    const timer = setTimeout(() => { console.log(`⏱  ${url}`); try { ws.close(); } catch {} resolve(); }, 6000);
    let sent = 0, recv = 0, subs = 0;

    ws.on('open', () => {
      ws.send(JSON.stringify(['REQ', 'sent', { kinds: [4], authors: [PK], limit: 100 }]));
      ws.send(JSON.stringify(['REQ', 'recv', { kinds: [4], '#p': [PK], limit: 100 }]));
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg[0] === 'EVENT') { if (msg[1] === 'sent') sent++; else recv++; }
      if (msg[0] === 'EOSE') {
        subs++;
        if (subs === 2) {
          console.log(`✅ ${url} — sent: ${sent}, recv: ${recv}`);
          clearTimeout(timer); ws.close(); resolve();
        }
      }
      if (msg[0] === 'NOTICE') console.log(`   ⚠️ ${msg[1]}`);
      if (msg[0] === 'CLOSED') { console.log(`❌ ${url} — ${msg[2]}`); clearTimeout(timer); resolve(); }
    });

    ws.on('error', (e) => { console.log(`❌ ${url} — ${e.message}`); clearTimeout(timer); resolve(); });
  });
}
process.exit(0);
