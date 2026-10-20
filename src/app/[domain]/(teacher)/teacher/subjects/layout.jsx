import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: 'Teacher - Subjects',
  description: `Explore Teacher - Subjects page at ${SCHOOL_NAME}.`,
};

export default function SubjectsLayout({ children }) {
  return <>{children}</>;
}
