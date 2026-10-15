const fs = require('fs');
const path = require('path');

const swPath = path.resolve(__dirname, '../../../dist/sw.js');
const sw = fs.readFileSync(swPath, 'utf8');

const regex = /\{url:"([^"]+)"/g;
let match;
const entries = [];
while ((match = regex.exec(sw)) !== null) {
  entries.push(match[1]);
}

console.log('Total precached entries extracted:', entries.length);

let missing = 0;
for (const entry of entries) {
  const p = path.resolve(__dirname, '../../../dist', entry);
  if (!fs.existsSync(p)) {
    console.error('MISSING:', p);
    missing++;
  } else {
    const size = fs.statSync(p).size;
    console.log(`[OK] ${entry} (${size} bytes)`);
  }
}

if (missing === 0) {
  console.log(`SUCCESS: 100% of ${entries.length} precached files exist on disk in dist/!`);
} else {
  console.error(`FAILURE: ${missing} files missing`);
  process.exit(1);
}
