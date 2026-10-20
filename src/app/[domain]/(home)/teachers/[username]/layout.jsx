import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: 'Teachers - Id',
  description: `Explore Teachers - Id page at ${SCHOOL_NAME}.`,
};

export default function TeachersIdLayout({ children }) {
  return <>{children}</>;
}
