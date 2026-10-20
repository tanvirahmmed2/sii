import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: 'About - Mission',
  description: `Learn about the history, vision, mission, campus, and milestones of ${SCHOOL_NAME}.`,
};

export default function AboutMissionVissionLayout({ children }) {
  return <>{children}</>;
}
