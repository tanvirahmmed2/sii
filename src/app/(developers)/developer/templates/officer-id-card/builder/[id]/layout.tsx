import { SITE_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: `Officer ID Card Studio | Developer Portal | ${SITE_NAME}`,
  description: `Visual designer and canvas editor for administrative officer ID cards on ${SITE_NAME}.`,
};

export default function DeveloperOfficerIdCardStudioLayout({ children }: any) {
  return <>{children}</>;
}
