import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Events | ${shortName} Campus`,
  description: `Explore Events page at ${SCHOOL_NAME} (${shortName}).`,
};

export default function EventsLayout({ children }) {
  return <>{children}</>;
}
