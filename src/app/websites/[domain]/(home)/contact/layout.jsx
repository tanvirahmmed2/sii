import { SCHOOL_NAME } from '@/lib/secret';

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: `Contact | ${shortName} Campus`,
  description: `Get in touch with ${SCHOOL_NAME} (${shortName}) for support, inquiries, and admissions.`,
};

export default function ContactLayout({ children }) {
  return <>{children}</>;
}
