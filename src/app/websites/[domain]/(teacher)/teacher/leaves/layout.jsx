import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Teacher - Leaves | ${shortName} Campus`,
  description: `Explore Teacher - Leaves page at ${SCHOOL_NAME} (${shortName}).`,
};

export default function LeavesLayout({ children }) {
  return <>{children}</>;
}
