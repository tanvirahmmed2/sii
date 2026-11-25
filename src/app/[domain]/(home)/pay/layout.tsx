import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Online Fee Payment Portal',
  description: `Make secure fee payments online for tuition, examinations, admission, and campus facilities at ${SCHOOL_NAME}.`,
};

export default function FeePayMasterLayout({ children }: any) {
  return <>{children}</>;
}
