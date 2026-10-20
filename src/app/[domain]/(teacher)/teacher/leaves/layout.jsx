import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: 'Teacher - Leaves',
  description: `Explore Teacher - Leaves page at ${SCHOOL_NAME}.`,
};

export default function LeavesLayout({ children }) {
  return <>{children}</>;
}
