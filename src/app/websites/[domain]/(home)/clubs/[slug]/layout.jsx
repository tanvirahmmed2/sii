import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Clubs - Slug | ${shortName} Campus`,
  description: `Explore Clubs - Slug page at ${SCHOOL_NAME} (${shortName}).`,
};

export default function ClubsSlugLayout({ children }) {
  return <>{children}</>;
}
