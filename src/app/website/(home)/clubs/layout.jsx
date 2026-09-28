import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Clubs | ${shortName} Campus`,
  description: `Discover club activities, student organizations, and extra-curricular clubs at ${SCHOOL_NAME} (${shortName}).`,
};

export default function ClubsLayout({ children }) {
  return <>{children}</>;
}
