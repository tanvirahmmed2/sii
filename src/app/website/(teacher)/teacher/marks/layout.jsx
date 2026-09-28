import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Teacher - Marks | ${shortName} Campus`,
  description: `Explore Teacher - Marks page at ${SCHOOL_NAME} (${shortName}).`,
};

export default function MarksLayout({ children }) {
  return <>{children}</>;
}
