import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `Verify Staff Account | ${SITE_NAME} Developer Portal`,
  description: `Verify administrator email and activate developer account on ${SITE_NAME}.`,
};

export default function VerifyLayout({ children }) {
  return <>{children}</>;
}
