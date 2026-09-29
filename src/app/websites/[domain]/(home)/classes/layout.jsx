import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Classes | ${shortName} Campus`,
  description: `View schedules, class information, routines, and syllabus details at ${SCHOOL_NAME} (${shortName}).`,
};

export default function ClassesLayout({ children }) {
  return <>{children}</>;
}
