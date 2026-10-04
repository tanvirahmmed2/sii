'use client';

import MetaMessengerDetails from 'src/component/marketing/developer/meta/MetaMessengerDetails';
import { BiLogoFacebookCircle } from 'react-icons/bi';

export default function FacebookMessagesDetailsPage() {
  return (
    <MetaMessengerDetails
      platform="facebook"
      title="Facebook Messenger"
      subtitle="Manage Facebook Page customer conversations and direct replies via Meta Graph API"
      IconComponent={BiLogoFacebookCircle}
      brandBadge="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
    />
  );
}
