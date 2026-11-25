import { SITE_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: `Developer Notice Board | Developer Portal | ${SITE_NAME}`,
  description: `Internal team announcements, development updates, and operational bulletins on ${SITE_NAME}.`,
};

export default function DeveloperNoticeBoardLayout({ children }: any) {
  return <>{children}</>;
}
