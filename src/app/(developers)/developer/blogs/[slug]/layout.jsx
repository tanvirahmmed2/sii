import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Edit Blog Post | Developer Studio | ${SITE_NAME}`,
  description: `Update article content, metadata, media attachments, and publishing status on ${SITE_NAME}.`,
};

export default function DeveloperEditBlogLayout({ children }) {
  return <>{children}</>;
}
