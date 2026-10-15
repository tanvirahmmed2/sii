import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Career Opening Details | ${SITE_NAME}`,
  description: `Explore job role details and apply for career opportunities at ${SITE_NAME}.`,
};

export default function HomeCareerDetailsLayout({ children }) {
  return <>{children}</>;
}
