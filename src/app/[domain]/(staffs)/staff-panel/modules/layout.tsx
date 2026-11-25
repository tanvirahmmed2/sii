import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Staff Panel Modules & Features | Staff Panel',
  description: `Configure enabled campus operations modules, service toggles, and staff features at ${SCHOOL_NAME}.`,
};

export default function StaffModulesLayout({ children }: any) {
  return <>{children}</>;
}
