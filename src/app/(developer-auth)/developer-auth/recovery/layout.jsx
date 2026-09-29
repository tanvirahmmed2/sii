import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Staff Account Recovery | ${SITE_NAME} Developer Portal`,
  description: `Recover administrative credentials for ${SITE_NAME}.`,
};

export default function RecoveryLayout({ children }) {
  return <>{children}</>;
}
