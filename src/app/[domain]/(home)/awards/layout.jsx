import { SCHOOL_NAME } from 'src/lib/database/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Institutional Awards & Honors | ${shortName} Campus`,
  description: `Discover academic awards, certifications, national distinctions, and institutional accreditations achieved by ${SCHOOL_NAME}.`,
};

export default function AwardsLayout({ children }) {
  return <>{children}</>;
}
