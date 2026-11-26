'use client';

import AudienceEmailManager from 'src/component/marketing/developer/AudienceEmailManager';

export default function EmailCreatorsPage() {
  return (
    <AudienceEmailManager
      audience="creators"
      title="Email Creators"
      subtitle="Dispatch Redis-queued announcements, onboarding notices, and platform updates to creator accounts."
    />
  );
}
