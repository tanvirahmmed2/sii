import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: 'Teachers',
  description: `Find academic profiles and contact details of our faculty members at ${SCHOOL_NAME}.`,
};

export default function TeachersLayout({ children }) {
  return <>{children}</>;
}
