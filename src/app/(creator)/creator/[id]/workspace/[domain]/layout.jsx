import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Workspace Domain Configuration | ${SITE_NAME}`,
  description: `Configure custom domains, subdomain routing, and site theme settings on ${SITE_NAME}.`,
};

export default function CreatorWorkspaceDomainLayout({ children }) {
  return <>{children}</>;
}
