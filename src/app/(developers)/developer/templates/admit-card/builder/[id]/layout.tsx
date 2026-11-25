import { SITE_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: `Admit Card Template Studio | Developer Portal | ${SITE_NAME}`,
  description: `Visual layout designer and builder for dynamic student examination admit cards on ${SITE_NAME}.`,
};

export default function DeveloperAdmitCardStudioLayout({ children }: any) {
  return <>{children}</>;
}
