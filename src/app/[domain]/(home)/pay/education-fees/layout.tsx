import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Tuition & Academic Fee Payment',
  description: `Pay monthly tuition fees, semester dues, and academic charges online for ${SCHOOL_NAME}.`,
};

export default function EducationFeesPayLayout({ children }: any) {
  return <>{children}</>;
}
