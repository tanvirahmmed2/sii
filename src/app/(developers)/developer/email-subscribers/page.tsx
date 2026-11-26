'use client';

import AudienceEmailManager from 'src/component/marketing/developer/AudienceEmailManager';

export default function EmailSubscribersPage() {
  return (
    <AudienceEmailManager
      audience="subscribers"
      title="Email Subscribers"
      subtitle="Send Redis-queued newsletters, release digests, and product news to website subscribers."
    />
  );
}
