import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Notices | ${shortName} Campus`,
  description: `Explore Notices page at ${SCHOOL_NAME} (${shortName}).`,
};

export default function NoticesLayout({ children }) {
  return <>{children}</>;
}
