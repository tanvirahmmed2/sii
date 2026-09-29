import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Billing & Payment History | ${SITE_NAME}`,
  description: `View past subscription invoices and payment transaction records on ${SITE_NAME}.`,
};

export default function CreatorPaymentsLayout({ children }) {
  return <>{children}</>;
}
