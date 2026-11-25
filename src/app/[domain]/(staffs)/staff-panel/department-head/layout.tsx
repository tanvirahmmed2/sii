import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Department Heads & Leadership | Staff Panel',
  description: `Assign and manage academic department heads, faculty leads, and coordinators at ${SCHOOL_NAME}.`,
};

export default function StaffDepartmentHeadLayout({ children }: any) {
  return <>{children}</>;
}
