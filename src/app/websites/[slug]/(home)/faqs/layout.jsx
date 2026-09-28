import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `Frequently Asked Questions | ${SITE_NAME}`,
  description: `Find answers to common questions about portfolios, custom domains, pricing, and hosting on ${SITE_NAME}.`,
};

export default function HomeFaqsLayout({ children }) {
  return <>{children}</>;
}
