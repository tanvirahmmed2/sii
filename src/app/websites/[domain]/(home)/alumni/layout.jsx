import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Alumni | ${shortName} Campus`,
  description: `Explore Alumni page at ${SCHOOL_NAME} (${shortName}).`,
};

export default function AlumniLayout({ children }) {
  return <>{children}</>;
}
