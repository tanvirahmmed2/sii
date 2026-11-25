import { SITE_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: `Transfer Certificate Studio | Developer Portal | ${SITE_NAME}`,
  description: `Design and customize official student transfer certificates (TC) on ${SITE_NAME}.`,
};

export default function DeveloperTcStudioLayout({ children }: any) {
  return <>{children}</>;
}
