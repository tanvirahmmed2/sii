import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `News | ${shortName} Campus`,
  description: `Explore News page at ${SCHOOL_NAME} (${shortName}).`,
};

export default function NewsLayout({ children }) {
  return <>{children}</>;
}
