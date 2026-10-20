import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: 'Events',
  description: `Explore Events page at ${SCHOOL_NAME}.`,
};

export default function EventsLayout({ children }) {
  return <>{children}</>;
}
