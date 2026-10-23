const fs = require('fs');
const path = require('path');

const droppedInfoCols = [
  'father_name', 'father_phone', 'father_nid', 'father_occupation',
  'mother_name', 'mother_phone', 'mother_nid', 'mother_occupation',
  'guardian_name', 'guardian_phone', 'guardian_nid', 'guardian_relation', 'guardian_email', 'guardian_address',
  'present_address', 'permanent_address', 'city', 'district', 'upazila', 'postal_code', 'country'
];

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== '.git') {
        scanDir(fullPath);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.jsx'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const col of droppedInfoCols) {
        // match things like inf.col, info.col, i.col, grd.col, addr.col in SQL strings
        const regex = new RegExp(`\\b(inf|info|i|grd|addr|guard|si)\\.${col}\\b`, 'g');
        let m;
        while ((m = regex.exec(content)) !== null) {
          console.log(`Found ${m[0]} in ${fullPath}`);
        }
      }
    }
  }
}

console.log('Scanning src/ for dropped modular column references...');
scanDir('src');
console.log('Done scanning.');
