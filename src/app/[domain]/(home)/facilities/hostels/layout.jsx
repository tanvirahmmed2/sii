import { SCHOOL_NAME } from 'src/lib/database/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Facilities - Hostels | ${shortName} Campus`,
  description: `Explore classrooms, lab facilities, and hostel accommodations at ${SCHOOL_NAME} (${shortName}).`,
};

export default function FacilitiesHostelsLayout({ children }) {
  return <>{children}</>;
}
