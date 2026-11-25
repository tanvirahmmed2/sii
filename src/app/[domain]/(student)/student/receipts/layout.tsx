import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'My Payment Receipts | Student Portal',
  description: `View payment history and download official fee receipts and invoices at ${SCHOOL_NAME}.`,
};

export default function StudentReceiptsLayout({ children }: any) {
  return <>{children}</>;
}
