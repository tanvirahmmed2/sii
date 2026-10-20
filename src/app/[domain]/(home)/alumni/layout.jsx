import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: 'Alumni',
  description: `Explore Alumni page at ${SCHOOL_NAME}.`,
};

export default function AlumniLayout({ children }) {
  return <>{children}</>;
}
