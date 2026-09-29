import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Administration | ${shortName} Campus`,
  description: `Explore Administration page at ${SCHOOL_NAME} (${shortName}).`,
};

export default function AdministrationLayout({ children }) {
  return <>{children}</>;
}
