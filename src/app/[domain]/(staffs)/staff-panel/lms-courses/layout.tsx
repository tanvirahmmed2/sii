import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'LMS Courses & Learning Materials | Staff Panel',
  description: `Manage online courses, digital learning curriculums, and lesson syllabi at ${SCHOOL_NAME}.`,
};

export default function StaffLmsCoursesLayout({ children }: any) {
  return <>{children}</>;
}
