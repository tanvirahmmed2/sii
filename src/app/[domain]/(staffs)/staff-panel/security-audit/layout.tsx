import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Security Logs & Audit Trail | Staff Panel',
  description: `Review access logs, sensitive action audit records, and security alerts at ${SCHOOL_NAME}.`,
};

export default function StaffSecurityAuditLayout({ children }: any) {
  return <>{children}</>;
}
