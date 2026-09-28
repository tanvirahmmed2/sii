import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `Legal Policies & Terms of Service | ${SITE_NAME}`,
  description: `Read the official terms of service, privacy disclosures, acceptable use policies, and compliance standards governing ${SITE_NAME}.`,
};

export default function PoliciesLayout({ children }) {
  return <>{children}</>;
}
