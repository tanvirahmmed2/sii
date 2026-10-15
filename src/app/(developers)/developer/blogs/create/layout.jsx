import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Write & Publish Blog Post | Developer Studio | ${SITE_NAME}`,
  description: `Create and publish an editorial article, release note, or guide on ${SITE_NAME}.`,
};

export default function DeveloperCreateBlogLayout({ children }) {
  return <>{children}</>;
}
