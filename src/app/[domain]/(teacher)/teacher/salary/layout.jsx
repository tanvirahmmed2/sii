import { SCHOOL_NAME } from 'src/lib/database/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Teacher - Salary | ${shortName} Campus`,
  description: `Explore Teacher - Salary page at ${SCHOOL_NAME} (${shortName}).`,
};

export default function SalaryLayout({ children }) {
  return <>{children}</>;
}
