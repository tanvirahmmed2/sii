import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Achievements | ${shortName} Campus`,
  description: `Explore Achievements page at ${SCHOOL_NAME} (${shortName}).`,
};

export default function AchievementsLayout({ children }) {
  return <>{children}</>;
}
