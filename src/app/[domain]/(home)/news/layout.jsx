import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: 'News',
  description: `Explore News page at ${SCHOOL_NAME}.`,
};

export default function NewsLayout({ children }) {
  return <>{children}</>;
}
