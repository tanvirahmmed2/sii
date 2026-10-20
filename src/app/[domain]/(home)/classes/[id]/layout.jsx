import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: 'Classes - Id',
  description: `Explore Classes - Id page at ${SCHOOL_NAME}.`,
};

export default function ClassesIdLayout({ children }) {
  return <>{children}</>;
}
