function buildTeacherVerificationUrl(website, token, baseHost = 'localhost:3000') {
  const protocol = baseHost.includes('localhost') ? 'http' : 'https';

  // 1. Custom domain (if set)
  const rawCustom = (website?.custom_domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (rawCustom) {
    const customProto = rawCustom.includes('localhost') ? 'http' : 'https';
    return `${customProto}://${rawCustom}/auth/access/teacher/verify?token=${encodeURIComponent(token)}`;
  }

  // 2. Subdomain of platform base URL
  const rawSub = (website?.subdomain || website?.slug || '').trim().toLowerCase();
  const cleanSub = rawSub.includes('.') ? rawSub.split('.')[0] : rawSub;

  if (baseHost.includes('localhost')) {
    const port = baseHost.includes(':') ? `:${baseHost.split(':')[1]}` : '';
    return `${protocol}://${cleanSub}.localhost${port}/auth/access/teacher/verify?token=${encodeURIComponent(token)}`;
  }

  // Production base domain
  const cleanHostNoPort = baseHost.split(':')[0];
  const parts = cleanHostNoPort.split('.');
  const baseDomain = parts.length >= 2 ? parts.slice(-2).join('.') : cleanHostNoPort;
  const port = baseHost.includes(':') ? `:${baseHost.split(':')[1]}` : '';

  return `${protocol}://${cleanSub}.${baseDomain}${port}/auth/access/teacher/verify?token=${encodeURIComponent(token)}`;
}

console.log('1. Subdomain Local: ', buildTeacherVerificationUrl({ subdomain: 'afit' }, 'test_token_abc', 'localhost:3000'));
console.log('2. Subdomain Prod:  ', buildTeacherVerificationUrl({ subdomain: 'afit' }, 'test_token_abc', 'educraft.io'));
console.log('3. Custom Domain:   ', buildTeacherVerificationUrl({ subdomain: 'afit', custom_domain: 'oxfordcampus.edu.bd' }, 'test_token_abc', 'educraft.io'));
