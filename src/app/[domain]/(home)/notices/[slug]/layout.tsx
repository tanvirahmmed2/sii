import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Notice Bulletin Details',
  description: `Read full announcement, publication details, and attached documents for ${SCHOOL_NAME}.`,
};

export default function NoticeDetailsLayout({ children }: any) {
  return <>{children}</>;
}
