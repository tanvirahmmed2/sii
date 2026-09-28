import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `App Integration Details | ${SITE_NAME}`,
  description: `Learn how to connect and use this ecosystem app with your portfolio on ${SITE_NAME}.`,
};

export default function HomeAppDetailLayout({ children }) {
  return <>{children}</>;
}
