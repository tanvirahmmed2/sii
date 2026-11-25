import { SITE_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: `Student ID Card Studio | Developer Portal | ${SITE_NAME}`,
  description: `Visual drag-and-drop designer for student identification cards and barcodes on ${SITE_NAME}.`,
};

export default function DeveloperStudentIdCardStudioLayout({ children }: any) {
  return <>{children}</>;
}
