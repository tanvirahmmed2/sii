import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Fee Accounting & Invoicing | Staff Panel',
  description: `Manage student fee collections, generate fee vouchers, and monitor fee reconciliation at ${SCHOOL_NAME}.`,
};

export default function StaffFeeAccountingLayout({ children }: any) {
  return <>{children}</>;
}
