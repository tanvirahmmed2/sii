import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Support Ticket Details | ${SITE_NAME}`,
  description: `View customer support ticket discussion, updates, and resolution status on ${SITE_NAME}.`,
};

export default function CreatorTicketDetailsLayout({ children }) {
  return <>{children}</>;
}
