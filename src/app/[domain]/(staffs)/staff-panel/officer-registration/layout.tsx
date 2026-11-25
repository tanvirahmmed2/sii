import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Register Campus Officer | Staff Panel',
  description: `Onboard new administrative officers, create accounts, and assign permissions at ${SCHOOL_NAME}.`,
};

export default function StaffOfficerRegistrationLayout({ children }: any) {
  return <>{children}</>;
}
