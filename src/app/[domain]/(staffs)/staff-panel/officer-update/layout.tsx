import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Update Officer Profiles | Staff Panel',
  description: `Modify officer profile data, credentials, designations, and contact information at ${SCHOOL_NAME}.`,
};

export default function StaffOfficerUpdateLayout({ children }: any) {
  return <>{children}</>;
}
