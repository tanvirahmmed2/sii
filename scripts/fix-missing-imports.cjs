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

let fixedCount = 0;

allFiles.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;

  const reactHooks = [];
  ['useState', 'useEffect', 'useContext', 'useMemo', 'useCallback', 'useRef'].forEach(hook => {
    if (new RegExp('\\b' + hook + '\\b').test(content)) {
      reactHooks.push(hook);
    }
  });

  const navHooks = [];
  ['useRouter', 'usePathname', 'useSearchParams', 'redirect'].forEach(nav => {
    if (new RegExp('\\b' + nav + '\\b').test(content)) {
      navHooks.push(nav);
    }
  });

  const needsLink = /\b<Link\b/.test(content);

  const importsReact = /from\s+['"]react['"]/.test(content);
  const importsNav = /from\s+['"]next\/navigation['"]/.test(content);
  const importsLink = /from\s+['"]next\/link['"]/.test(content);

  const addedImports = [];

  if (reactHooks.length > 0 && !importsReact) {
    addedImports.push(`import { ${reactHooks.join(', ')} } from 'react';`);
  }

  if (navHooks.length > 0 && !importsNav) {
    addedImports.push(`import { ${navHooks.join(', ')} } from 'next/navigation';`);
  }

  if (needsLink && !importsLink) {
    addedImports.push(`import Link from 'next/link';`);
  }

  if (addedImports.length > 0) {
    const importBlock = addedImports.join('\n') + '\n';
    if (content.includes("'use client';")) {
      content = content.replace("'use client';", `'use client';\n\n${importBlock}`);
    } else if (content.includes('"use client";')) {
      content = content.replace('"use client";', `"use client";\n\n${importBlock}`);
    } else if (content.includes("'use client'")) {
      content = content.replace("'use client'", `'use client'\n\n${importBlock}`);
    } else if (content.includes('"use client"')) {
      content = content.replace('"use client"', `"use client"\n\n${importBlock}`);
    } else {
      content = importBlock + '\n' + content;
    }
  }

  if (content !== original) {
    fs.writeFileSync(f, content, 'utf8');
    fixedCount++;
    console.log('Fixed imports in:', f);
  }
});

console.log('Total files fixed:', fixedCount);
