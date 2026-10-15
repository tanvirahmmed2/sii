import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Complete Payment Checkout | ${SITE_NAME}`,
  description: `Secure online payment processing and subscription checkout on ${SITE_NAME}.`,
};

export default function CreatorPaymentCheckoutLayout({ children }) {
  return <>{children}</>;
}
