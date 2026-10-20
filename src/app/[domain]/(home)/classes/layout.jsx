import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: 'Classes',
  description: `View schedules, class information, routines, and syllabus details at ${SCHOOL_NAME}.`,
};

export default function ClassesLayout({ children }) {
  return <>{children}</>;
}
