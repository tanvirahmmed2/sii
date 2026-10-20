import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: 'Teacher - Salary',
  description: `Explore Teacher - Salary page at ${SCHOOL_NAME}.`,
};

export default function SalaryLayout({ children }) {
  return <>{children}</>;
}
