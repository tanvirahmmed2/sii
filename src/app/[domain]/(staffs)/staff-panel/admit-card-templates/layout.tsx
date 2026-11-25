import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Exam Admit Card Templates | Staff Panel',
  description: `Manage examination hall tickets and admit card template designs at ${SCHOOL_NAME}.`,
};

export default function StaffAdmitCardTemplatesLayout({ children }: any) {
  return <>{children}</>;
}
