import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Officer Payroll & Compensation | Staff Panel',
  description: `Process monthly salary disbursements and payroll records for officers at ${SCHOOL_NAME}.`,
};

export default function StaffOfficerPayrollLayout({ children }: any) {
  return <>{children}</>;
}
