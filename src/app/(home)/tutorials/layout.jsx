import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Tutorials & Documentation | ${SITE_NAME}`,
  description: `Step-by-step guides, walkthroughs, and tutorials to build and manage your institution website on ${SITE_NAME}.`,
};

export default function HomeTutorialsLayout({ children }) {
  return <>{children}</>;
}
