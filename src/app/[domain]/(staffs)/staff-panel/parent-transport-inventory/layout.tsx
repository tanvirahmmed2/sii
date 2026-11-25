import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Parent Transport & Vehicle Inventory | Staff Panel',
  description: `Manage campus transportation routes, vehicle fleets, and parent transport services at ${SCHOOL_NAME}.`,
};

export default function StaffParentTransportInventoryLayout({ children }: any) {
  return <>{children}</>;
}
