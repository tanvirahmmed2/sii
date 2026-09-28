import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Teacher - Lessons | ${shortName} Campus`,
  description: `Explore Teacher - Lessons page at ${SCHOOL_NAME} (${shortName}).`,
};

export default function LessonsLayout({ children }) {
  return <>{children}</>;
}
