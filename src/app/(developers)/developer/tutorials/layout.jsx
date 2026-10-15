import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Platform Tutorials Management | Developer Portal | ${SITE_NAME}`,
  description: `Publish user documentation, onboarding walkthroughs, and technical guides on ${SITE_NAME}.`,
};

export default function DeveloperTutorialsLayout({ children }) {
  return <>{children}</>;
}
