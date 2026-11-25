import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Examination Fee Payment',
  description: `Pay examination registration fees and get exam clearance for ${SCHOOL_NAME}.`,
};

export default function ExamFeesPayLayout({ children }: any) {
  return <>{children}</>;
}
