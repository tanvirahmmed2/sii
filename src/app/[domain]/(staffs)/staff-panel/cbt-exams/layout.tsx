import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'CBT Exams & Assessments | Staff Panel',
  description: `Conduct Computer-Based Tests (CBT), online quizzes, and objective assessments at ${SCHOOL_NAME}.`,
};

export default function StaffCbtExamsLayout({ children }: any) {
  return <>{children}</>;
}
