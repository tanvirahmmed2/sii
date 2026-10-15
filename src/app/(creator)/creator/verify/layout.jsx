import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Verify Account | ${SITE_NAME}`,
  description: `Verify and activate your creator account credentials on ${SITE_NAME}.`,
};

export default function CreatorVerifyLayout({ children }) {
  return <>{children}</>;
}
