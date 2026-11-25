import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Admit Card Templates | Staff Panel',
  description: `Configure student examination admit card layouts and print configurations at ${SCHOOL_NAME}.`,
};

export default function StaffAdmitCardTempletsLayout({ children }: any) {
  return <>{children}</>;
}
