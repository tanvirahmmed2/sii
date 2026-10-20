import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: 'Clubs - Slug',
  description: `Explore Clubs - Slug page at ${SCHOOL_NAME}.`,
};

export default function ClubsSlugLayout({ children }) {
  return <>{children}</>;
}
