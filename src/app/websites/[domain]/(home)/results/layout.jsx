import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Results | ${shortName} Campus`,
  description: `Check exam results, transcripts, mark sheets, and academic performance at ${SCHOOL_NAME} (${shortName}).`,
};

export default function ResultsLayout({ children }) {
  return <>{children}</>;
}
