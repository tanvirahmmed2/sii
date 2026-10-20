import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: 'Clubs',
  description: `Discover club activities, student organizations, and extra-curricular clubs at ${SCHOOL_NAME}.`,
};

export default function ClubsLayout({ children }) {
  return <>{children}</>;
}
