import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: 'Notices',
  description: `Explore Notices page at ${SCHOOL_NAME}.`,
};

export default function NoticesLayout({ children }) {
  return <>{children}</>;
}
