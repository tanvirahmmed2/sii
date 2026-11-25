import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Campus Subscription Quotas & Limits | Staff Panel',
  description: `Review student capacity, staff limits, storage utilization, and subscription features at ${SCHOOL_NAME}.`,
};

export default function StaffTenantQuotasLayout({ children }: any) {
  return <>{children}</>;
}
