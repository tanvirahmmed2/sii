import { SITE_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: `Assign Payroll Structures | Developer Portal | ${SITE_NAME}`,
  description: `Configure developer salary structures, compensation packages, and payroll allowances on ${SITE_NAME}.`,
};

export default function DeveloperPayrollAssignLayout({ children }: any) {
  return <>{children}</>;
}
