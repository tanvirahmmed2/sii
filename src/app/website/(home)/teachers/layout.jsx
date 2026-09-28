import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Teachers | ${shortName} Campus`,
  description: `Find academic profiles and contact details of our faculty members at ${SCHOOL_NAME} (${shortName}).`,
};

export default function TeachersLayout({ children }) {
  return <>{children}</>;
}
