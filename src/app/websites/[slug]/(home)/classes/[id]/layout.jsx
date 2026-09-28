import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Classes - Id | ${shortName} Campus`,
  description: `Explore Classes - Id page at ${SCHOOL_NAME} (${shortName}).`,
};

export default function ClassesIdLayout({ children }) {
  return <>{children}</>;
}
