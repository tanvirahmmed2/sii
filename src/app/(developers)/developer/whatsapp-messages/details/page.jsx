'use client';

import MetaMessengerDetails from 'src/component/marketing/developer/meta/MetaMessengerDetails';
import { BiLogoWhatsapp } from 'react-icons/bi';

export default function WhatsAppMessagesDetailsPage() {
  return (
    <MetaMessengerDetails
      platform="whatsapp"
      title="WhatsApp Business"
      subtitle="Manage WhatsApp Cloud API customer inquiries, leads, and customer service chats"
      IconComponent={BiLogoWhatsapp}
      brandBadge="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
    />
  );
}
