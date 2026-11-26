'use client';

import AudienceEmailManager from 'src/component/marketing/developer/AudienceEmailManager';

export default function EmailDevelopersPage() {
  return (
    <AudienceEmailManager
      audience="developers"
      title="Email Developers"
      subtitle="Broadcast Redis-queued operational notices, sprint alerts, and system advisories to engineering staff."
    />
  );
}
