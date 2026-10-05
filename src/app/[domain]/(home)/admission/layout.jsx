import { SCHOOL_NAME } from 'src/lib/database/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Admission | ${shortName} Campus`,
  description: `Admission guidelines, requirements, fees, and procedures for enrolling at ${SCHOOL_NAME} (${shortName}).`,
};

export default function AdmissionLayout({ children }) {
  return <>{children}</>;
}
