import { SITE_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: `Payment Receipt Studio | Developer Portal | ${SITE_NAME}`,
  description: `Design and customize printable transaction invoices and payment receipts on ${SITE_NAME}.`,
};

export default function DeveloperPaymentReceiptStudioLayout({ children }: any) {
  return <>{children}</>;
}
