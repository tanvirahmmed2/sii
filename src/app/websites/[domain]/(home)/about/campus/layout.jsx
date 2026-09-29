import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `About - Campus | ${shortName} Campus`,
  description: `Learn about the history, vision, mission, campus, and milestones of ${SCHOOL_NAME} (${shortName}).`,
};

export default function AboutCampusLayout({ children }) {
  return <>{children}</>;
}
