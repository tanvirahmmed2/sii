import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Student Exits & TC Management | Staff Panel',
  description: `Manage student withdrawals, graduations, clearance requests, and transfer certificates at ${SCHOOL_NAME}.`,
};

export default function StaffStudentExitsLayout({ children }: any) {
  return <>{children}</>;
}
