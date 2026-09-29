import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Support Tickets Desk | ${SITE_NAME}`,
  description: `Submit and track creator support requests and technical inquiries on ${SITE_NAME}.`,
};

export default function CreatorTicketsLayout({ children }) {
  return <>{children}</>;
}
