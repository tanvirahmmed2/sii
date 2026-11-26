'use client';

import AudienceEmailManager from 'src/component/marketing/developer/AudienceEmailManager';

export default function EmailLeadsPage() {
  return (
    <AudienceEmailManager
      audience="leads"
      title="Email Leads"
      subtitle="Send Redis-queued follow-ups, demos, and onboarding offers to sales leads and prospects."
    />
  );
}
