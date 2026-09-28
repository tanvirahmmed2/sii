import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `Client Reviews & Feedback | ${SITE_NAME}`,
  description: `Supervise visitor testimonials and feedback received on your portfolios on ${SITE_NAME}.`,
};

export default function CreatorReviewsLayout({ children }) {
  return <>{children}</>;
}
