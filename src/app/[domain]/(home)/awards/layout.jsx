import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: 'Institutional Awards & Honors',
  description: `Discover academic awards, certifications, national distinctions, and institutional accreditations achieved by ${SCHOOL_NAME}.`,
};

export default function AwardsLayout({ children }) {
  return <>{children}</>;
}
