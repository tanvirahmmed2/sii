import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Email Balance & Quota | Staff Panel',
  description: `Monitor email credits, transactional delivery quotas, and Brevo integration balance at ${SCHOOL_NAME}.`,
};

export default function StaffMailBalanceLayout({ children }: any) {
  return <>{children}</>;
}
