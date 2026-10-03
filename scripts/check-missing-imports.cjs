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

const missingImports = [];

allFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes("'use client'") || content.includes('"use client"')) {
    const hasUseState = /\buseState\b/.test(content);
    const hasUseEffect = /\buseEffect\b/.test(content);
    const importsReact = /from\s+['"]react['"]/.test(content);
    const hasLink = /\b<Link\b/.test(content);
    const importsLink = /from\s+['"]next\/link['"]/.test(content);
    const hasUseRouter = /\buseRouter\b/.test(content);
    const hasUsePathname = /\busePathname\b/.test(content);
    const hasUseSearchParams = /\buseSearchParams\b/.test(content);
    const importsNav = /from\s+['"]next\/navigation['"]/.test(content);

    const neededReact = [];
    if (hasUseState && !content.includes('useState')) neededReact.push('useState');
    const missing = [];
    if ((hasUseState || hasUseEffect) && !importsReact) missing.push('react');
    if (hasLink && !importsLink) missing.push('next/link');
    if ((hasUseRouter || hasUsePathname || hasUseSearchParams) && !importsNav) missing.push('next/navigation');

    if (missing.length > 0) {
      missingImports.push({ file: f, missing });
    }
  }
});

console.log('MISSING IMPORTS:', JSON.stringify(missingImports, null, 2));
