import { SITE_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: `Teacher ID Card Studio | Developer Portal | ${SITE_NAME}`,
  description: `Visual designer for faculty and educator identification cards on ${SITE_NAME}.`,
};

export default function DeveloperTeacherIdCardStudioLayout({ children }: any) {
  return <>{children}</>;
}
