import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: 'Teacher - Marks',
  description: `Explore Teacher - Marks page at ${SCHOOL_NAME}.`,
};

export default function MarksLayout({ children }) {
  return <>{children}</>;
}
