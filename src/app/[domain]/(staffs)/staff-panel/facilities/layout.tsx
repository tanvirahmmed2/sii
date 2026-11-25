import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Campus Facilities & Infrastructure | Staff Panel',
  description: `Manage campus infrastructure, labs, libraries, hostels, and physical amenities at ${SCHOOL_NAME}.`,
};

export default function StaffFacilitiesLayout({ children }: any) {
  return <>{children}</>;
}
