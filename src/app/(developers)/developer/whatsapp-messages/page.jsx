'use client';

import MetaMessenger from '@/components/developer/meta/MetaMessenger';
import { BiLogoWhatsapp } from 'react-icons/bi';

export default function WhatsAppMessagesPage() {
  return (
    <MetaMessenger
      platform="whatsapp"
      title="WhatsApp Business"
      subtitle="Manage WhatsApp Cloud API conversations, customer service inquiries, and live chats"
      IconComponent={BiLogoWhatsapp}
      brandColor="text-emerald-600 dark:text-emerald-400"
      brandBg="bg-emerald-600"
      brandBadge="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
    />
  );
}
