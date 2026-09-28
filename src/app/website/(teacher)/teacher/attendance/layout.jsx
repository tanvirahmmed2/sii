import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Teacher - Attendance | ${shortName} Campus`,
  description: `Explore Teacher - Attendance page at ${SCHOOL_NAME} (${shortName}).`,
};

export default function AttendanceLayout({ children }) {
  return <>{children}</>;
}
