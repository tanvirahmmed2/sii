import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Blog Post | ${SITE_NAME}`,
  description: `Read in-depth article, product updates, and tutorials on ${SITE_NAME}.`,
};

export default function HomeBlogPostLayout({ children }) {
  return <>{children}</>;
}
