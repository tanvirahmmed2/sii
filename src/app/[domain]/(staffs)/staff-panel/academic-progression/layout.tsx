import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Academic Progression & Promotion | Staff Panel',
  description: `Promote students to next academic sessions, manage grade roll-overs, and session transitions at ${SCHOOL_NAME}.`,
};

export default function StaffAcademicProgressionLayout({ children }: any) {
  return <>{children}</>;
}
