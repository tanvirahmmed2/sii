import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Payment Invoice Details | ${SITE_NAME}`,
  description: `View detailed transaction invoice and payment record on ${SITE_NAME}.`,
};

export default function CreatorPaymentInvoiceLayout({ children }) {
  return <>{children}</>;
}
