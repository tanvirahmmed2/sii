import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: 'Teacher - Attendance',
  description: `Explore Teacher - Attendance page at ${SCHOOL_NAME}.`,
};

export default function AttendanceLayout({ children }) {
  return <>{children}</>;
}
