import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Campus Milestones & History | Staff Panel',
  description: `Record historical achievements, legacy timelines, and institutional milestones for ${SCHOOL_NAME}.`,
};

export default function StaffHistoriesLayout({ children }: any) {
  return <>{children}</>;
}
