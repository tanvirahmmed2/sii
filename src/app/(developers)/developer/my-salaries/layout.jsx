import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Salary & Compensation History | Developer Portal | ${SITE_NAME}`,
  description: `Review personal compensation records, payment disbursements, and pay slips on ${SITE_NAME}.`,
};

export default function DeveloperMySalariesLayout({ children }) {
  return <>{children}</>;
}
