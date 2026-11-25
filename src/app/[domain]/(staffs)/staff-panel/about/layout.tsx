import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Campus About & Governance | Staff Panel',
  description: `Manage institutional about content, leadership messages, and campus details for ${SCHOOL_NAME}.`,
};

export default function StaffAboutLayout({ children }: any) {
  return <>{children}</>;
}
