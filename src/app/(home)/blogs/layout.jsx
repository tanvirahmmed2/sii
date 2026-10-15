import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Blog & Articles | ${SITE_NAME}`,
  description: `Explore the latest news, updates, educational insights, and technology guides on ${SITE_NAME}.`,
};

export default function HomeBlogsLayout({ children }) {
  return <>{children}</>;
}
