import { SITE_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: `Developer Roles & RBAC | Developer Portal | ${SITE_NAME}`,
  description: `Manage administrative roles, configure granular module permissions, and RBAC policies on ${SITE_NAME}.`,
};

export default function DeveloperRolesLayout({ children }: any) {
  return <>{children}</>;
}
