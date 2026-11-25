import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Campus Intelligence & Analytics | Staff Panel',
  description: `View campus data analytics, enrollment statistics, and institution health metrics at ${SCHOOL_NAME}.`,
};

export default function StaffCampusDataLayout({ children }: any) {
  return <>{children}</>;
}
