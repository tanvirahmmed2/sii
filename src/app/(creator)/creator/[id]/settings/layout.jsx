import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Account & Security Settings | ${SITE_NAME}`,
  description: `Configure password, two-factor authentication, and notification preferences on ${SITE_NAME}.`,
};

export default function CreatorSettingsLayout({ children }) {
  return <>{children}</>;
}
