import { SITE_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: `Officer ID Card Templates | Developer Portal | ${SITE_NAME}`,
  description: `Manage and design identity card templates for administrative officers and staff on ${SITE_NAME}.`,
};

export default function DeveloperOfficerIdCardTemplatesLayout({ children }: any) {
  return <>{children}</>;
}
