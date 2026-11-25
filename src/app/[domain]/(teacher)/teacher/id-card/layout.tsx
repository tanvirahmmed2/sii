import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Faculty ID Card | Teacher Portal',
  description: `View and download your official teacher identity card and credentials at ${SCHOOL_NAME}.`,
};

export default function TeacherIdCardLayout({ children }: any) {
  return <>{children}</>;
}
