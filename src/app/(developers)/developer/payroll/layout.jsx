import { SITE_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: `Payroll Administration | Developer Portal | ${SITE_NAME}`,
  description: `Manage staff compensation, monthly payroll disbursements, and payment logs on ${SITE_NAME}.`,
};

export default function DeveloperPayrollLayout({ children }) {
  return <>{children}</>;
}
