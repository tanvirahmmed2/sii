import { SCHOOL_NAME } from 'src/lib/database/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Admin - Collaborations | ${shortName} Campus`,
  description: `Explore Admin - Collaborations page at ${SCHOOL_NAME} (${shortName}).`,
};

export default function CollaborationsLayout({ children }) {
  return <>{children}</>;
}
