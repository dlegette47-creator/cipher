const fs = require('fs');
let c = fs.readFileSync('src/Chat.jsx', 'utf8');
c = c.replace('const groupMembers = useChatStore((s) => s.groupMembers) || [];', 'const rawGroupMembers = useChatStore)(s) => s.groupMembers);\n  const groupMembers = Array.isArray(rawGroupMembers) ? rawGroupMembers : [];');
c = c.replace(/\(groupMembers \|\ |[\]\)\.map/g, 'groupMembers.map');
fs.writeFileSync('src/Chat.jsx', c);

let u = fs.readFileSync('src/hooks/useNIP29Group.js', 'utf8');
u = u.replace(/let updated = \[\.\.\.prev\];/g, 'let updated = Array.isArray(prev) ? [...prev] : [];');
fs.writeFileSync('src/hooks/useNIP29Group.js', u);