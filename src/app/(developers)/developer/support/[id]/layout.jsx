import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Support Ticket Resolution | Developer Portal | ${SITE_NAME}`,
  description: `Review customer issue, reply with updates, and update ticket priority or status on ${SITE_NAME}.`,
};

export default function DeveloperSupportTicketLayout({ children }) {
  return <>{children}</>;
}
