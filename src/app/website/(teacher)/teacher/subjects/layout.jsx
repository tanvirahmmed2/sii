import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Teacher - Subjects | ${shortName} Campus`,
  description: `Explore Teacher - Subjects page at ${SCHOOL_NAME} (${shortName}).`,
};

export default function SubjectsLayout({ children }) {
  return <>{children}</>;
}
