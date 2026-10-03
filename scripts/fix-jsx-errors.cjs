const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

// Fix savingDeliverables in projects/[id]/page.jsx
{
  const f = 'src/app/(developers)/developer/projects/[id]/page.jsx';
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/\{savingDeliverables \? \([\s\S]*?\) : \([\s\S]*?\)\}/, "<span>{savingDeliverables ? 'Saving...' : 'Save Specifications'}</span>");
  fs.writeFileSync(f, content, 'utf8');
}

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

let remainingErrors = [];
allFiles.forEach(f => {
  const code = fs.readFileSync(f, 'utf8');
  try {
    parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
  } catch (err) {
    remainingErrors.push({ file: f, error: err.message, line: err.loc ? err.loc.line : null });
  }
});

console.log('FINAL remaining syntax errors count:', remainingErrors.length);
if (remainingErrors.length > 0) {
  console.log(JSON.stringify(remainingErrors, null, 2));
}
