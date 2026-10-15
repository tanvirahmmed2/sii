import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Reviews & Testimonials | ${SITE_NAME}`,
  description: `Read verified feedback, customer reviews, and success stories from institutions using ${SITE_NAME}.`,
};

export default function HomeReviewsLayout({ children }) {
  return <>{children}</>;
}
