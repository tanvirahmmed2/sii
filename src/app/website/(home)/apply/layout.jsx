import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Apply | ${shortName} Campus`,
  description: `Explore Apply page at ${SCHOOL_NAME} (${shortName}).`,
};

export default function ApplyLayout({ children }) {
  return <>{children}</>;
}
