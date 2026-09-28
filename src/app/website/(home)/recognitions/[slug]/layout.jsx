import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Recognitions - Slug | ${shortName} Campus`,
  description: `Explore Recognitions - Slug page at ${SCHOOL_NAME} (${shortName}).`,
};

export default function RecognitionsSlugLayout({ children }) {
  return <>{children}</>;
}
