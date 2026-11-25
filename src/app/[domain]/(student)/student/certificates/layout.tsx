import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'My Certificates & Diplomas | Student Portal',
  description: `View and download your academic completion certificates and achievements at ${SCHOOL_NAME}.`,
};

export default function StudentCertificatesLayout({ children }: any) {
  return <>{children}</>;
}
