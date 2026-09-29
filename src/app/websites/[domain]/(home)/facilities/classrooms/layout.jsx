import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Facilities - Classrooms | ${shortName} Campus`,
  description: `Explore classrooms, lab facilities, and hostel accommodations at ${SCHOOL_NAME} (${shortName}).`,
};

export default function FacilitiesClassroomsLayout({ children }) {
  return <>{children}</>;
}
