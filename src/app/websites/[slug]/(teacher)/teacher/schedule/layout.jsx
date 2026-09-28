import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Teacher - Schedule | ${shortName} Campus`,
  description: `Explore Teacher - Schedule page at ${SCHOOL_NAME} (${shortName}).`,
};

export default function ScheduleLayout({ children }) {
  return <>{children}</>;
}
