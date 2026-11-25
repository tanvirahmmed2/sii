import { SITE_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: `Payroll Payment Disbursements | Developer Portal | ${SITE_NAME}`,
  description: `Process developer payroll disbursements, view payment vouchers, and salary records on ${SITE_NAME}.`,
};

export default function DeveloperPayrollPaymentsLayout({ children }: any) {
  return <>{children}</>;
}
