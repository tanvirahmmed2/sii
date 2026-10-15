import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Careers & Opportunities | ${SITE_NAME}`,
  description: `Join our team at ${SITE_NAME}. Explore open engineering, design, and education technology positions.`,
};

export default function HomeCareersLayout({ children }) {
  return <>{children}</>;
}
