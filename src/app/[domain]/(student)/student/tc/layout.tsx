import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Transfer Certificate (TC) | Student Portal',
  description: `View and download official student transfer certificate and clearance status at ${SCHOOL_NAME}.`,
};

export default function StudentTcLayout({ children }: any) {
  return <>{children}</>;
}
