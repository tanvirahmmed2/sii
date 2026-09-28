import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Teacher - Materials | ${shortName} Campus`,
  description: `Explore Teacher - Materials page at ${SCHOOL_NAME} (${shortName}).`,
};

export default function MaterialsLayout({ children }) {
  return <>{children}</>;
}
