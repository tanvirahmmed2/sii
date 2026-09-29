import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Recognitions | ${shortName} Campus`,
  description: `Explore Recognitions page at ${SCHOOL_NAME} (${shortName}).`,
};

export default function RecognitionsLayout({ children }) {
  return <>{children}</>;
}
