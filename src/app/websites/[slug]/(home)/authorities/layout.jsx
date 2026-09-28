import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Authorities | ${shortName} Campus`,
  description: `Meet our leadership, board members, academic chairs, and administrative staff at ${SCHOOL_NAME} (${shortName}).`,
};

export default function AuthoritiesLayout({ children }) {
  return <>{children}</>;
}
