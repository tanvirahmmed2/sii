import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Client Reviews & Feedback | ${SITE_NAME}`,
  description: `Supervise visitor testimonials and feedback received on your portfolios on ${SITE_NAME}.`,
};

export default function CreatorReviewsLayout({ children }) {
  return <>{children}</>;
}
