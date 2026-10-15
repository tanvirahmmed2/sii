import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Create Campus Website | ${SITE_NAME}`,
  description: `Launch and deploy a new institution website or campus workspace on ${SITE_NAME}.`,
};

export default function CreatorNewWorkspaceLayout({ children }) {
  return <>{children}</>;
}
