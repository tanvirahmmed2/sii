const fs = require('fs');
const path = require('path');

function walk(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  for (const item of fs.readdirSync(dir)) {
    const p = path.join(dir, item);
    if (fs.statSync(p).isDirectory()) files = files.concat(walk(p));
    else if (p.endsWith('.jsx') || p.endsWith('.js')) files.push(p);
  }
  return files;
}

const allFiles = walk('src/app/(developers)/developer').concat(walk('src/component/marketing/developer'));

const missingList = [];

allFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const missing = [];

  // Check Link
  if (/<Link\b/.test(content) && !/import\s+Link\s+from\s+['"]next\/link['"]/.test(content)) {
    missing.push('Link');
  }

  // Check Image
  if (/<Image\b/.test(content) && !/import\s+Image\s+from\s+['"]next\/image['"]/.test(content)) {
    missing.push('Image');
  }

  // Check React hooks
  const header = content.slice(0, content.indexOf('export default') > -1 ? content.indexOf('export default') : 600);
  const reactHooks = ['useState', 'useEffect', 'useContext', 'useMemo', 'useCallback', 'useRef'];
  reactHooks.forEach(hook => {
    if (new RegExp('\\b' + hook + '\\b').test(content)) {
      if (!new RegExp('\\b' + hook + '\\b').test(header)) {
        missing.push(hook);
      }
    }
  });

  // Check Router hooks
  ['useRouter', 'usePathname', 'useSearchParams'].forEach(nav => {
    if (new RegExp('\\b' + nav + '\\b').test(content)) {
      if (!new RegExp('\\b' + nav + '\\b').test(header)) {
        missing.push(nav);
      }
    }
  });

  if (missing.length > 0) {
    missingList.push({ file: f, missing });
  }
});

console.log('Files with missing imports count:', missingList.length);
console.log(JSON.stringify(missingList, null, 2));
