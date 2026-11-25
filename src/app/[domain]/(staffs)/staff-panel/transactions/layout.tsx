import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Campus Financial Transactions | Staff Panel',
  description: `Ledger of all payment transactions, gateway settlements, and revenue streams at ${SCHOOL_NAME}.`,
};

export default function StaffTransactionsLayout({ children }: any) {
  return <>{children}</>;
}
