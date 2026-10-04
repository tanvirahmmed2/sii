'use client';

import MetaMessengerDetails from 'src/component/marketing/developer/meta/MetaMessengerDetails';
import { BiLogoInstagram } from 'react-icons/bi';

export default function InstagramMessagesDetailsPage() {
  return (
    <MetaMessengerDetails
      platform="instagram"
      title="Instagram Direct"
      subtitle="Manage Instagram business direct messages and story customer inquiries"
      IconComponent={BiLogoInstagram}
      brandBadge="bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800"
    />
  );
}
