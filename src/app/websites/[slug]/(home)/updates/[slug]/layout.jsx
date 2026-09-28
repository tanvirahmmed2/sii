import { SITE_NAME } from '@/lib/db/secret';

export const metadata = {
  title: `Product Update Notice | ${SITE_NAME}`,
  description: `Read about this recent product update and improvement on ${SITE_NAME}.`,
};

export default function HomeUpdateNoticeLayout({ children }) {
  return <>{children}</>;
}
