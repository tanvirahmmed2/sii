import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: 'Teacher - Profile',
  description: `Explore Teacher - Profile page at ${SCHOOL_NAME}.`,
};

export default function ProfileLayout({ children }) {
  return <>{children}</>;
}
