import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: 'Teacher - Schedule',
  description: `Explore Teacher - Schedule page at ${SCHOOL_NAME}.`,
};

export default function ScheduleLayout({ children }) {
  return <>{children}</>;
}
