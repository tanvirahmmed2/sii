import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: 'Academic Examination Results',
  description: `Official published academic transcripts, marks, and GPA evaluations at ${SCHOOL_NAME}.`,
};

export default function AcademicResultsLayout({ children }) {
  return <>{children}</>;
}
