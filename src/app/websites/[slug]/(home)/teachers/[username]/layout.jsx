import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Teachers - Id | ${shortName} Campus`,
  description: `Explore Teachers - Id page at ${SCHOOL_NAME} (${shortName}).`,
};

export default function TeachersIdLayout({ children }) {
  return <>{children}</>;
}
