'use client';

import MetaMessenger from '@/components/developer/meta/MetaMessenger';
import { BiLogoFacebookCircle } from 'react-icons/bi';

export default function FacebookMessagesPage() {
  return (
    <MetaMessenger
      platform="facebook"
      title="Facebook Messenger"
      subtitle="Manage Facebook Page customer messages and direct responses via Meta Graph API"
      IconComponent={BiLogoFacebookCircle}
      brandColor="text-blue-600 dark:text-blue-400"
      brandBg="bg-blue-600"
      brandBadge="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
    />
  );
}
