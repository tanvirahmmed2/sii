import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata = {
  title: 'Results',
  description: `Check exam results, transcripts, mark sheets, and academic performance at ${SCHOOL_NAME}.`,
};

export default function ResultsLayout({ children }) {
  return <>{children}</>;
}
