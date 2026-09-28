import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Teacher - Profile | ${shortName} Campus`,
  description: `Explore Teacher - Profile page at ${SCHOOL_NAME} (${shortName}).`,
};

export default function ProfileLayout({ children }) {
  return <>{children}</>;
}
