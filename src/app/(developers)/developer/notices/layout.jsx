import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Developer Notices & Bulletins | Developer Portal | ${SITE_NAME}`,
  description: `Publish platform notices, system maintenance alerts, and engineering bulletins on ${SITE_NAME}.`,
};

export default function DeveloperNoticesLayout({ children }) {
  return <>{children}</>;
}
