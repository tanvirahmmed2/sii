import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Teacher - Assignments | ${shortName} Campus`,
  description: `Explore Teacher - Assignments page at ${SCHOOL_NAME} (${shortName}).`,
};

export default function AssignmentsLayout({ children }) {
  return <>{children}</>;
}
