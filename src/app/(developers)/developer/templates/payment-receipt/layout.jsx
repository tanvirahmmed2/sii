import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Payment Receipt Templates | Developer Portal | ${SITE_NAME}`,
  description: `Configure printed receipt layouts, transaction vouchers, and fee invoices on ${SITE_NAME}.`,
};

export default function DeveloperTemplateReceiptLayout({ children }) {
  return <>{children}</>;
}
