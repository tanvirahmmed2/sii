import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Admission Admit Card Templates | Staff Panel',
  description: `Design and configure entrance examination admit card templates at ${SCHOOL_NAME}.`,
};

export default function StaffAdmissionAdmitCardTemplatesLayout({ children }: any) {
  return <>{children}</>;
}
