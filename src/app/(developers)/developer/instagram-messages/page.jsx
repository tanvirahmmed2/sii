'use client';

import MetaMessenger from 'src/component/marketing/developer/meta/MetaMessenger';

export default function InstagramMessagesPage() {
  return (
    <MetaMessenger
      platform="instagram"
      title="Instagram Direct"
      subtitle="Manage Instagram Direct messages, stories inquiries, and direct replies via Meta Graph API"
      IconComponent={BiLogoInstagram}
      brandColor="text-pink-600 dark:text-pink-400"
      brandBg="bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600"
      brandBadge="bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800"
    />
  );
}
