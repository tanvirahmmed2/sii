import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Officer ID Card Templates | Staff Panel',
  description: `Configure identity card print designs for campus administration officers at ${SCHOOL_NAME}.`,
};

export default function StaffOfficerIdCardTemplatesLayout({ children }: any) {
  return <>{children}</>;
}
