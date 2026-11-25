import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Campus Officers Directory | Staff Panel',
  description: `Browse and manage administrative officers, designation ranks, and departmental postings at ${SCHOOL_NAME}.`,
};

export default function StaffOfficerListLayout({ children }: any) {
  return <>{children}</>;
}
