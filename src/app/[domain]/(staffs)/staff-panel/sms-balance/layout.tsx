import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'SMS Balance & Gateway Quota | Staff Panel',
  description: `Check SMS credit balance, recharge packages, and review message delivery statistics at ${SCHOOL_NAME}.`,
};

export default function StaffSmsBalanceLayout({ children }: any) {
  return <>{children}</>;
}
